const express = require("express");
const { createBrowser } = require("../scraper/browser");
const { searchStore } = require("../scraper/searchStore");

const router = express.Router();


// GET /api/search?q=tamarack
router.get("/", async (req, res) => {

    const query = req.query.q?.trim();

    // ---------------------------------------------
    // Validate query
    // ---------------------------------------------

    if (!query) {
        return res.status(400).json({
            success: false,
            message: "Search query is required"
        });
    }


    let browser;

    try {

        // ---------------------------------------------
        // Launch Playwright
        // ---------------------------------------------

        browser = await createBrowser();

        const context = await browser.newContext();

        const page = await context.newPage();


        // ---------------------------------------------
        // Search store
        // ---------------------------------------------

        const products = await searchStore(
            page,
            query
        );


        // ---------------------------------------------
        // Return results
        // ---------------------------------------------

        return res.json({
            success: true,
            query,
            count: products.length,
            products
        });

    } catch (error) {

        console.error(
            "Search error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Failed to search store"
        });

    } finally {

        // ---------------------------------------------
        // Always close browser
        // ---------------------------------------------

        if (browser) {
            await browser.close();
        }
    }
});


module.exports = router;