import React from "react";
import ReactDOM from "react-dom/client";

import CatalogScraper from "./CatalogScraper";
import "./index.css";

ReactDOM.createRoot(
    document.getElementById("root")
).render(
    <React.StrictMode>
        <CatalogScraper />
    </React.StrictMode>
);