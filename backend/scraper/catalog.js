const { request } = require("playwright");

const STORE_BASE_URL =
    process.env.STORE_BASE_URL || "https://demo.inelabteamdev.com";

const SCRAPE_TIMEOUT =
    Number(process.env.SCRAPE_TIMEOUT) || 30000;

async function scrapeCatalog() {
    const api = await request.newContext();
    const products = new Map();
    let totalPages = 1;
    let totalCount = 0;
    const pageLimit = 60;

    try {
        for (let pageNumber = 1; pageNumber <= totalPages; pageNumber++) {
            let data;
            let lastError;

            for (let attempt = 1; attempt <= 6; attempt++) {
                try {
                    const url = new URL("/api/v2/listings", STORE_BASE_URL);
                    url.searchParams.set("page", String(pageNumber));
                    url.searchParams.set("limit", String(pageLimit));

                    const response = await api.get(url.href, {
                        timeout: SCRAPE_TIMEOUT
                    });

                    if (!response.ok()) {
                        const error = new Error(
                            `Catalog API returned HTTP ${response.status()}`
                        );
                        const retryAfter = Number(
                            response.headers()["retry-after"]
                        );

                        if (Number.isFinite(retryAfter) && retryAfter > 0) {
                            error.retryAfterMs = retryAfter * 1000;
                        }

                        throw error;
                    }

                    data = await response.json();

                    if (!Array.isArray(data.results)) {
                        throw new Error("Catalog response has no results array");
                    }

                    if (data.page !== pageNumber) {
                        throw new Error(
                            `Catalog returned page ${data.page} instead of ${pageNumber}`
                        );
                    }

                    if (pageNumber === 1) {
                        totalPages = Number(data.totalPages);
                        totalCount = Number(data.count);

                        if (
                            !Number.isInteger(totalPages) ||
                            totalPages < 1 ||
                            !Number.isInteger(totalCount) ||
                            totalCount < 1
                        ) {
                            throw new Error("Catalog response has invalid totals");
                        }
                    }

                    const expectedResults = Math.min(
                        Number(data.perPage) || pageLimit,
                        totalCount - (pageNumber - 1) * pageLimit
                    );

                    if (data.results.length !== expectedResults) {
                        throw new Error(
                            `Catalog page ${pageNumber} was incomplete: received ${data.results.length} of ${expectedResults}`
                        );
                    }

                    break;
                } catch (error) {
                    lastError = error;

                    if (attempt < 6) {
                        const delay = error.retryAfterMs || Math.min(
                            60000,
                            1000 * 2 ** attempt
                        );

                        console.warn(
                            `Catalog page ${pageNumber} attempt ${attempt} failed: ${error.message}; retrying in ${delay}ms`
                        );
                        await new Promise((resolve) =>
                            setTimeout(resolve, delay)
                        );
                    }
                }
            }

            if (!data) {
                throw new Error(
                    `Failed to load catalog page ${pageNumber}: ${lastError.message}`
                );
            }

            for (const item of data.results) {
                const storeProductId = String(item.id || "");
                const skuMatch = item.sku?.match(/^SK-(\d+)-[A-Z]+$/i);

                if (
                    !storeProductId ||
                    !item.name ||
                    !skuMatch ||
                    skuMatch[1] !== storeProductId
                ) {
                    throw new Error(
                        `Invalid product data on catalog page ${pageNumber}`
                    );
                }

                products.set(storeProductId, {
                    productName: item.name,
                    brand: item.brand || "",
                    sku: item.sku,
                    storeProductId,
                    productUrl: new URL(
                        `/item/${storeProductId}`,
                        STORE_BASE_URL
                    ).href
                });
            }
        }

        if (products.size !== totalCount) {
            throw new Error(
                `Catalog incomplete: received ${products.size} of ${totalCount} products`
            );
        }

        return Array.from(products.values());
    } finally {
        await api.dispose();
    }
}

module.exports = {
    scrapeCatalog
};