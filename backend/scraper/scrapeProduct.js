const STORE_BASE_URL =
    process.env.STORE_BASE_URL || "https://demo.inelabteamdev.com";

const SCRAPE_TIMEOUT =
    Number(process.env.SCRAPE_TIMEOUT) || 30000;


/**
 * Scrape the current price and stock for a tracked product.
 *
 * Expected product object:
 * {
 *   store_product_id: "2649",
 *   product_name: "Tamarack Tablet Duo",
 *   product_url: "https://demo.inelabteamdev.com/item/2649",
 *   selected_option: "256 GB"
 * }
 */
async function scrapeProduct(page, product) {
    const productUrl =
        product.product_url ||
        `${STORE_BASE_URL}/item/${product.store_product_id}`;

    const selectedOption = product.selected_option;

    if (!product.store_product_id) {
        throw new Error("Missing store product ID");
    }

    if (!selectedOption) {
        throw new Error("Missing selected product option");
    }

    console.log(
        `Scraping product ${product.store_product_id} - ${selectedOption}`
    );

    // -----------------------------------------------------
    // 1. Open product page
    // -----------------------------------------------------

    await page.goto(productUrl, {
        waitUntil: "domcontentloaded",
        timeout: SCRAPE_TIMEOUT
    });


    // -----------------------------------------------------
    // 2. Verify that the product exists
    // -----------------------------------------------------

    const productNameElement =
        page.locator(".pdp-summary h1");

    await productNameElement.waitFor({
        state: "visible",
        timeout: SCRAPE_TIMEOUT
    });

    const productName =
        (await productNameElement.textContent())?.trim();

    if (!productName) {
        throw new Error("Product name could not be extracted");
    }

    console.log(`Product: ${productName}`);


    // -----------------------------------------------------
    // 3. Select requested option
    // -----------------------------------------------------

    const optionButton = page
        .locator(".opt-picker button.opt-chip")
        .filter({
            hasText: selectedOption
        });

    const optionCount = await optionButton.count();

    if (optionCount === 0) {
        throw new Error(
            `Option "${selectedOption}" was not found`
        );
    }

    if (optionCount > 1) {
        throw new Error(
            `Multiple buttons found for option "${selectedOption}"`
        );
    }

    await optionButton.click();


    // -----------------------------------------------------
    // 4. Verify option was actually selected
    // -----------------------------------------------------

    await page.waitForFunction(
        (optionText) => {
            const buttons = [
                ...document.querySelectorAll(
                    ".opt-picker button.opt-chip"
                )
            ];

            return buttons.some((button) => {
                return (
                    button.textContent.trim() === optionText &&
                    button.getAttribute("aria-pressed") === "true"
                );
            });
        },
        selectedOption
    );

    const selectedState =
        await optionButton.getAttribute("aria-pressed");

    if (selectedState !== "true") {
        throw new Error(
            `Failed to select option "${selectedOption}"`
        );
    }

    console.log(`Selected option: ${selectedOption}`);


    // -----------------------------------------------------
    // 5. Find "Check today's price" button
    // -----------------------------------------------------

    const priceButton = page.getByRole("button", {
        name: /check today's price/i
    });

    await priceButton.waitFor({
        state: "visible",
        timeout: SCRAPE_TIMEOUT
    });


    // -----------------------------------------------------
    // 6. Trigger dynamic price loading
    // -----------------------------------------------------

    await priceButton.click();

    console.log("Requested current price...");


    // -----------------------------------------------------
    // 7. Wait for the offer to become ready
    // -----------------------------------------------------

    const readyOffer =
        page.locator(".offer-panel.offer-ready");

    await readyOffer.waitFor({
        state: "visible",
        timeout: SCRAPE_TIMEOUT
    });

    console.log("Price information loaded");


    // -----------------------------------------------------
    // 8. Extract CURRENT price
    // -----------------------------------------------------
    //
    // Important:
    //
    // The page contains multiple prices:
    //
    // hidden:
    //   .price-value
    //
    // old/crossed-out:
    //   .vbt-n6
    //
    // current:
    //   visible <b>
    //
    // hidden:
    //   .amount
    //
    // Therefore we specifically select the visible <b>.
    // -----------------------------------------------------

    const priceElement =
        readyOffer.locator(".offer-row b:visible");

    await priceElement.waitFor({
        state: "visible",
        timeout: SCRAPE_TIMEOUT
    });

    const priceText =
        (await priceElement.textContent())?.trim();

    if (!priceText) {
        throw new Error("Current price was empty");
    }

    const price = Number(
        priceText.replace(/[₹,\s]/g, "")
    );

    if (!Number.isFinite(price) || price <= 0) {
        throw new Error(
            `Invalid price extracted: "${priceText}"`
        );
    }


    // -----------------------------------------------------
    // 9. Extract stock
    // -----------------------------------------------------

    const stockElement =
        readyOffer.locator(".avail-pill");

    await stockElement.waitFor({
        state: "visible",
        timeout: SCRAPE_TIMEOUT
    });

    const stockText =
        (await stockElement.textContent())?.trim();

    if (!stockText) {
        throw new Error("Stock information was empty");
    }

    const stockMatch =
        stockText.match(/(\d+)\s+remaining/i);

    if (!stockMatch) {
        throw new Error(
            `Could not parse stock: "${stockText}"`
        );
    }

    const stock = Number(stockMatch[1]);

    if (!Number.isInteger(stock) || stock < 0) {
        throw new Error(
            `Invalid stock value: "${stockText}"`
        );
    }


    // -----------------------------------------------------
    // 10. Return validated result
    // -----------------------------------------------------

    const result = {
        productId: String(product.store_product_id),
        productName,
        selectedOption,
        price,
        stock,
        productUrl
    };

    console.log(
        `Scrape successful: ₹${price.toLocaleString("en-IN")} | ` +
        `Stock: ${stock}`
    );

    return result;
}


module.exports = {
    scrapeProduct
};