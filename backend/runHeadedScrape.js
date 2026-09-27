require("dotenv").config();

const { createBrowser } = require("./scraper/browser");
const { scrapeProduct } = require("./scraper/scrapeProduct");


// ---------------------------------------------------------
// Product used for the headed demonstration
// ---------------------------------------------------------

const demoProduct = {
    store_product_id: "2649",

    product_name: "Tamarack Tablet Duo",

    product_url:
        "https://demo.inelabteamdev.com/item/2649",

    selected_option: "64 GB"
};


// ---------------------------------------------------------
// Main
// ---------------------------------------------------------

async function runHeadedScrape() {

    console.log("\n========================================");
    console.log("       HEADED SCRAPER DEMO");
    console.log("========================================\n");

    console.log(`Product: ${demoProduct.product_name}`);
    console.log(`Option:  ${demoProduct.selected_option}`);
    console.log(`URL:     ${demoProduct.product_url}`);

    // Force headed mode for this script.
    process.env.HEADLESS = "false";

    let browser;

    try {

        // -------------------------------------------------
        // Launch visible Chromium
        // -------------------------------------------------

        browser = await createBrowser();

        const context = await browser.newContext({
            viewport: {
                width: 1440,
                height: 900
            }
        });

        const page = await context.newPage();


        // -------------------------------------------------
        // Show browser console messages
        // -------------------------------------------------

        page.on("console", message => {
            console.log(
                `[Browser ${message.type()}] ${message.text()}`
            );
        });


        // -------------------------------------------------
        // Show failed network requests
        // -------------------------------------------------

        page.on("requestfailed", request => {

            console.log(
                "\n[Network failure]"
            );

            console.log(
                request.method(),
                request.url()
            );

            console.log(
                request.failure()?.errorText || "Unknown error"
            );
        });


        // -------------------------------------------------
        // Run actual scraper
        // -------------------------------------------------

        console.log("\nStarting scraper...\n");

        const startTime = Date.now();

        const result = await scrapeProduct(
            page,
            demoProduct
        );

        const duration = Date.now() - startTime;


        // -------------------------------------------------
        // Display result
        // -------------------------------------------------

        console.log("\n========================================");
        console.log("          SCRAPE SUCCESSFUL");
        console.log("========================================");

        console.log(
            `Product: ${result.productName}`
        );

        console.log(
            `Option:  ${result.selectedOption}`
        );

        console.log(
            `Price:   ₹${result.price.toLocaleString("en-IN")}`
        );

        console.log(
            `Stock:   ${result.stock}`
        );

        console.log(
            `Time:    ${duration}ms`
        );

        console.log("========================================\n");


        // -------------------------------------------------
        // Keep browser open for the demo
        // -------------------------------------------------

        console.log(
            "Browser will remain open for 10 seconds..."
        );

        await new Promise(resolve =>
            setTimeout(resolve, 10000)
        );

        await context.close();

    } catch (error) {

        console.error("\n========================================");
        console.error("          SCRAPE FAILED");
        console.error("========================================");

        console.error(error.message);

        console.error("========================================\n");

        process.exitCode = 1;

    } finally {

        if (browser) {
            await browser.close();
        }
    }
}


// ---------------------------------------------------------
// Run script
// ---------------------------------------------------------

runHeadedScrape();