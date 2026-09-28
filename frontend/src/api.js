const API_URL =
    import.meta.env.VITE_API_URL || "http://localhost:5000";

async function request(url, options = {}) {
    const response = await fetch(`${API_URL}${url}`, options);

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || "Something went wrong");
    }

    return data;
}

export async function scrapeCatalog() {
    const data = await request("/api/scrape/catalog", {
        method: "POST",
    });

    return data.products;
}

export async function scrapeProduct(product) {
    const data = await request("/api/scrape/product", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(product),
    });

    return data.product;
}

export async function getTrackedProducts() {
    const data = await request("/api/products");

    return data.products;
}

export async function trackProduct(product) {
    const data = await request("/api/products", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(product),
    });

    return data.product;
}

export async function searchProducts(query) {
    const data = await request(
        `/api/search?q=${encodeURIComponent(query)}`
    );

    return data.products;
}

export async function getHistory(productId) {
    const data = await request(
        `/api/products/${productId}/history`
    );

    return data.history;
}

export async function getLogs(productId) {
    const data = await request(
        `/api/products/${productId}/logs`
    );

    return data.logs;
}

export function getExportUrl() {
    return `${API_URL}/api/export`;
}