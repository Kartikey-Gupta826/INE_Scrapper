const { Pool } = require("pg");

const pool = new Pool({
    connectionString: process.env.SUPABASE_DB_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

pool.on("error", (error) => {
    console.error("Unexpected database error:", error);
});

async function query(text, params = []) {
    const result = await pool.query(text, params);
    return result;
}


// ---------------------------------------------------------
// Tracked products
// ---------------------------------------------------------

async function getActiveTrackedProducts() {
    const result = await query(`
        SELECT tracked_products.*,
            latest.price AS current_price,
            latest.stock AS current_stock,
            latest.timestamp AS last_scraped_at
        FROM tracked_products
        LEFT JOIN LATERAL (
            SELECT price, stock, timestamp
            FROM price_history
            WHERE tracked_product_id = tracked_products.id
            ORDER BY timestamp DESC
            LIMIT 1
        ) AS latest ON TRUE
        WHERE tracked_products.active = TRUE
        ORDER BY tracked_products.created_at ASC
    `);

    return result.rows;
}


async function getTrackedProductById(id) {
    const result = await query(
        `
        SELECT *
        FROM tracked_products
        WHERE id = $1
        `,
        [id]
    );

    return result.rows[0];
}


async function createTrackedProduct({
    storeProductId,
    productName,
    productUrl,
    selectedOption
}) {
    const result = await query(
        `
        INSERT INTO tracked_products (
            store_product_id,
            product_name,
            product_url,
            selected_option
        )
        VALUES ($1, $2, $3, $4)
        RETURNING *
        `,
        [
            storeProductId,
            productName,
            productUrl,
            selectedOption
        ]
    );

    return result.rows[0];
}


async function updateTrackedProductOption(id, selectedOption) {
    await query(
        `
        UPDATE tracked_products
        SET selected_option = $2
        WHERE id = $1
        `,
        [id, selectedOption]
    );
}


// ---------------------------------------------------------
// Price history
// ---------------------------------------------------------

async function savePriceHistory({
    trackedProductId,
    price,
    stock
}) {
    const result = await query(
        `
        INSERT INTO price_history (
            tracked_product_id,
            price,
            stock
        )
        VALUES ($1, $2, $3)
        RETURNING *
        `,
        [
            trackedProductId,
            price,
            stock
        ]
    );

    return result.rows[0];
}


async function getPriceHistory(trackedProductId) {
    const result = await query(
        `
        SELECT *
        FROM price_history
        WHERE tracked_product_id = $1
        ORDER BY timestamp ASC
        `,
        [trackedProductId]
    );

    return result.rows;
}


// ---------------------------------------------------------
// Scrape logs
// ---------------------------------------------------------

async function createScrapeLog({
    trackedProductId,
    attempt,
    outcome,
    errorMessage = null,
    durationMs = null
}) {
    const result = await query(
        `
        INSERT INTO scrape_logs (
            tracked_product_id,
            attempt,
            outcome,
            error_message,
            duration_ms
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
        `,
        [
            trackedProductId,
            attempt,
            outcome,
            errorMessage,
            durationMs
        ]
    );

    return result.rows[0];
}


async function getScrapeLogs(trackedProductId) {
    const result = await query(
        `
        SELECT *
        FROM scrape_logs
        WHERE tracked_product_id = $1
        ORDER BY timestamp DESC
        `,
        [trackedProductId]
    );

    return result.rows;
}


module.exports = {
    query,

    getActiveTrackedProducts,
    getTrackedProductById,
    createTrackedProduct,
    updateTrackedProductOption,

    savePriceHistory,
    getPriceHistory,

    createScrapeLog,
    getScrapeLogs
};