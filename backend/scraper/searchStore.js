const STORE_BASE_URL =
    process.env.STORE_BASE_URL || "https://demo.inelabteamdev.com";

const SCRAPE_TIMEOUT =
    Number(process.env.SCRAPE_TIMEOUT) || 30000;


/**
 * Search products from the INE mock store.
 *
 * @param {import("playwright").Page} page
 * @param {string} query
 *
 * @returns {Promise<Array>}
 *
 * Example:
 * [
 *   {
 *     storeProductId: "2649",
 *     productName: "Tamarack Tablet Duo",
 *     productUrl: "https://demo.inelabteamdev.com/item/2649"
 *   }
 * ]
 */
async function searchStore(page, query) {

    // --------------------------------------------------
    // 1. Validate search query
    // --------------------------------------------------

    if (!query || typeof query !== "string") {
        throw new Error("Search query is required");
    }

    const cleanQuery = query.trim();

    if (!cleanQuery) {
        throw new Error("Search query cannot be empty");
    }


    // --------------------------------------------------
    // 2. Open store
    // --------------------------------------------------

    await page.goto(STORE_BASE_URL, {
        waitUntil: "domcontentloaded",
        timeout: SCRAPE_TIMEOUT
    });


    // --------------------------------------------------
    // 3. Find search input
    // --------------------------------------------------

    const searchInput = page.locator(
        'input[placeholder*="Search" i]'
    );

    await searchInput.waitFor({
        state: "visible",
        timeout: SCRAPE_TIMEOUT
    });


    // --------------------------------------------------
    // 4. Enter search query
    // --------------------------------------------------

    await searchInput.fill(cleanQuery);


    // --------------------------------------------------
    // 5. Trigger search
    // --------------------------------------------------

    const searchButton = page.getByRole("button", {
        name: /search/i
    });

    await searchButton.waitFor({
        state: "visible",
        timeout: SCRAPE_TIMEOUT
    });

    await searchButton.click();


    // --------------------------------------------------
    // 6. Wait for search results
    //
    // Product URLs have the form:
    //
    // /item/2649
    //
    // Instead of depending on random CSS classes,
    // locate product links using the URL structure.
    // --------------------------------------------------

    try {

        await page.locator('a[href^="/item/"]').first().waitFor({
            state: "visible",
            timeout: SCRAPE_TIMEOUT
        });

    } catch (error) {

        // No results is not necessarily a scraping failure.
        // It may simply mean the query matched nothing.

        console.log(
            `No products found for "${cleanQuery}"`
        );

        return [];
    }


    // --------------------------------------------------
    // 7. Extract result links
    // --------------------------------------------------

    const rawProducts = await page
        .locator('a[href^="/item/"]')
        .evaluateAll((links) => {

            return links.map((link) => {

                const href = link.getAttribute("href");

                /*
                 * We don't rely on a random generated class here.
                 *
                 * Instead we look at the text belonging to the
                 * product link/card.
                 */

                const text =
                    link.innerText
                        ?.replace(/\s+/g, " ")
                        .trim();

                return {
                    href,
                    text
                };
            });
        });


    // --------------------------------------------------
    // 8. Normalize results
    // --------------------------------------------------

    const products = [];

    for (const item of rawProducts) {

        if (!item.href) {
            continue;
        }

        const match =
            item.href.match(/\/item\/([^/?#]+)/);

        if (!match) {
            continue;
        }

        const storeProductId = match[1];

        /*
         * The link/card may contain extra information.
         *
         * We keep the text temporarily. Once we inspect the
         * exact product-card HTML we can extract the product
         * name with a more precise selector.
         */

        const productName = item.text;

        if (!productName) {
            continue;
        }

        products.push({
            storeProductId,
            productName,

            productUrl: new URL(
                item.href,
                STORE_BASE_URL
            ).href
        });
    }


    // --------------------------------------------------
    // 9. Remove duplicates
    // --------------------------------------------------

    const uniqueProducts = [];

    const seenIds = new Set();

    for (const product of products) {

        if (seenIds.has(product.storeProductId)) {
            continue;
        }

        seenIds.add(product.storeProductId);

        uniqueProducts.push(product);
    }


    console.log(
        `Found ${uniqueProducts.length} products for "${cleanQuery}"`
    );

    return uniqueProducts;
}


module.exports = {
    searchStore
};