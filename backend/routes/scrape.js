const express = require("express");

const { runScrapeJob } = require("../runScrapeJob");

const router = express.Router();


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

        const successful =
            results.filter(
                result => result.success
            ).length;

        const failed =
            results.length - successful;


        return res.json({
            success: true,
            total: results.length,
            successful,
            failed,
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