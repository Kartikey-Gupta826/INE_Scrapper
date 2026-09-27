const express = require("express");

const {
    getActiveTrackedProducts,
    getTrackedProductById,
    createTrackedProduct
} = require("../db");

const router = express.Router();


// =====================================================
// GET /api/products
// Get all active tracked products
// =====================================================

router.get("/", async (req, res) => {

    try {

        const products =
            await getActiveTrackedProducts();

        return res.json({
            success: true,
            products
        });

    } catch (error) {

        console.error(
            "Failed to get tracked products:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Failed to get tracked products"
        });
    }
});


// =====================================================
// GET /api/products/:id
// Get one tracked product
// =====================================================

router.get("/:id", async (req, res) => {

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

        return res.json({
            success: true,
            product
        });

    } catch (error) {

        console.error(
            "Failed to get product:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Failed to get product"
        });
    }
});


// =====================================================
// POST /api/products
// Track a product
// =====================================================

router.post("/", async (req, res) => {

    const {
        storeProductId,
        productName,
        productUrl,
        selectedOption
    } = req.body;


    // ---------------------------------------------
    // Validate request
    // ---------------------------------------------

    if (
        !storeProductId ||
        !productName ||
        !productUrl ||
        !selectedOption
    ) {

        return res.status(400).json({
            success: false,
            message:
                "storeProductId, productName, productUrl and selectedOption are required"
        });
    }


    try {

        const product =
            await createTrackedProduct({
                storeProductId,
                productName,
                productUrl,
                selectedOption
            });

        return res.status(201).json({
            success: true,
            product
        });

    } catch (error) {

        console.error(
            "Failed to track product:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Failed to track product"
        });
    }
});


module.exports = router;