const express = require("express");
const cors = require("cors");

const app = express();


// ---------------------------------------------------------
// Middleware
// ---------------------------------------------------------

app.use(cors());

app.use(express.json());


// ---------------------------------------------------------
// Health check
// ---------------------------------------------------------

app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "Price Tracker API is running"
    });
});


// ---------------------------------------------------------
// API routes
// ---------------------------------------------------------

app.use("/api/search", require("./routes/search"));

app.use("/api/products", require("./routes/products"));

app.use("/api/products", require("./routes/history"));

app.use("/api/products", require("./routes/logs"));

app.use("/api/export", require("./routes/export"));

app.use("/api/scrape", require("./routes/scrape"));


// ---------------------------------------------------------
// 404 handler
// ---------------------------------------------------------

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "Route not found"
    });
});


// ---------------------------------------------------------
// Error handler
// ---------------------------------------------------------

app.use((err, req, res, next) => {

    console.error("Unhandled API error:", err);

    res.status(500).json({
        success: false,
        message: "Internal server error"
    });
});


module.exports = app;