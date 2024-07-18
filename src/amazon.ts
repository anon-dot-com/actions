import { ElementHandle, Page } from "playwright";
import { NetworkHelper } from "./networkHelper"; // Adjust the import path as needed

interface OrderInfo {
  productName: string;
  status: string;
  totalPrice: string;
  orderDate: string;
  shippedToName: string;
  shippedToAddress: string;
}

export const runAmazonAddHeadphonesToCart =
  (networkHelper: NetworkHelper) => async (page: Page) => {
    await runSearchForItem(networkHelper, "Airpods")(page);
    await networkHelper.takeScreenshot(page, "amazon", "search_results");
    await runAddItemToCart(networkHelper)(page);
    await networkHelper.takeScreenshot(page, "amazon", "addCart");
    await navigateToCheckoutPage(networkHelper)(page);
    await networkHelper.takeScreenshot(page, "amazon", "checkout");
    await runSubmitCheckoutOrder(networkHelper)(page);
    await networkHelper.takeScreenshot(page, "amazon", "orderSubmitted");
  };

export const runGetAllOrders =
  (networkHelper: NetworkHelper) => async (page: Page) => {
    await navigateToAccountPage(networkHelper)(page);
    await navigateToOrdersPage(networkHelper)(page);
    const orders = await extractOrdersInfo(networkHelper, page);
    return orders;
  };

export const runSearchForItem =
  (networkHelper: NetworkHelper, item: string) => async (page: Page) => {
    await networkHelper.waitForNetworkIdle(page);
    await page.focus("#twotabsearchtextbox");
    await page.keyboard.type(item);
    await page.keyboard.press("Enter");
    await clickFirstVisibleItemOnSearchPage(networkHelper, page);
  };

// This code isn't able to add cards
// It doesn't have the ability to add items to the cart that are a subscription and some clothing items
export const runAddItemToCart =
  (networkHelper: NetworkHelper) => async (page: Page) => {
    await networkHelper.retryWithBackoff(async () => {
      // Look for different "Add to Cart" button selectors
      const addToCartSelectors = [
        "#add-to-cart-button",
        "#one-click-button",
        'input[name="submit.add-to-cart"]',
        'input[name="submit.buy-now"]',
      ];

      let addToCartButton = null;
      for (const selector of addToCartSelectors) {
        addToCartButton = await networkHelper
          .waitForSelector(page, selector, "visible", 2000)
          .catch(() => null);
        if (addToCartButton) break;
      }

      if (addToCartButton) {
        await addToCartButton.click();
      } else {
        console.log("Add to Cart button not found");
        throw new Error("Add to Cart button not found");
      }
    });

    await Promise.race([
      networkHelper
        .waitForSelector(page, "#attachSiNoCoverage", "visible", 5000)
        .then(async (button) => {
          if (button) await button.click();
        }),
      networkHelper
        .waitForSelector(page, "#siNoCoverage", "visible", 5000)
        .then(async (button) => {
          if (button) await button.click();
        }),
      networkHelper
        .waitForSelector(
          page,
          'input[name="submit.addToCart"]',
          "visible",
          5000,
        )
        .then(async (button) => {
          if (button) await button.click();
        }),
      new Promise((resolve) => setTimeout(resolve, 5000)), // Timeout after 5 seconds if no elements are found
    ]);

    console.log("Item added to cart successfully");
  };

export const runSubmitCheckoutOrder =
  (networkHelper: NetworkHelper) => async (page: Page) => {
    await networkHelper.retryWithBackoff(async () => {
      await page.click('input[name="proceedToRetailCheckout"]');
      await networkHelper.waitForSelector(
        page,
        "#submitOrderButtonId",
        "visible",
      );
    });

    await networkHelper.retryWithBackoff(async () => {
      await networkHelper.waitForNetworkIdle(page);
      await networkHelper.waitForSelector(
        page,
        'input[name="placeYourOrder1"]:not([disabled])',
        "visible",
        5000,
      );
      await page.click('input[name="placeYourOrder1"]');
    });
  };

const clickFirstVisibleItemOnSearchPage = async (
  networkHelper: NetworkHelper,
  page: Page,
) => {
  await networkHelper.retryWithBackoff(async () => {
    await networkHelper.waitForSelector(
      page,
      'div[data-component-type="s-search-result"]',
      "visible",
      10000,
    );

    const items = await page.$$('div[data-component-type="s-search-result"]');

    for (const item of items) {
      const isVisible = await item.isVisible();
      if (isVisible) {
        const titleLink = await item.$(
          "a.a-link-normal.s-underline-text.s-underline-link-text.s-link-style.a-text-normal",
        );

        if (titleLink) {
          await titleLink.scrollIntoViewIfNeeded();
          await titleLink.click();
          await networkHelper.waitForPageLoad(page);

          console.log("Clicked on the first visible item");
          return;
        }
      }
    }

    console.log("No visible items found");
  });
};

export const navigateToCheckoutPage =
  (networkHelper: NetworkHelper) => async (page: Page) => {
    await page.click("a#nav-cart");
    await networkHelper.waitForSelector(
      page,
      'input[name="proceedToRetailCheckout"]',
      "visible",
    );
  };

export const navigateToAccountPage =
  (networkHelper: NetworkHelper) => async (page: Page) => {
    await page.click("a#nav-link-accountList");
    await networkHelper.waitForSelector(
      page,
      'h1:has-text("Your Account")',
      "visible",
    );
  };

export const navigateToOrdersPage =
  (networkHelper: NetworkHelper) => async (page: Page) => {
    const ordersLink = await page.locator('a:has-text("Your Orders")').first();

    if (await ordersLink.isVisible()) {
      await ordersLink.click();
    } else {
      // If not found on the main account page, try the alternative method
      await page.click("#nav-orders");
    }

    // Wait for the Orders page to load
    await networkHelper.waitForSelector(
      page,
      'h1:has-text("Your Orders")',
      "visible",
      5000,
    );
  };

async function extractOrdersInfo(
  networkHelper: NetworkHelper,
  page: Page,
): Promise<OrderInfo[]> {
  const orders: OrderInfo[] = [];

  try {
    // Wait for the orders to load
    await networkHelper.waitForPageLoad(page);

    // Get all order elements
    const orderElements = await page.$$(".order-card");

    for (const orderElement of orderElements) {
      const order = await extractSingleOrderInfo(orderElement);
      orders.push(order);
    }

    return orders;
  } catch (error) {
    console.error("Error extracting orders info:", error);
    return [];
  }
}

async function extractSingleOrderInfo(
  orderElement: ElementHandle,
): Promise<OrderInfo> {
  console.log("Extracting order info...");
  const order: OrderInfo = {
    productName: "",
    status: "",
    totalPrice: "",
    orderDate: "",
    shippedToName: "",
    shippedToAddress: "",
  };

  try {
    // Extract order date
    const dateElement = await orderElement.$(
      ".a-column.a-span3 .a-size-base.a-color-secondary",
    );
    order.orderDate = (await dateElement?.innerText()) || "N/A";

    // Extract total price
    const priceElement = await orderElement.$(
      ".a-column.a-span2 .a-size-base.a-color-secondary",
    );
    order.totalPrice = (await priceElement?.innerText()) || "N/A";

    // Extract shipping information
    const shippingElement = await orderElement.$(
      ".yohtmlc-recipient .a-size-base",
    );
    if (shippingElement) {
      order.shippedToName = (await shippingElement.innerText()) || "N/A";
    }

    // Extract shipping address from popover
    const addressPopover = await orderElement.$(".a-popover-preload");
    if (addressPopover) {
      const addressLines = await addressPopover.$$eval(".a-row", (rows) =>
        rows.map((row) => row.textContent.trim()),
      );
      order.shippedToAddress = addressLines.slice(1).join(", ") || "N/A";
    }

    // Extract product name
    const productNameElement = await orderElement.$(".yohtmlc-product-title");
    order.productName = (await productNameElement?.innerText()) || "N/A";

    // Extract status
    const statusElement = await orderElement.$(".delivery-box__primary-text");
    order.status = (await statusElement?.innerText()) || "N/A";
  } catch (error) {
    console.error("Error extracting single order info:", error);
  }

  return order;
}
