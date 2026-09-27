import { useEffect, useState } from "react";

import {
    searchProducts,
    getTrackedProducts,
    trackProduct,
    getHistory,
    getLogs,
    getExportUrl,
} from "./api";

export default function App() {
    // -----------------------------
    // Search state
    // -----------------------------

    const [query, setQuery] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);

    const [selectedProduct, setSelectedProduct] =
        useState(null);

    const [selectedOption, setSelectedOption] =
        useState("64 GB");

    // -----------------------------
    // Dashboard state
    // -----------------------------

    const [trackedProducts, setTrackedProducts] =
        useState([]);

    const [activeProduct, setActiveProduct] =
        useState(null);

    const [history, setHistory] = useState([]);
    const [logs, setLogs] = useState([]);

    const [loadingDetails, setLoadingDetails] =
        useState(false);

    // -----------------------------
    // General state
    // -----------------------------

    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    // Load tracked products when app starts
    useEffect(() => {
        loadTrackedProducts();
    }, []);

    // -----------------------------
    // API functions
    // -----------------------------

    async function loadTrackedProducts() {
        try {
            const products = await getTrackedProducts();

            setTrackedProducts(products);

            if (products.length > 0) {
                selectTrackedProduct(products[0]);
            }
        } catch (error) {
            setError(error.message);
        }
    }

    async function handleSearch(event) {
        event.preventDefault();

        if (!query.trim()) {
            setError("Please enter a product name.");
            return;
        }

        try {
            setSearching(true);
            setError("");
            setMessage("");

            const products = await searchProducts(query);

            setSearchResults(products);

            if (products.length === 0) {
                setMessage("No products found.");
            }
        } catch (error) {
            setError(error.message);
        } finally {
            setSearching(false);
        }
    }

    function selectSearchProduct(product) {
        setSelectedProduct(product);
        setSelectedOption("64 GB");
        setError("");
        setMessage("");
    }

    async function handleTrack() {
        if (!selectedProduct) {
            return;
        }

        try {
            setError("");
            setMessage("");

            const product = await trackProduct({
                storeProductId:
                    selectedProduct.storeProductId,

                productName:
                    selectedProduct.productName,

                productUrl:
                    selectedProduct.productUrl,

                selectedOption,
            });

            setMessage("Product added to tracking.");

            setSelectedProduct(null);

            await loadTrackedProducts();

            selectTrackedProduct(product);
        } catch (error) {
            setError(error.message);
        }
    }

    async function selectTrackedProduct(product) {
        try {
            setActiveProduct(product);
            setLoadingDetails(true);
            setError("");

            const [historyData, logsData] =
                await Promise.all([
                    getHistory(product.id),
                    getLogs(product.id),
                ]);

            setHistory(historyData);
            setLogs(logsData);
        } catch (error) {
            setError(error.message);
        } finally {
            setLoadingDetails(false);
        }
    }

    // -----------------------------
    // UI
    // -----------------------------

    return (
        <div className="app">

            {/* Header */}

            <header className="header">
                <h1>INE Price Tracker</h1>

                <p>
                    Track product prices, stock and scraper
                    activity.
                </p>
            </header>


            <main>

                {/* ========================= */}
                {/* SEARCH */}
                {/* ========================= */}

                <section className="section">

                    <h2>Search Products</h2>

                    <form
                        className="search"
                        onSubmit={handleSearch}
                    >
                        <input
                            type="text"
                            placeholder="Search product name..."
                            value={query}
                            onChange={(event) =>
                                setQuery(event.target.value)
                            }
                        />

                        <button
                            type="submit"
                            disabled={searching}
                        >
                            {searching
                                ? "Searching..."
                                : "Search"}
                        </button>
                    </form>


                    {/* Messages */}

                    {error && (
                        <div className="error">
                            {error}
                        </div>
                    )}

                    {message && (
                        <div className="message">
                            {message}
                        </div>
                    )}


                    {/* Search results */}

                    {searchResults.length > 0 && (
                        <div className="results">

                            <h3>Results</h3>

                            {searchResults.map(
                                (product) => (
                                    <div
                                        className="result"
                                        key={
                                            product.storeProductId
                                        }
                                    >
                                        <div>
                                            <strong>
                                                {
                                                    product.productName
                                                }
                                            </strong>

                                            <small>
                                                Product ID:{" "}
                                                {
                                                    product.storeProductId
                                                }
                                            </small>
                                        </div>

                                        <button
                                            onClick={() =>
                                                selectSearchProduct(
                                                    product
                                                )
                                            }
                                        >
                                            Select
                                        </button>
                                    </div>
                                )
                            )}
                        </div>
                    )}


                    {/* Selected product */}

                    {selectedProduct && (
                        <div className="selected">

                            <h3>
                                {selectedProduct.productName}
                            </h3>

                            <p>
                                Product ID:{" "}
                                {
                                    selectedProduct.storeProductId
                                }
                            </p>

                            <label>
                                Option
                            </label>

                            <select
                                value={selectedOption}
                                onChange={(event) =>
                                    setSelectedOption(
                                        event.target.value
                                    )
                                }
                            >
                                <option>64 GB</option>
                                <option>128 GB</option>
                                <option>256 GB</option>
                                <option>512 GB</option>
                            </select>

                            <button
                                className="track-button"
                                onClick={handleTrack}
                            >
                                Track Product
                            </button>

                        </div>
                    )}

                </section>


                {/* ========================= */}
                {/* TRACKED PRODUCTS */}
                {/* ========================= */}

                <section className="section">

                    <h2>Tracked Products</h2>

                    {trackedProducts.length === 0 ? (
                        <p className="muted">
                            No products are being tracked yet.
                        </p>
                    ) : (
                        <div className="tracked-list">

                            {trackedProducts.map(
                                (product) => (
                                    <button
                                        key={product.id}
                                        className={
                                            activeProduct?.id ===
                                            product.id
                                                ? "tracked active"
                                                : "tracked"
                                        }
                                        onClick={() =>
                                            selectTrackedProduct(
                                                product
                                            )
                                        }
                                    >
                                        <strong>
                                            {
                                                product.product_name
                                            }
                                        </strong>

                                        <span>
                                            {
                                                product.selected_option
                                            }
                                        </span>
                                    </button>
                                )
                            )}

                        </div>
                    )}

                </section>


                {/* ========================= */}
                {/* PRODUCT DETAILS */}
                {/* ========================= */}

                {activeProduct && (
                    <section className="section">

                        <div className="details-header">

                            <div>
                                <h2>
                                    {
                                        activeProduct.product_name
                                    }
                                </h2>

                                <p className="muted">
                                    Option:{" "}
                                    {
                                        activeProduct.selected_option
                                    }
                                </p>

                                <p className="muted">
                                    Store ID:{" "}
                                    {
                                        activeProduct.store_product_id
                                    }
                                </p>
                            </div>

                            <a
                                href={getExportUrl()}
                                className="export"
                                target="_blank"
                                rel="noreferrer"
                            >
                                Export CSV
                            </a>

                        </div>


                        {/* History */}

                        <div className="subsection">

                            <h3>
                                Price & Stock History
                            </h3>

                            {loadingDetails ? (
                                <p>Loading...</p>
                            ) : history.length === 0 ? (
                                <p className="muted">
                                    No history yet.
                                </p>
                            ) : (
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Time</th>
                                            <th>Price</th>
                                            <th>Stock</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {history.map(
                                            (item) => (
                                                <tr
                                                    key={
                                                        item.id
                                                    }
                                                >
                                                    <td>
                                                        {new Date(
                                                            item.timestamp
                                                        ).toLocaleString()}
                                                    </td>

                                                    <td>
                                                        ₹
                                                        {Number(
                                                            item.price
                                                        ).toLocaleString(
                                                            "en-IN"
                                                        )}
                                                    </td>

                                                    <td>
                                                        {
                                                            item.stock
                                                        }
                                                    </td>
                                                </tr>
                                            )
                                        )}
                                    </tbody>
                                </table>
                            )}

                        </div>


                        {/* Logs */}

                        <div className="subsection">

                            <h3>
                                Scrape Logs
                            </h3>

                            {loadingDetails ? (
                                <p>Loading...</p>
                            ) : logs.length === 0 ? (
                                <p className="muted">
                                    No logs yet.
                                </p>
                            ) : (
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Time</th>
                                            <th>Attempt</th>
                                            <th>Outcome</th>
                                            <th>Error</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {logs.map(
                                            (log) => (
                                                <tr
                                                    key={
                                                        log.id
                                                    }
                                                >
                                                    <td>
                                                        {new Date(
                                                            log.timestamp
                                                        ).toLocaleString()}
                                                    </td>

                                                    <td>
                                                        {
                                                            log.attempt
                                                        }
                                                    </td>

                                                    <td>
                                                        <span
                                                            className={`status ${log.outcome}`}
                                                        >
                                                            {
                                                                log.outcome
                                                            }
                                                        </span>
                                                    </td>

                                                    <td>
                                                        {log.error_message ||
                                                            "-"}
                                                    </td>
                                                </tr>
                                            )
                                        )}
                                    </tbody>
                                </table>
                            )}

                        </div>

                    </section>
                )}

            </main>

        </div>
    );
}