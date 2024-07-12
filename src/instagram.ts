import { Page } from "playwright";

export const runSendMessageOnInstagramAction = async (page: Page) => {
  page.goto("https://www.instagram.com");
  await page.waitForLoadState();

  await page.goto("https://instagram.com/direct/inbox");

  await page.waitForLoadState();
  await page.waitForTimeout(3000);

  // Check for the "Turn on Notifications" modal and click "Not Now" if it appears
  const modalSelector = 'text="Turn on Notifications"'; // Adjust the selector to be more specific if necessary
  const notNowButton = 'text="Not Now"'; // Adjust if necessary

  if (await page.isVisible(modalSelector)) {
    await page.click(notNowButton);
  }

  await page.waitForSelector('div[role="listitem"]');
  const firstUserSelector = 'div[role="listitem"] div:nth-of-type(1)';

  await page.click(firstUserSelector);

  console.log("Clicked on user");
  await page.waitForLoadState();

  await page.waitForTimeout(3000);
  await page.waitForSelector('div[aria-describedby="Message"]');

  console.log("About to write 'sup' message");
  // Wait for the message content to load
  // Wait for the message box to be ready and type the message
  await page.fill('div[aria-describedby="Message"]', "Sup"); // Replace the placeholder text as needed
  console.log("About to send message");
  await page.click('div[role="button"]:has-text("Send")');
  console.log("Sent a message");
  await page.close();
};
