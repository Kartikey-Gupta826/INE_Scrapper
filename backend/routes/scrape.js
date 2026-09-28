const express = require("express");

const { runScrapeJob } = require("../runScrapeJob");
const { createBrowser } = require("../scraper/browser");
const { scrapeCatalog } = require("../scraper/catalog");
const { scrapeProduct } = require("../scraper/scrapeProduct");
const { withRetry } = require("../scraper/retry");

const router = express.Router();


router.post("/catalog", async (req, res) => {
    try {
        const products = await scrapeCatalog();

        return res.json({
            success: true,
            count: products.length,
            products
        });
    } catch (error) {
        console.error("Catalog scrape error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to scrape the product catalog"
        });
    }
});


router.post("/product", async (req, res) => {
    const { storeProductId, productName } = req.body;

    if (!/^\d+$/.test(String(storeProductId || "")) || !productName) {
        return res.status(400).json({
            success: false,
            message: "A valid store product ID and name are required"
        });
    }

    let browser;

    try {
        browser = await createBrowser();
        const product = {
            store_product_id: String(storeProductId),
            product_name: productName,
            product_url: `${process.env.STORE_BASE_URL || "https://demo.inelabteamdev.com"}/item/${storeProductId}`,
            selected_option: "Default"
        };
        const attempt = await withRetry(async () => {
            const page = await browser.newPage();

            try {
                return await scrapeProduct(page, product);
            } finally {
                await page.close();
            }
        }, {
            retries: Number(process.env.SCRAPE_RETRIES) || 3,
            baseDelay: 1000
        });

        if (!attempt.success) {
            return res.status(502).json({
                success: false,
                message: attempt.error?.message || "Failed to load current price"
            });
        }

        return res.json({
            success: true,
            attempts: attempt.attempts,
            product: attempt.result
        });
    } catch (error) {
        console.error("Product price scrape error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to scrape current product price"
        });
    } finally {
        if (browser) {
            await browser.close();
        }
    }
});


// POST /api/scrape/trigger
router.post("/trigger", async (req, res) => {

    try {

        console.log(
            "External scrape trigger received"
        );


        // ---------------------------------------------
        // Run scrape job
        // ---------------------------------------------

        const results =
            await runScrapeJob();


        // ---------------------------------------------
        // Return summary
        // ---------------------------------------------

        return res.json({
            success: true,
            ...results,
            results
        });

    } catch (error) {

        console.error(
            "Scheduled scrape failed:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Scrape job failed"
        });
    }
});


module.exports = router;