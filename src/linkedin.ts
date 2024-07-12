import { Page } from "playwright";
import { NetworkHelper } from "./networkHelper"; // Adjust the import path as needed

const LINKEDIN_URL = "https://www.linkedin.com";
const NETWORK_TIMEOUT = 5000;

type LinkedInSearchQueryType = "People" | "Companies";

export const linkedInCreatePost =
  (networkHelper: NetworkHelper) => async (page: Page) => {
    console.log("Starting linkedInCreatePost function...");

    console.log("Step 1: Navigating to LinkedIn homepage...");
    await networkHelper.retryWithBackoff(async () => {
      await page.goto(LINKEDIN_URL, { timeout: NETWORK_TIMEOUT });
      await networkHelper.waitForNetworkIdle(page);
      console.log("Successfully navigated to LinkedIn homepage.");
    });

    await networkHelper.takeScreenshot(page, "linkedin", "1-linkedin-homepage");

    console.log("Step 2: Waiting for page to load...");
    await networkHelper.waitForNetworkIdle(page);
    await networkHelper.takeScreenshot(page, "linkedin", "2-after-page-load");

    console.log("Step 3: Locating 'Start a post' button...");
    await networkHelper.retryWithBackoff(async () => {
      const startPostButton = page.getByRole("button", {
        name: "Start a post",
      });
      await startPostButton.waitFor({
        state: "visible",
        timeout: NETWORK_TIMEOUT,
      });
      console.log("'Start a post' button located and visible.");
    });
    await networkHelper.takeScreenshot(
      page,
      "linkedin",
      "3-before-clicking-start-post",
    );

    console.log("Step 4: Clicking 'Start a post' button...");
    await networkHelper.retryWithBackoff(async () => {
      await page.getByRole("button", { name: "Start a post" }).click();
      await networkHelper.waitForPageLoad(page);
      console.log("'Start a post' button clicked successfully.");
    });
    await networkHelper.takeScreenshot(
      page,
      "linkedin",
      "4-after-clicking-start-post",
    );

    console.log("Step 5: Waiting for post creation modal...");
    await networkHelper.retryWithBackoff(async () => {
      await page.waitForSelector('div[role="dialog"]', {
        state: "visible",
        timeout: NETWORK_TIMEOUT,
      });
      await networkHelper.waitForNetworkIdle(page);
      console.log("Post creation modal is visible.");
    });
    await networkHelper.takeScreenshot(
      page,
      "linkedin",
      "5-post-creation-modal",
    );

    console.log("Step 6: Locating and interacting with text editor...");
    const postContent =
      "I'm testing Anon.com and automatically generated this post in < 5 minutes.\nFind out more about using Anon to automate your agent automations at Anon.com.";
    await networkHelper.retryWithBackoff(async () => {
      const textEditor = page.getByRole("textbox", {
        name: "Text editor for creating",
      });
      await textEditor.waitFor({ state: "visible", timeout: NETWORK_TIMEOUT });
      await textEditor.fill(postContent);
      await networkHelper.waitForNetworkIdle(page);
      console.log("Post content written successfully.");
    });
    await networkHelper.takeScreenshot(
      page,
      "linkedin",
      "6-after-writing-post",
    );

    console.log("Step 7: Locating and clicking 'Post' button...");
    await networkHelper.retryWithBackoff(async () => {
      const postButton = page.getByRole("button", {
        name: "Post",
        exact: true,
      });
      await postButton.waitFor({ state: "visible", timeout: NETWORK_TIMEOUT });
      await postButton.click();
      console.log("'Post' button clicked successfully.");
    });
    await networkHelper.takeScreenshot(
      page,
      "linkedin",
      "7-after-clicking-post",
    );

    console.log("Step 8: Waiting for post confirmation...");
    await Promise.race([
      networkHelper.waitForNetworkIdle(page),
      page.waitForSelector('[aria-label="Post successful"]', {
        state: "visible",
        timeout: NETWORK_TIMEOUT,
      }),
      networkHelper.waitForPageLoad(page),
    ])
      .then(() => console.log("Post confirmation received."))
      .catch(() => console.log("Post confirmation timeout, but proceeding."));
    await networkHelper.takeScreenshot(page, "linkedin", "8-after-posting");

    console.log("LinkedIn post creation process completed.");
  };

interface LinkedInConnection {
  name: string;
  title: string;
  profileUrl: string;
}

export const runGettingLinkedinConnections =
  (networkHelper: NetworkHelper) => async (page: Page) => {
    // Load "https://www.linkedin.com/feed/"
    await networkHelper.retryWithBackoff(async () => {
      await page.goto("https://www.linkedin.com/feed/");
    });

    await networkHelper.waitForNetworkIdle(page);

    await networkHelper.retryWithBackoff(async () => {
      await page.click(".global-nav__me-photo");
    });

    await networkHelper.retryWithBackoff(async () => {
      await page.click('//a[text()="View Profile"]');
    });
    await networkHelper.waitForPageLoad(page);

    // Click on <a> "connections"
    console.log("Trying to get connections");
    await networkHelper.retryWithBackoff(async () => {
      await networkHelper.waitForNetworkIdle(page);
      const connectionsLink = await page.waitForSelector(
        'a[href*="/mynetwork/invite-connect/connections/"]',
        { state: "visible" },
      );
      await connectionsLink.click();
      console.log("Clicked on connections link");
      await networkHelper.waitForPageLoad(page);
    });
    await networkHelper.waitForPageLoad(page);

    // Function to extract connections from the current page
    const extractConnections = async (): Promise<LinkedInConnection[]> => {
      await networkHelper.waitForNetworkIdle(page);
      return await page.$$eval(".mn-connection-card", (cards) =>
        cards.map((card) => ({
          name:
            card
              .querySelector(".mn-connection-card__name")
              ?.textContent?.trim() || "",
          title:
            card
              .querySelector(".mn-connection-card__occupation")
              ?.textContent?.trim() || "",
          profileUrl:
            card.querySelector(".mn-connection-card__link")?.href || "",
        })),
      );
    };

    return await extractConnections();
  };

type LinkedInFollowResult =
  | { type: "Success" }
  | { type: "No Effect" }
  | { type: "Error"; description?: string };
// Fix: This doesn't work at the moment.
export const runFollowLinkedinPage =
  (networkHelper: NetworkHelper, companyName: string) =>
  async (page: Page): Promise<LinkedInFollowResult> => {
    async function ensureOnCompanyPage(
      page: Page,
      companyName: string,
    ): Promise<boolean> {
      const url = page.url();
      const title = await page.title();
      return (
        url.includes("/company/") &&
        title.toLowerCase().includes(companyName.toLowerCase())
      );
    }

    try {
      await search(page, networkHelper, companyName);
      await clickFirstResult("Companies", page, networkHelper);

      const isOnCompanyPage = await ensureOnCompanyPage(page, companyName);
      if (!isOnCompanyPage) {
        console.log(`Not on ${companyName} LinkedIn page`);
        await networkHelper.takeScreenshot(
          page,
          "linkedin",
          `wrong-page-${companyName}`,
        );
        return { type: "Error", description: "Wrong Page" };
      }

      // Look for the Follow button
      const followButton = await page
        .locator('button:has-text("Follow"), button:has-text("+ Follow")')
        .first();

      if (!followButton) {
        console.log(`Follow button not found for ${companyName}`);
        await networkHelper.takeScreenshot(
          page,
          "linkedin",
          `no-follow-button-${companyName}`,
        );

        return { type: "Error", description: "Follow Button Not Found" };
      }

      const followButtonText = await followButton.textContent();

      if (
        followButtonText &&
        (followButtonText.trim() === "Follow" ||
          followButtonText.trim() === "+ Follow")
      ) {
        await networkHelper.retryWithBackoff(async () => {
          await followButton.click();
        });
        console.log(`Successfully followed ${companyName}`);
        await networkHelper.takeScreenshot(
          page,
          "linkedin",
          `followed-${companyName}`,
        );
        return { type: "Success" };
      } else {
        console.log(`Already following ${companyName}`);
        await networkHelper.takeScreenshot(
          page,
          "linkedin",
          `already-following-${companyName}`,
        );
        return { type: "No Effect" };
      }
    } catch (error) {
      console.error(`An error occurred: ${error}`);
      await networkHelper.takeScreenshot(
        page,
        "linkedin",
        `error-${companyName}`,
      );

      return { type: "Error" };
    }
  };

// Fix: This doesn't work at the moment.
export const sendLinkedinMessageAction =
  (
    networkHelper: NetworkHelper,
    { recipient, message }: { recipient: string; message: string },
  ) =>
  async (page: Page) => {
    console.log("Starting sendLinkedinMessageAction function...");

    console.log("Step 1: Navigating to LinkedIn messaging...");
    await networkHelper.retryWithBackoff(async () => {
      await page.goto("https://linkedin.com/messaging/?", {
        timeout: networkHelper.networkTimeout,
      });
      await networkHelper.waitForNetworkIdle(page);
      console.log("Successfully navigated to LinkedIn messaging.");
    });

    await networkHelper.takeScreenshot(
      page,
      "linkedin",
      "1-messaging-homepage",
    );

    console.log("Step 2: Waiting for page to load...");
    await networkHelper.waitForNetworkIdle(page);
    await networkHelper.takeScreenshot(page, "linkedin", "2-after-page-load");

    console.log("Step 3: Searching for recipient...");
    await networkHelper.retryWithBackoff(async () => {
      const searchInput = page.getByPlaceholder("Search messages");
      await searchInput.fill(recipient);
      await page.waitForTimeout(1000); // Allowing some time for the search results to appear
      await searchInput.press("Enter");
      console.log("Searching messages for recipient.");
    });
    await networkHelper.takeScreenshot(
      page,
      "linkedin",
      "3-after-searching-recipient",
    );

    console.log("Step 4: Selecting recipient from search results...");
    await networkHelper.retryWithBackoff(async () => {
      const recipientListItem = page
        .getByRole("listitem")
        .filter({ hasText: recipient, hasNot: page.locator("#ember") })
        .first();
      await recipientListItem.waitFor({
        state: "visible",
        timeout: networkHelper.networkTimeout,
      });
      await recipientListItem.click();
      console.log(`Selected recipient: ${recipient}`);
    });
    await networkHelper.takeScreenshot(
      page,
      "linkedin",
      `4-selected-recipient-${recipient}`,
    );

    console.log("Step 5: Writing the message...");
    await networkHelper.retryWithBackoff(async () => {
      const messageInput = page.getByLabel("Write a message");
      await messageInput.fill(message);
      console.log(`Message written for ${recipient}`);
    });
    await networkHelper.takeScreenshot(
      page,
      "linkedin",
      `5-message-written-${recipient}`,
    );

    console.log("Step 6: Sending the message...");
    await networkHelper.retryWithBackoff(async () => {
      const sendButton = page.locator(".msg-form__send-btn");
      await sendButton.waitFor({
        state: "visible",
        timeout: networkHelper.networkTimeout,
      });
      await sendButton.click();
      console.log("Message sent successfully.");
    });
    await networkHelper.takeScreenshot(
      page,
      "linkedin",
      `6-message-sent-${recipient}`,
    );

    console.log("Step 7: Confirming message sent...");
    await Promise.race([
      networkHelper.waitForNetworkIdle(page),
      page.waitForSelector('div[aria-label="Message sent"]', {
        state: "visible",
        timeout: networkHelper.networkTimeout,
      }),
      networkHelper.waitForPageLoad(page),
    ])
      .then(() => console.log("Message confirmation received."))
      .catch(() =>
        console.log("Message confirmation timeout, but proceeding."),
      );
    await networkHelper.takeScreenshot(
      page,
      "linkedin",
      "7-after-message-confirmation",
    );

    console.log("LinkedIn message sending process completed.");
  };

export const getUserInfo =
  (networkHelper: NetworkHelper, personName: string) => async (page: Page) => {
    try {
      await search(page, networkHelper, personName);
      await clickFirstResult("People", page, networkHelper);
      return await extractProfileInfo(page, networkHelper);
    } catch (error) {
      console.error(`An error occurred: ${error}`);
      await networkHelper.takeScreenshot(
        page,
        "linkedin",
        `error-${personName}`,
      );
      throw new Error(`Cannot get user info for ${personName}`);
    }
  };

async function clickFirstResult(
  type: LinkedInSearchQueryType,
  page: Page,
  networkHelper: NetworkHelper,
) {
  await networkHelper.retryWithBackoff(async () => {
    await networkHelper.waitForNetworkIdle(page);

    // Wait for and click the "People" tab
    const desiredTab = await page.waitForSelector(
      `button.search-reusables__filter-pill-button:has-text("${type}")`,
    );
    await desiredTab.click();

    // Wait for the search results to update after clicking the tab
    await networkHelper.waitForNetworkIdle(page);

    // Wait for the search results container to load
    await page.waitForSelector("ul.reusable-search__entity-result-list");

    // Find the first person link
    const firstLink = await page
      .locator("li.reusable-search__result-container a.app-aware-link")
      .first();

    // Check if the link exists
    if ((await firstLink.count()) === 0) {
      throw new Error("No person result found");
    }

    // Click on the first person link
    await firstLink.click();
  });

  await networkHelper.waitForPageLoad(page);
}

async function search(
  page: Page,
  networkHelper: NetworkHelper,
  personName: string,
) {
  console.log(`Searching for ${personName}`);
  await networkHelper.retryWithBackoff(async () => {
    await page.click('[placeholder="Search"]');
    await page.fill('[placeholder="Search"]', personName);
    await page.press('[placeholder="Search"]', "Enter");
  });
  await networkHelper.waitForPageLoad(page);
}

// NOTE: This only works for 2nd degree connections
export const sendConnectionRequest =
  (networkHelper: NetworkHelper, personName: string) => async (page: Page) => {
    try {
      // await searchForPerson(page, networkHelper, personName);
      // await clickFirstResult("People", page, networkHelper);
      await page.goto("https://www.linkedin.com/in/wu-the-jeff/");
      networkHelper.waitForNetworkIdle(page);
      console.log("Trying to find Connect Button");
      const connectButton = await page
        .locator('button:has(svg[data-test-icon="connect-small"])')
        .first();

      if (!connectButton) {
        console.log(`Connect button not found for ${personName}`);
        await networkHelper.takeScreenshot(
          page,
          "linkedin",
          `no-connect-button-${personName}`,
        );
        throw new Error("Connect Button Not Found");
      }

      console.log("Found Connect Button");

      await connectButton.click();

      await handleConnectionModal(page, networkHelper, personName);
    } catch (error) {
      console.error(`An error occurred: ${error}`);
      await networkHelper.takeScreenshot(
        page,
        "linkedin",
        `error-${personName}`,
      );
      throw new Error(`Cannot get user info for ${personName}`);
    }
  };

async function handleConnectionModal(
  page: Page,
  networkHelper: NetworkHelper,
  personName: string,
) {
  const addNoteButton = await page
    .locator('button:contains("Add a note")')
    .first();
  const sendButton = await page.locator('button:contains("Send")').first();

  if (addNoteButton) {
    await addNoteButton.click();
    await page.fill(
      'textarea[name="message"]',
      "Hi, I'd like to connect with you on LinkedIn.",
    );
    await page.click('button:has-text("Send")');
  } else if (sendButton) {
    await sendButton.click();
  } else {
    console.log(`Failed to send connection request to ${personName}`);
    await networkHelper.takeScreenshot(
      page,
      "linkedin",
      `failed-connect-${personName}`,
    );
    throw new Error("Failed to Send Request");
  }

  console.log(`Successfully sent connection request to ${personName}`);
  await networkHelper.takeScreenshot(
    page,
    "linkedin",
    `connected-${personName}`,
  );
}

async function extractGeneralProfileInfo(
  page: Page,
  networkHelper: NetworkHelper,
) {
  return await networkHelper.retryWithBackoff(async () => {
    await networkHelper.waitForNetworkIdle(page);

    console.log("Extracting Name");
    const nameElement = page.locator(".text-heading-xlarge");
    const name = await nameElement
      .textContent()
      .then((text) => (text ? text.replace("'s Profile", "").trim() : null));

    // Extract current position (assuming it's available in the main profile section)
    console.log("Extract Current Position");
    const positionElement = page.locator(".text-body-medium");
    const currentPosition = await positionElement
      .textContent()
      .then((text) => (text ? text.trim() : null));

    await networkHelper.waitForPageLoad(page);

    return {
      name,
      currentPosition,
    };
  });
}

async function extractContactInfo(page: Page, networkHelper: NetworkHelper) {
  return await networkHelper.retryWithBackoff(async () => {
    await networkHelper.waitForNetworkIdle(page);

    console.log("Waiting for modal to load");
    // Wait for the modal to load
    await page.waitForSelector("#pv-contact-info");

    // Extract contact info
    const contactInfo: {
      [key: string]: string | string[] | Array<{ url: string; type: string }>;
    } = {};

    // LinkedIn profile URL
    console.log("Getting LinkedIn profile URL");
    const linkedInProfileElement = await page
      .locator(
        '.pv-contact-info__contact-type:has(svg[data-test-icon="linkedin-bug-medium"]) a',
      )
      .first();
    const linkedInProfile = await linkedInProfileElement.getAttribute("href");
    if (linkedInProfile) {
      contactInfo["LinkedIn"] = linkedInProfile;
    }

    // Email
    console.log("Extracting Email");
    const emailSection = page.locator(
      '.pv-contact-info__contact-type:has(svg[data-test-icon="envelope-medium"])',
    );
    const emailElements = emailSection.locator("a.link-without-visited-state");
    const emails = await emailElements.allTextContents();
    if (emails.length > 0) {
      contactInfo["email"] = emails.map((email) => email.trim());
    }

    // Phone
    console.log("Extracting Phone Number");
    const phoneSection = page.locator(
      '.pv-contact-info__contact-type:has(svg[data-test-icon="phone-handset-medium"])',
    );
    const phoneElements = phoneSection.locator(".t-14.t-black.t-normal");
    const phones = await phoneElements.allTextContents();
    if (phones.length > 0) {
      contactInfo["Phone"] = phones.map((phone) => phone.trim());
    }
    // Websites
    console.log("Extracting Websites");
    const websitesSection = await page.locator(
      '.pv-contact-info__contact-type:has(svg[data-test-icon="link-medium"])',
    );
    const websiteElements = await websitesSection.locator("li").all();

    const websites = await Promise.all(
      websiteElements.map(async (element) => {
        const url = await element.locator("a").getAttribute("href");
        const typeElement = await element.locator("span").first();
        const type = await typeElement.textContent();
        return {
          url: url || "",
          type: type ? type.replace(/[()]/g, "").trim() : "",
        };
      }),
    );

    if (websites.length > 0) {
      contactInfo["Websites"] = websites;
    }

    await networkHelper.waitForPageLoad(page);
    return contactInfo;
  });
}

async function extractProfileInfo(page: Page, networkHelper: NetworkHelper) {
  const generalInfo = await extractGeneralProfileInfo(page, networkHelper);

  const contactInfo = await withContactInfoModal(
    page,
    networkHelper,
    extractContactInfo,
  );

  return {
    ...generalInfo,
    contactInfo,
  };
}

async function withContactInfoModal<T>(
  page: Page,
  networkHelper: NetworkHelper,
  operation: (page: Page, networkHelper: NetworkHelper) => Promise<T>,
): Promise<T> {
  console.log("Opening Contact Info modal");
  const contactInfoButton = page.locator(
    "a#top-card-text-details-contact-info",
  );
  await contactInfoButton.click();

  console.log("Waiting for modal to load");
  await page.waitForSelector("#pv-contact-info");

  try {
    // Perform the operation passed as a parameter
    const result = await operation(page, networkHelper);
    return result;
  } finally {
    console.log("Closing contact info modal");
    await networkHelper.retryWithBackoff(async () => {
      const closeButton = page.locator('button[aria-label="Dismiss"]').first();
      await closeButton.click();

      // Wait for the modal to disappear
      await page.waitForSelector("#pv-contact-info", { state: "detached" });
    });
  }
}
