const { chromium } = require("playwright");

async function createBrowser() {
    const headless =
        process.env.HEADLESS !== "false";

    const browser = await chromium.launch({
        headless
    });

    return browser;
}


module.exports = {
    createBrowser
};