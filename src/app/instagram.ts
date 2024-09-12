import { Page } from "playwright";
import { NetworkHelper } from "../networkHelper.js";

/**
 * Sends a direct message to a specified recipient on Instagram.
 *
 * @param networkHelper - Helper object for network-related operations
 * @param recipient - The username of the message recipient - This user will be on the home page
 * @param message - The content of the message to be sent
 * @returns A function that takes a Playwright Page object and performs the message sending operation
 */
export const sendMessage =
  (networkHelper: NetworkHelper, recipient: string, message: string) =>
  async (page: Page) => {
    try {
      await closeNotificationModal(page, networkHelper);
      await navigateToDirectInbox(page, networkHelper);
      await selectRecipientOnDirectMessage(page, networkHelper, recipient);
      await sendMessageOnMessageModal(page, networkHelper, message);

      console.log("Message sent successfully");
      await networkHelper.takeScreenshot(page, "instagram", "message-sent");
    } catch (error) {
      console.error("An error occurred:", error);
      await networkHelper.takeScreenshot(page, "instagram", "error-state");
      throw error; // Re-throw the error for upstream handling
    } finally {
      await page.close();
    }
  };

/**
 * Navigates to the Instagram Direct Inbox.
 *
 * @param page - Playwright Page object. This action should be able to run on any page
 * @param networkHelper - Helper object for network-related operations
 */
export async function navigateToDirectInbox(
  page: Page,
  networkHelper: NetworkHelper,
) {
  await networkHelper.retryWithBackoff(async () => {
    // Wait for the mail icon to be visible
    const mailIconSelector = 'a[href="/direct/inbox/"]';
    await networkHelper.waitForSelector(
      page,
      mailIconSelector,
      "visible",
      networkHelper.networkTimeout,
    );

    // Click on the mail icon
    await page.click(mailIconSelector);

    // Wait for the inbox page to load
    await networkHelper.waitForPageLoad(page);
    await networkHelper.waitForNetworkIdle(page);

    // Verify that we're on the inbox page
    const inboxUrlPattern = /https:\/\/www\.instagram\.com\/direct\/inbox\//;
    await page.waitForURL(inboxUrlPattern, {
      timeout: networkHelper.networkTimeout,
    });

    console.log("Navigated to Direct Inbox");
  });
}

/**
 * Handles the notification modal if it appears.
 *
 * @param page - Playwright Page object. This action should be able to run on any page
 * @param networkHelper - Helper object for network-related operations
 */
export async function closeNotificationModal(
  page: Page,
  networkHelper: NetworkHelper,
) {
  const modalSelector = 'div[role="dialog"]';
  const notNowButton = 'button:has-text("Not Now")';

  const modalVisible = await page.isVisible(modalSelector, {
    timeout: networkHelper.networkTimeout,
  });
  if (modalVisible) {
    await page.click(notNowButton);
    console.log("Clicked 'Not Now' on notification modal");
    await networkHelper.waitForNetworkIdle(page);
  }
}

/**
 * Opens up a new message modal and selects a recipient.
 *
 * @param page - Playwright Page object. The page should be on the Direct Inbox page
 * @param networkHelper - Helper object for network-related operations
 * @param recipient - The username of the message recipient
 */
export async function selectRecipientOnDirectMessage(
  page: Page,
  networkHelper: NetworkHelper,
  recipient: string,
) {
  await networkHelper.retryWithBackoff(async () => {
    // Click on the "New message" SVG button
    const newMessageButtonSelector = 'svg[aria-label="New message"]';
    await networkHelper.waitForSelector(
      page,
      newMessageButtonSelector,
      "visible",
      networkHelper.networkTimeout,
    );
    await page.click(newMessageButtonSelector);
    console.log("Clicked on 'New message' button");

    // Wait for the recipient search modal to appear
    const searchModalSelector = 'div[role="dialog"]';
    await networkHelper.waitForSelector(
      page,
      searchModalSelector,
      "visible",
      networkHelper.networkTimeout,
    );
    console.log("Recipient search modal appeared");

    // Wait for and click on the search input
    const searchInput = await networkHelper.waitForSelector(
      page,
      'input[placeholder="Search..."]',
      "visible",
      5000,
    );
    if (!searchInput) {
      throw new Error(
        "Search input for finding a user on Instagram's receipt messenging modal not found",
      );
    }
    await searchInput.click();
    await searchInput.fill(recipient);
    await networkHelper.waitForNetworkIdle(page);

    // Wait for and click on the recipient

    const combinedSelector = `div[role="button"]:has-text("${recipient}") input[type="checkbox"]`;
    const checkbox = await networkHelper.waitForSelector(
      page,
      combinedSelector,
      "visible",
      5000,
    );
    if (!checkbox) {
      throw new Error(`Checkbox for recipient "${recipient}" not found`);
    }
    await checkbox.click();
    await networkHelper.waitForNetworkIdle(page);

    // Wait for and click the "Chat" button
    const chatButton = await networkHelper.waitForSelector(
      page,
      'div[role="button"]:has-text("Chat")',
      "visible",
      5000,
    );
    if (!chatButton) {
      throw new Error("Chat button to select recipient not found");
    }
    await chatButton.click();
    await networkHelper.waitForNetworkIdle(page);

    console.log(`Selected recipient: ${recipient}`);
  });
}

/**
 * Sends a message to the selected recipient.
 *
 * @param page - Playwright Page object. This assumes that the page is on the direct message inbox page with the message modal open.
 * @param networkHelper - Helper object for network-related operations
 * @param message - The content of the message to be sent
 */
export async function sendMessageOnMessageModal(
  page: Page,
  networkHelper: NetworkHelper,
  message: string,
) {
  await networkHelper.retryWithBackoff(async () => {
    const messageInputSelector = 'div[aria-label="Message"] p';
    await networkHelper.waitForSelector(
      page,
      messageInputSelector,
      "visible",
      networkHelper.networkTimeout,
    );

    // Type the message
    await page.fill(messageInputSelector, message);
    console.log("Message typed");

    // Locate and click the "Send" button
    const sendButtonSelector = 'div[role="button"]:has-text("Send")';
    await networkHelper.waitForSelector(
      page,
      sendButtonSelector,
      "visible",
      networkHelper.networkTimeout,
    );
    await page.click(sendButtonSelector);
    console.log("Send button clicked");

    // Wait for the message to be sent
    await waitForMessageSent(page, networkHelper);
  });
}

async function waitForMessageSent(page: Page, networkHelper: NetworkHelper) {
  await networkHelper.retryWithBackoff(async () => {
    // Wait for the "Seen" indicator to appear or for the message to be marked as sent
    const sentIndicatorSelector =
      'span:has-text("Seen"), span:has-text("Sent")';
    await networkHelper.waitForSelector(
      page,
      sentIndicatorSelector,
      "visible",
      networkHelper.networkTimeout,
    );
    console.log("Message sent successfully");
  });
}

export default {
  sendMessage,
  navigateToDirectInbox,
  closeNotificationModal,
  selectRecipientOnDirectMessage,
  sendMessageOnMessageModal,
};
