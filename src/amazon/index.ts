import { ElementHandle, Page } from "playwright";
import { NetworkHelper } from "../networkHelper.js"; // Adjust the import path as needed

/**
 * Represents the information of an Amazon order.
 */
export type OrderInfo = {
  productName: string;
  status: string;
  totalPrice: string;
  orderDate: string;
  shippedToName: string;
  shippedToAddress: string;
};

/**
 * Automates the process of adding AirPods to the cart on Amazon.
 *
 * @param networkHelper - Helper object for network-related operations
 * @returns A function that takes a Playwright Page object that is on the home page of Amazon and performs the automation
 */
export const demoAddHeadphonesToCart =
  (networkHelper: NetworkHelper) => async (page: Page) => {
    await searchItem(networkHelper, "Airpods")(page);
    await networkHelper.takeScreenshot(page, "amazon", "search_results");
    await addItemToCartOnProductPage(networkHelper, page);
    await networkHelper.takeScreenshot(page, "amazon", "addCart");
    await navigateToCheckoutPage(networkHelper, page);
    await networkHelper.takeScreenshot(page, "amazon", "checkout");
    await submitCheckoutOnCheckoutPage(networkHelper, page);
    await networkHelper.takeScreenshot(page, "amazon", "orderSubmitted");
  };

/**
 * Retrieves all orders from the Amazon account.
 *
 * @param networkHelper - Helper object for network-related operations
 * @returns A function that takes a Playwright Page object that is on the home page of Amazon and returns an array of OrderInfo
 */
export const getAllOrders =
  (networkHelper: NetworkHelper) => async (page: Page) => {
    await navigateToAccountPage(networkHelper, page);
    await navigateToOrdersPage(networkHelper, page);
    const orders = await extractOrdersInfo(networkHelper, page);
    return orders;
  };

/**
 * Searches for a specified item on Amazon.
 *
 * @param networkHelper - Helper object for network-related operations
 * @param item - The item to search for
 * @returns A function that takes a Playwright Page object that is on the home page of Amazon and performs the search
 */
export const searchItem =
  (networkHelper: NetworkHelper, item: string) => async (page: Page) => {
    await networkHelper.waitForNetworkIdle(page);
    await page.focus("#twotabsearchtextbox");
    await page.keyboard.type(item);
    await page.keyboard.press("Enter");
    await clickFirstVisibleItemOnSearchPage(networkHelper, page);
  };

/**
/**
 * Adds the current item to the cart from the product page.
 * Note: This function may not work for subscription items like medication, food or clothing
 * 
 * @param networkHelper - Helper object for network-related operations
 * @param page - Playwright Page object that should be on an Amazon product page
 */
export const addItemToCartOnProductPage = async (
  networkHelper: NetworkHelper,
  page: Page,
) => {
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
      .waitForSelector(page, 'input[name="submit.addToCart"]', "visible", 5000)
      .then(async (button) => {
        if (button) await button.click();
      }),
    new Promise((resolve) => setTimeout(resolve, 5000)), // Timeout after 5 seconds if no elements are found
  ]);

  console.log("Item added to cart successfully");
};

/**
 * Submits the checkout process on the Amazon checkout page.
 *
 * @param networkHelper - Helper object for network-related operations
 * @param page - Playwright Page object that should be on the Amazon checkout page (https://www.amazon.com/gp/buy/spc/handlers/display.html)
 * @throws Error if unable to proceed with checkout or place the order
 */
export const submitCheckoutOnCheckoutPage = async (
  networkHelper: NetworkHelper,
  page: Page,
) => {
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

/**
 * Navigates to the checkout page from the current page.
 *
 * @param networkHelper - Helper object for network-related operations
 * @param page - Playwright Page object that should be on any Amazon page with access to the cart
 */
export const navigateToCheckoutPage = async (
  networkHelper: NetworkHelper,
  page: Page,
) => {
  await page.click("a#nav-cart");
  await networkHelper.waitForSelector(
    page,
    'input[name="proceedToRetailCheckout"]',
    "visible",
  );
};

/**
 * Navigates to the account page from the current page.
 *
 * @param networkHelper - Helper object for network-related operations
 * @param page - Playwright Page object that should be on any Amazon page with access to the account menu
 */
export const navigateToAccountPage = async (
  networkHelper: NetworkHelper,
  page: Page,
) => {
  await page.click("a#nav-link-accountList");
  await networkHelper.waitForSelector(
    page,
    'h1:has-text("Your Account")',
    "visible",
  );
};

/**
 * Navigates to the orders page from the current page.
 *
 * @param networkHelper - Helper object for network-related operations
 * @param page - Playwright Page object that should be on the Amazon account page or any page with access to the orders link
 */
export const navigateToOrdersPage = async (
  networkHelper: NetworkHelper,
  page: Page,
) => {
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

export default {
  demoAddHeadphonesToCart,
  getAllOrders,
  searchItem,
  addItemToCartOnProductPage,
  submitCheckoutOnCheckoutPage,
};
