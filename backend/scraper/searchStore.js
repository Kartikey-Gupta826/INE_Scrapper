const STORE_BASE_URL =
    process.env.STORE_BASE_URL || "https://demo.inelabteamdev.com";

const SCRAPE_TIMEOUT =
    Number(process.env.SCRAPE_TIMEOUT) || 30000;


/**
 * Search products from the INE mock store catalog.
 *
 * @param {import("playwright").Page} page
 * @param {string} query
 * @returns {Promise<Array>}
 */
async function searchStore(page, query) {
    if (!query || typeof query !== "string") {
        throw new Error("Search query is required");
    }

    const cleanQuery = query.trim();
    if (!cleanQuery) {
        throw new Error("Search query cannot be empty");
    }

    await page.goto(STORE_BASE_URL, {
        waitUntil: "domcontentloaded",
        timeout: SCRAPE_TIMEOUT
    });

    const productCards = page.locator("article");
    await productCards.first().waitFor({
        state: "visible",
        timeout: SCRAPE_TIMEOUT
    });

    const products = [];
    const seenIds = new Set();
    const normalizedQuery = cleanQuery.toLocaleLowerCase();
    const navigation = page.getByRole("navigation", {
        name: "Catalog pages"
    });
    const nextButton = page.getByRole("button", {
        name: /Next/
    });

    while (true) {
        const pageProducts = await productCards.evaluateAll((articles) => {
            return articles.map((article) => {
                const productName = article.querySelector("h3")
                    ?.textContent
                    ?.replace(/\s+/g, " ")
                    .trim();
                const storeProductId = article.textContent
                    ?.match(/\bSKU\s+SK-(\d+)-[A-Z]+\b/i)?.[1];

                return { productName, storeProductId };
            });
        });

        for (const product of pageProducts) {
            if (
                !product.productName ||
                !product.storeProductId ||
                !product.productName.toLocaleLowerCase().includes(normalizedQuery) ||
                seenIds.has(product.storeProductId)
            ) {
                continue;
            }

            seenIds.add(product.storeProductId);
            products.push({
                ...product,
                productUrl: new URL(
                    `/item/${product.storeProductId}`,
                    STORE_BASE_URL
                ).href
            });
        }

        if (await nextButton.isDisabled()) {
            break;
        }

        const previousPage = await navigation.innerText();
        await nextButton.click();
        await page.waitForFunction(
            (previousText) => {
                const catalogNavigation = Array.from(
                    document.querySelectorAll("nav")
                ).find((element) =>
                    element.getAttribute("aria-label") === "Catalog pages"
                );

                return catalogNavigation?.innerText !== previousText;
            },
            previousPage,
            { timeout: SCRAPE_TIMEOUT }
        );
    }

    console.log(`Found ${products.length} products for "${cleanQuery}"`);
    return products;
}


module.exports = {
    searchStore
};