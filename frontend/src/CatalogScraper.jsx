import { useEffect, useState } from "react";
import {
    getTrackedProducts,
    scrapeCatalog,
    scrapeProduct,
    trackProduct,
} from "./api";

function escapeCsv(value) {
    return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function downloadCsv(products) {
    const columns = [
        ["Product", "productName"],
        ["Brand", "brand"],
        ["SKU", "sku"],
        ["Product ID", "storeProductId"],
        ["Current price", "price"],
        ["Stock", "stock"],
        ["Product URL", "productUrl"],
    ];
    const rows = [
        columns.map(([label]) => escapeCsv(label)).join(","),
        ...products.map((product) =>
            columns.map(([, key]) => escapeCsv(product[key])).join(",")
        ),
    ];
    const blob = new Blob([rows.join("\r\n")], {
        type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "ine-store-products.csv";
    link.click();
    URL.revokeObjectURL(url);
}

export default function CatalogScraper() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [scrapedAt, setScrapedAt] = useState("");
    const [trackedProducts, setTrackedProducts] = useState({});
    const [quotes, setQuotes] = useState({});
    const [loadingPriceId, setLoadingPriceId] = useState("");
    const [trackingId, setTrackingId] = useState("");

    useEffect(() => {
        getTrackedProducts()
            .then((tracked) => {
                setTrackedProducts(Object.fromEntries(
                    tracked.map((product) => [
                        String(product.store_product_id),
                        product,
                    ])
                ));
            })
            .catch(() => {});
    }, []);

    async function handleScrape() {
        setLoading(true);
        setError("");

        try {
            const results = await scrapeCatalog();
            setProducts(results);
            setScrapedAt(new Date().toLocaleString());
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleGetPrice(product) {
        setLoadingPriceId(product.storeProductId);
        setError("");

        try {
            const quote = await scrapeProduct(product);
            setQuotes((previous) => ({
                ...previous,
                [product.storeProductId]: quote,
            }));
        } catch (requestError) {
            setError(`${product.productName}: ${requestError.message}`);
        } finally {
            setLoadingPriceId("");
        }
    }

    async function handleTrack(product) {
        setTrackingId(product.storeProductId);
        setError("");

        try {
            const tracked = await trackProduct({
                storeProductId: product.storeProductId,
                productName: product.productName,
                productUrl: product.productUrl,
                selectedOption: "Default",
            });
            setTrackedProducts((previous) => ({
                ...previous,
                [product.storeProductId]: tracked,
            }));
        } catch (requestError) {
            setError(`${product.productName}: ${requestError.message}`);
        } finally {
            setTrackingId("");
        }
    }

    return (
        <div className="scraper-shell">
            <header className="scraper-topbar">
                <a className="scraper-brand" href="/" aria-label="INE Store Scraper home">
                    <span className="scraper-brand-mark">I</span>
                    <span>INE Store Scraper</span>
                </a>
                <span className="scraper-topbar-note">CATALOG EXTRACT</span>
            </header>

            <main className="scraper-workspace">
                <section className="scraper-heading">
                    <div>
                        <p className="scraper-eyebrow">PRODUCT CATALOG</p>
                        <h1>Scraped products</h1>
                        <p className="scraper-subheading">
                            Scrape every product card, check live prices, and track selected items.
                        </p>
                    </div>
                    <div className="scraper-actions">
                        <button
                            className="scraper-button scraper-button-secondary"
                            type="button"
                            disabled={!products.length || loading}
                            onClick={() => downloadCsv(products.map((product) => ({
                                ...product,
                                price: quotes[product.storeProductId]?.price ??
                                    trackedProducts[product.storeProductId]?.current_price ?? "",
                                stock: quotes[product.storeProductId]?.stock ??
                                    trackedProducts[product.storeProductId]?.current_stock ?? "",
                            })))}
                        >
                            Download CSV
                        </button>
                        <button
                            className="scraper-button scraper-button-primary"
                            type="button"
                            disabled={loading}
                            onClick={handleScrape}
                        >
                            {loading ? "Scraping..." : "Scrape catalog"}
                        </button>
                    </div>
                </section>

                {error && <p className="scraper-alert" role="alert">{error}</p>}

                <section className="scraper-results" aria-label="Scraped product results">
                    <div className="scraper-results-toolbar">
                        <div className="scraper-result-count">
                            <strong>{products.length}</strong>
                            <span>{products.length === 1 ? "product" : "products"}</span>
                        </div>
                        <span className="scraper-time">
                            {scrapedAt ? `Updated ${scrapedAt}` : "No scrape run yet"}
                        </span>
                    </div>

                    <div className="scraper-table-scroll">
                        <table>
                            <thead>
                                <tr>
                                    <th>Product</th>
                                    <th>Brand</th>
                                    <th>SKU</th>
                                    <th>Item ID</th>
                                    <th>Current price</th>
                                    <th>Stock</th>
                                    <th>Tracking</th>
                                    <th>Refresh</th>
                                    <th>Store page</th>
                                </tr>
                            </thead>
                            <tbody>
                                {products.map((product) => (
                                    <tr key={product.storeProductId}>
                                        <td className="scraper-product-name">{product.productName}</td>
                                        <td>{product.brand}</td>
                                        <td><code>{product.sku}</code></td>
                                        <td><code>{product.storeProductId}</code></td>
                                        <td>
                                            {(quotes[product.storeProductId]?.price ?? trackedProducts[product.storeProductId]?.current_price) != null
                                                ? `₹${Number(quotes[product.storeProductId]?.price ?? trackedProducts[product.storeProductId]?.current_price).toLocaleString("en-IN")}`
                                                : "—"}
                                        </td>
                                        <td>
                                            {quotes[product.storeProductId]?.stock ?? trackedProducts[product.storeProductId]?.current_stock ?? "—"}
                                        </td>
                                        <td>
                                            {trackedProducts[product.storeProductId] ? (
                                                <span className="scraper-tracked-label">Tracked</span>
                                            ) : (
                                                <button
                                                    className="scraper-row-button"
                                                    type="button"
                                                    disabled={Boolean(trackingId || loadingPriceId || loading)}
                                                    onClick={() => handleTrack(product)}
                                                >
                                                    {trackingId === product.storeProductId ? "Adding..." : "Track"}
                                                </button>
                                            )}
                                        </td>
                                        <td>
                                            <button
                                                className="scraper-row-button"
                                                type="button"
                                                disabled={Boolean(loadingPriceId || trackingId || loading)}
                                                onClick={() => handleGetPrice(product)}
                                            >
                                                {loadingPriceId === product.storeProductId ? "Checking..." : "Get price"}
                                            </button>
                                        </td>
                                        <td>
                                            <a
                                                className="scraper-item-link"
                                                href={product.productUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                            >
                                                Open item <span aria-hidden="true">↗</span>
                                            </a>
                                        </td>
                                    </tr>
                                ))}
                                {!products.length && (
                                    <tr>
                                        <td className="scraper-empty-state" colSpan="9">
                                            {loading
                                                ? "Reading all catalog pages from the store..."
                                                : "Run a catalog scrape to see product data here."}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
            </main>
        </div>
    );
}