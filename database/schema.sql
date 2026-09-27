-- =========================================================
-- PRICE TRACKER DATABASE
-- =========================================================

-- ---------------------------------------------------------
-- 1. Tracked products
-- ---------------------------------------------------------

CREATE TABLE IF NOT EXISTS tracked_products (
    id BIGSERIAL PRIMARY KEY,

    store_product_id TEXT NOT NULL,

    product_name TEXT NOT NULL,

    product_url TEXT NOT NULL,

    selected_option TEXT NOT NULL,

    active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ---------------------------------------------------------
-- 2. Price history
-- ---------------------------------------------------------

CREATE TABLE IF NOT EXISTS price_history (
    id BIGSERIAL PRIMARY KEY,

    tracked_product_id BIGINT NOT NULL
        REFERENCES tracked_products(id)
        ON DELETE CASCADE,

    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    price NUMERIC(12, 2) NOT NULL,

    stock INTEGER NOT NULL
);


-- ---------------------------------------------------------
-- 3. Scrape logs
-- ---------------------------------------------------------

CREATE TABLE IF NOT EXISTS scrape_logs (
    id BIGSERIAL PRIMARY KEY,

    tracked_product_id BIGINT NOT NULL
        REFERENCES tracked_products(id)
        ON DELETE CASCADE,

    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    attempt INTEGER NOT NULL,

    outcome TEXT NOT NULL
        CHECK (outcome IN ('success', 'retried', 'failed')),

    error_message TEXT,

    duration_ms INTEGER
);


-- ---------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_price_history_product
ON price_history(tracked_product_id, timestamp DESC);


CREATE INDEX IF NOT EXISTS idx_scrape_logs_product
ON scrape_logs(tracked_product_id, timestamp DESC);


CREATE INDEX IF NOT EXISTS idx_tracked_products_active
ON tracked_products(active);