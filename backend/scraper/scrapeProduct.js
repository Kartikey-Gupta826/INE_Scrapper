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

    let selectedOption = product.selected_option;

    if (!product.store_product_id) {
        throw new Error("Missing store product ID");
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

    const productNameElement = page.locator("h1").first();

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

    const optionButtons = page.locator(".opt-chip");
    const optionCount = await optionButtons.count();
    let optionButton;

    if (selectedOption && selectedOption !== "Default") {
        optionButton = page.getByRole("button", {
            name: selectedOption,
            exact: true
        });

        if (await optionButton.count() !== 1) {
            throw new Error(`Option "${selectedOption}" was not found`);
        }
    } else if (optionCount > 0) {
        optionButton = optionButtons.first();
        selectedOption = (await optionButton.innerText()).trim();
    } else {
        selectedOption = "Default";
    }

    if (optionButton && await optionButton.getAttribute("aria-pressed") !== "true") {
        await optionButton.click();
        await page.waitForFunction(
            (optionText) => Array.from(
                document.querySelectorAll(".opt-chip")
            ).some((button) =>
                button.textContent.trim() === optionText &&
                button.getAttribute("aria-pressed") === "true"
            ),
            selectedOption,
            { timeout: SCRAPE_TIMEOUT }
        );
    }

    console.log(`Selected option: ${selectedOption}`);


    // -----------------------------------------------------
    // 5. Find "Check today's price" button
    // -----------------------------------------------------

    const priceButton = page.locator(".offer-panel button");

    await priceButton.waitFor({
        state: "visible",
        timeout: SCRAPE_TIMEOUT
    });

    const priceArea = page.locator(".offer-panel > div");
    const priceAreaBox = await priceArea.boundingBox();

    if (!priceAreaBox) {
        throw new Error("Price area could not be found");
    }

    for (let move = 0; move < 9; move++) {
        await page.mouse.move(
            priceAreaBox.x + 5 + move * 10,
            priceAreaBox.y + priceAreaBox.height / 2
        );
        await page.waitForTimeout(50);
    }

    await page.waitForTimeout(650);
    await page.waitForFunction(
        () => {
            const button = document.querySelector(".offer-panel button");
            return button && !button.disabled;
        },
        null,
        { timeout: SCRAPE_TIMEOUT }
    );
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

    await page.waitForFunction(
        () => {
            const panel = document.querySelector(".offer-panel");
            const price = panel?.querySelector(".offer-row strong");

            return panel?.classList.contains("offer-ready") &&
                price &&
                getComputedStyle(price).opacity === "1" &&
                !panel.innerText.includes("Refreshing prices");
        },
        null,
        { timeout: SCRAPE_TIMEOUT }
    );

    const priceElement = readyOffer.locator(".offer-row strong:visible");

    await priceElement.waitFor({
        state: "visible",
        timeout: SCRAPE_TIMEOUT
    });

    const priceText = (await priceElement.innerText())
        ?.replace(/[\u200B-\u200D\uFEFF]/g, "")
        .trim();

    if (!priceText) {
        throw new Error("Current price was empty");
    }

    const price = Number(
        priceText.replace(/[^\d.]/g, "")
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

    const stockMatch = stockText.match(/(\d+)\s+remaining/i);
    const stock = /sold out/i.test(stockText)
        ? 0
        : stockMatch
            ? Number(stockMatch[1])
            : NaN;

    if (!Number.isInteger(stock)) {
        throw new Error(`Could not parse stock: "${stockText}"`);
    }

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