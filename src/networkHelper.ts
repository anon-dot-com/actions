import { Page } from "playwright";

export class NetworkHelper {
  networkTimeout: number;
  private maxRetries: number;

  constructor(networkTimeout: number = 30000, maxRetries: number = 3) {
    this.networkTimeout = networkTimeout;
    this.maxRetries = maxRetries;
  }

  async waitForNetworkIdle(
    page: Page,
    timeout: number = this.networkTimeout,
  ): Promise<void> {
    console.log("Waiting for network to become idle...");
    try {
      await page.waitForLoadState("networkidle", { timeout });
      console.log("Network is idle.");
    } catch (error) {
      console.warn(
        "Network did not reach idle state within timeout, continuing...",
      );
    }
  }

  async waitForPageLoad(page: Page): Promise<void> {
    console.log("Waiting for page to load...");
    try {
      await page.waitForLoadState("load");
      console.log("Page loaded.");
    } catch (error) {
      console.warn("Page did not load within timeout, continuing...");
    }
  }

  async retryWithBackoff<T>(
    action: () => Promise<T>,
    maxRetries: number = this.maxRetries,
    baseDelay: number = 1000,
  ): Promise<T> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await action();
      } catch (error) {
        if (attempt === maxRetries) throw error;
        const delay = baseDelay * Math.pow(2, attempt - 1);
        console.log(`Attempt ${attempt} failed, retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
    throw new Error("Max retries reached");
  }

  async takeScreenshot(
    page: Page,
    prefix: string,
    name: string,
  ): Promise<void> {
    await page.screenshot({
      path: `screenshot-${prefix}-${name}-${Date.now()}.png`,
      fullPage: true,
    });
    console.log(`Screenshot taken: ${name}`);
  }
}
