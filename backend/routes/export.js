const express = require("express");

const { query } = require("../db");

const router = express.Router();


// GET /api/export
router.get("/", async (req, res) => {

    try {

        const result = await query(`
            SELECT
                tp.store_product_id,
                tp.product_name,
                tp.selected_option,
                sl.timestamp,
                ph.price,
                ph.stock,
                sl.outcome
            FROM scrape_logs sl
            JOIN tracked_products tp
                ON tp.id = sl.tracked_product_id
            LEFT JOIN price_history ph
                ON ph.tracked_product_id = sl.tracked_product_id
                AND ph.timestamp = sl.timestamp
            ORDER BY sl.timestamp ASC
        `);


        // ---------------------------------------------
        // CSV header
        // ---------------------------------------------

        const headers = [
            "product_id",
            "product_name",
            "selected_option",
            "timestamp",
            "price",
            "stock",
            "outcome"
        ];


        // ---------------------------------------------
        // Escape CSV values
        // ---------------------------------------------

        function escapeCSV(value) {

            if (
                value === null ||
                value === undefined
            ) {
                return "";
            }

            const stringValue =
                String(value);

            if (
                stringValue.includes(",") ||
                stringValue.includes('"') ||
                stringValue.includes("\n")
            ) {

                return `"${stringValue.replace(
                    /"/g,
                    '""'
                )}"`;
            }

            return stringValue;
        }


        // ---------------------------------------------
        // Create CSV rows
        // ---------------------------------------------

        const rows = result.rows.map(row => {

            return [
                row.store_product_id,
                row.product_name,
                row.selected_option,
                row.timestamp
                    ? new Date(row.timestamp).toISOString()
                    : "",
                row.price,
                row.stock,
                row.outcome
            ]
                .map(escapeCSV)
                .join(",");
        });


        const csv = [
            headers.join(","),
            ...rows
        ].join("\n");


        // ---------------------------------------------
        // Send file
        // ---------------------------------------------

        res.setHeader(
            "Content-Type",
            "text/csv"
        );

        res.setHeader(
            "Content-Disposition",
            'attachment; filename="price-history.csv"'
        );


        return res.send(csv);

    } catch (error) {

        console.error(
            "Export failed:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Failed to export scrape history"
        });
    }
});


module.exports = router;