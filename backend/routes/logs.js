const express = require("express");

const {
    getTrackedProductById,
    getScrapeLogs
} = require("../db");

const router = express.Router();


// GET /api/products/:id/logs
router.get("/:id/logs", async (req, res) => {

    const id = Number(req.params.id);

    if (!Number.isInteger(id)) {

        return res.status(400).json({
            success: false,
            message: "Invalid product ID"
        });
    }

    try {

        const product =
            await getTrackedProductById(id);

        if (!product) {

            return res.status(404).json({
                success: false,
                message: "Tracked product not found"
            });
        }


        const logs =
            await getScrapeLogs(id);


        return res.json({
            success: true,
            product,
            logs
        });

    } catch (error) {

        console.error(
            "Failed to get scrape logs:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Failed to get scrape logs"
        });
    }
});


module.exports = router;