const express = require("express");

const {
    getTrackedProductById,
    getPriceHistory
} = require("../db");

const router = express.Router();


// GET /api/products/:id/history
router.get("/:id/history", async (req, res) => {

    const id = Number(req.params.id);

    if (!Number.isInteger(id)) {

        return res.status(400).json({
            success: false,
            message: "Invalid product ID"
        });
    }

    try {

        // ---------------------------------------------
        // Check product exists
        // ---------------------------------------------

        const product =
            await getTrackedProductById(id);

        if (!product) {

            return res.status(404).json({
                success: false,
                message: "Tracked product not found"
            });
        }


        // ---------------------------------------------
        // Get history
        // ---------------------------------------------

        const history =
            await getPriceHistory(id);


        return res.json({
            success: true,
            product,
            history
        });

    } catch (error) {

        console.error(
            "Failed to get price history:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Failed to get price history"
        });
    }
});


module.exports = router;