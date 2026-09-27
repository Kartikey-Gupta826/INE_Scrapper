require("dotenv").config();

const {
    getActiveTrackedProducts,
    savePriceHistory,
    createScrapeLog
} = require("./db");

const { createBrowser } = require("./scraper/browser");
const { scrapeProduct } = require("./scraper/scrapeProduct");
const { withRetry } = require("./scraper/retry");


// ---------------------------------------------------------
// Scrape one tracked product
// ---------------------------------------------------------

async function scrapeTrackedProduct(browser, product) {
    console.log("\n------------------------------------");
    console.log(`Product: ${product.product_name}`);
    console.log(`Option: ${product.selected_option}`);
    console.log("------------------------------------");

    const result = await withRetry(

        // Each retry gets a fresh browser page.
        async (attempt) => {
            const page = await browser.newPage();

            try {
                console.log(`Starting attempt ${attempt}`);

                return await scrapeProduct(page, product);

            } finally {
                await page.close();
            }
        },

        {
            retries: Number(process.env.SCRAPE_RETRIES) || 3,
            baseDelay: 1000,

            // Called after every scraping attempt.
            onAttempt: async ({
                attempt,
                outcome,
                durationMs,
                errorMessage,
                result
            }) => {

                // Record the attempt.
                await createScrapeLog({
                    trackedProductId: product.id,
                    attempt,
                    outcome,
                    errorMessage,
                    durationMs
                });

                // Save history only for successful scrapes.
                if (outcome === "success") {
                    await savePriceHistory({
                        trackedProductId: product.id,
                        price: result.price,
                        stock: result.stock
                    });

                    console.log(
                        `Saved price: ₹${result.price}`
                    );

                    console.log(
                        `Saved stock: ${result.stock}`
                    );
                }
            }
        }
    );

    if (result.success) {
        console.log(
            `SUCCESS: ${product.product_name} ` +
            `after ${result.attempts} attempt(s)`
        );
    } else {
        console.error(
            `FAILED: ${product.product_name} ` +
            `after ${result.attempts} attempts`
        );
    }

    return result;
}


// ---------------------------------------------------------
// Main scraping job
// ---------------------------------------------------------

async function runScrapeJob() {
    let browser;

    const startTime = Date.now();

    const summary = {
        total: 0,
        successful: 0,
        failed: 0
    };

    try {
        console.log("\n====================================");
        console.log("PRICE TRACKER SCRAPE JOB STARTED");
        console.log(new Date().toISOString());
        console.log("====================================");

        // 1. Get all active products.
        const products = await getActiveTrackedProducts();

        summary.total = products.length;

        console.log(
            `Found ${products.length} active tracked products`
        );

        if (products.length === 0) {
            console.log("No products to scrape.");
            return summary;
        }

        // 2. Launch browser.
        browser = await createBrowser();

        // 3. Scrape products sequentially.
        for (const product of products) {

            try {
                const result = await scrapeTrackedProduct(
                    browser,
                    product
                );

                if (result.success) {
                    summary.successful++;
                } else {
                    summary.failed++;
                }

            } catch (error) {
                summary.failed++;

                console.error(
                    `Unexpected error for product ${product.id}:`,
                    error
                );
            }
        }

        return summary;

    } finally {

        // 4. Always close browser.
        if (browser) {
            await browser.close();
        }

        const duration = Date.now() - startTime;

        console.log("\n====================================");
        console.log("SCRAPE JOB FINISHED");
        console.log("====================================");

        console.log(`Total: ${summary.total}`);
        console.log(`Successful: ${summary.successful}`);
        console.log(`Failed: ${summary.failed}`);
        console.log(`Duration: ${duration}ms`);

        console.log("====================================\n");
    }
}


// ---------------------------------------------------------
// Run directly from terminal
// ---------------------------------------------------------

if (require.main === module) {

    runScrapeJob()
        .then((summary) => {
            if (summary.failed > 0) {
                process.exitCode = 1;
            }
        })
        .catch((error) => {
            console.error("Scrape job failed:", error);
            process.exitCode = 1;
        });
}


module.exports = {
    runScrapeJob,
    scrapeTrackedProduct
};