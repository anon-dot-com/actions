/**
 * LinkedIn Automation Tools
 *
 * This module provides a set of functions to automate various LinkedIn tasks using Playwright.
 * These tools can be used to create posts, manage connections, send messages, and more.
 */

import { Page } from "playwright";
import { NetworkHelper } from "../networkHelper.js"; // Adjust the import path as needed

const NETWORK_TIMEOUT = 5000;

export type LinkedInSearchQueryType = "People" | "Companies";

export type LinkedInConnection = {
  name: string;
  title: string;
  profileUrl: string;
};

export type LinkedInFollowResult =
  | { type: "Success" }
  | { type: "No Effect" }
  | { type: "Error"; description?: string };

/**
 * Creates a LinkedIn post. Your page must be logged in and must be on the LinkedIn home page to create a post
 * @param networkHelper - Helper object for network-related operations
 * @param postContent
 * @returns
 */
export const createPost =
  (networkHelper: NetworkHelper, postContent: string) => async (page: Page) => {
    await networkHelper.waitForNetworkIdle(page);
    await clickOnPostModal(networkHelper, page);
    await writePostContent(networkHelper, postContent, page);
    await clickPostButton(networkHelper, page);
  };

/**
 * Gets the LinkedIn connections of the currently logged in user
 * @param networkHelper - Helper object for network-related operations
 * @returns
 */
export const getConnections =
  (networkHelper: NetworkHelper) => async (page: Page) => {
    await navigateToProfile(networkHelper, page);
    await navigateToConnections(networkHelper, page);
    return await readContactsFromConnectionPage(networkHelper, page);
  };

/**
 * Follows a LinkedIn company page. You must be on the LinkedIn home page to follow a company page
 * @param networkHelper - Helper object for network-related operations
 * @param companyName - The name of the company to follow
 * @returns
 */
export const followCompanyPage =
  (networkHelper: NetworkHelper, companyName: string) =>
  async (page: Page): Promise<LinkedInFollowResult> => {
    try {
      await searchOnHomePage(page, networkHelper, companyName);
      await clickFirstResultOnSearchPage("Companies", page, networkHelper);
      await networkHelper.waitForNetworkIdle(page);
      return await followCompanyOnCompanyPage(page, networkHelper, companyName);
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

/**
 * Sends a LinkedIn message to a recipient. Your page must be logged in and must be on the recipient's profile page to send a message
 * @param networkHelper - Helper object for network-related operations
 * @param recipient - The name of the recipient
 * @param message - The message to send
 * @returns
 */
export const sendMessage =
  (networkHelper: NetworkHelper, recipient: string, message: string) =>
  async (page: Page) => {
    await searchOnHomePage(page, networkHelper, recipient);
    await clickFirstResultOnSearchPage("People", page, networkHelper);
    await sendMessageOnProfilePage(networkHelper, message, page);
  };

/**
 * Gets the general information and contact info of a LinkedIn user. Your page must be logged in and must be on the user's profile page to get the user info
 * @param networkHelper - Helper object for network-related operations
 * @param personName - The name of the person to get info for
 * @returns
 */
export const getUserInfo =
  (networkHelper: NetworkHelper, personName: string) => async (page: Page) => {
    try {
      await searchOnHomePage(page, networkHelper, personName);
      await clickFirstResultOnSearchPage("People", page, networkHelper);

      // Gets the general info of a user
      const generalInfo = await readProfileIntroOnPersonPage(
        page,
        networkHelper,
      );

      // Clicks on the contact info modal and reads the contact info
      const contactInfo = await withContactInfoModal(
        page,
        networkHelper,
        readContactInfoOnContactModal,
      );

      return {
        ...generalInfo,
        contactInfo,
      };
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

/**
 * Sends a LinkedIn connection request to a person. This would only work if you are not connected with the person and that person is a 2nd degree connection
 * @param networkHelper - Helper object for network-related operations
 * @param personName - The name of the person to send a connection request to
 * @param message - The message to send with the connection request
 * @returns
 */
export const sendConnectionRequest =
  (networkHelper: NetworkHelper, personName: string, message?: string) =>
  async (page: Page) => {
    try {
      await searchOnHomePage(page, networkHelper, personName);
      await clickFirstResultOnSearchPage("People", page, networkHelper);
      await clickConnectButtonOnPersonPage(page, networkHelper);
      await fulfillConnectionRequestOnConnectionModal(
        page,
        networkHelper,
        personName,
        message,
      );
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

// close any existing message overlays.
async function closeMessageOverlay(page: Page) {
  try {
    const closeButton = await page.$('svg[data-test-icon="close-small"]');
    if (closeButton) {
      await closeButton.click();
      console.log("Message overlay closed successfully.");
      return true;
    } else {
      console.log("Close button not found. No existing messages to close.");
      return false;
    }
  } catch (error) {
    console.error("Error while trying to close message overlay:", error);
    return false;
  }
}

/**
 * Sends a LinkedIn message to a person. Your page must be logged in and must be on the recipient's profile page to send a message. That person must be a 1st degree connection to the delegated user
 * @param networkHelper - Helper object for network-related operations
 * @param message - The message to send
 * @param page - Playwright Page object. The page must be on the recipient's profile page
 */
export const sendMessageOnProfilePage = async (
  networkHelper: NetworkHelper,
  message: string,
  page: Page,
) => {
  try {
    while (await closeMessageOverlay(page)) {
      // Continue closing overlays until no more are found
    }

    // Wait for and click the "Message" button

    const messageButton = await page.waitForSelector(
      'button.pvs-profile-actions__action:has-text("Message")',
    );
    await messageButton.click();

    // Wait for the message modal to appear
    await page.waitForSelector("div.msg-form__contenteditable");

    // Type the message
    await page.fill("div.msg-form__contenteditable", message);

    await networkHelper.waitForNetworkIdle(page);

    // Wait for and click the Send button using the more specific selector
    await networkHelper.retryWithBackoff(async () => {
      await networkHelper.waitForSelector(page, 'button:has-text("Send")');
      await page.click('button:has-text("Send")');
    });

    console.log("Waiting for message send confirmation...");
    await Promise.race([
      networkHelper.waitForNetworkIdle(page),
      page.waitForSelector('[aria-label="Message sent"]', {
        state: "visible",
        timeout: NETWORK_TIMEOUT,
      }),
      networkHelper.waitForPageLoad(page),
    ])
      .then(() => console.log("Message send confirmation received."))
      .catch(() =>
        console.log("Message send confirmation timeout, but proceeding."),
      );
  } catch (error) {
    console.error("Error sending message:", error);
  }
};

/**
 * Clicks on the first result of a search page based on the search query type. Your page must be on the search page to click on the first result
 * @param type - The type of search query. Can be "People" or "Companies"
 * @param page - Playwright Page object. The page must be on the search page
 * @param networkHelper - Helper object for network-related operations
 */
export async function clickFirstResultOnSearchPage(
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

    // Find the first link of the category
    const firstLink = await page
      .locator("li.reusable-search__result-container a.app-aware-link")
      .first();

    // Check if the link exists
    if ((await firstLink.count()) === 0) {
      throw new Error("No person result found");
    }

    // Click on the first link of the category
    await firstLink.click();
  });

  await networkHelper.waitForPageLoad(page);
}

/**
 * Writes a search query  on LinkedIn. You must be on the LinkedIn home page to search
 * @param page - Playwright Page object. The page must be on the LinkedIn home page
 * @param networkHelper - Helper object for network-related operations
 * @param query Query to search for
 */
export async function searchOnHomePage(
  page: Page,
  networkHelper: NetworkHelper,
  query: string,
) {
  console.log(`Searching for ${query}`);
  await networkHelper.retryWithBackoff(async () => {
    await page.click('[placeholder="Search"]');
    await page.fill('[placeholder="Search"]', query);
    await page.press('[placeholder="Search"]', "Enter");
  });
  await networkHelper.waitForPageLoad(page);
}

export const clickConnectButtonOnPersonPage = async (
  page: Page,
  networkHelper: NetworkHelper,
) => {
  await networkHelper.waitForPageLoad(page);
  console.log("Trying to find Connect Button");
  await page.click(
    'button.pvs-profile-actions__action.artdeco-button[aria-label^="Invite"][aria-label$="to connect"]',
  );
  console.log("Clicked button");
};

export const fulfillConnectionRequestOnConnectionModal = async (
  page: Page,
  networkHelper: NetworkHelper,
  personName: string,
  message?: string,
) => {
  console.log("Connection modal open");
  await networkHelper.waitForNetworkIdle(page);
  console.log("Trying to find add button");
  const addNoteButton = await page
    .locator('button:has-text("Add a note")')
    .first();
  const sendButton = await page.locator('button:has-text("Send")').first();

  if (addNoteButton) {
    await addNoteButton.click();
    console.log("Clicked on add button");

    await page.fill(
      'textarea[name="message"]',
      message ||
        "Hi, I'd like to connect with you on LinkedIn. I used the Anon SDK to help me do this",
    );

    await page.click('button:has-text("Send")');

    await Promise.race([
      networkHelper.waitForNetworkIdle(page),
      networkHelper.waitForSelector(page, ".artdeco-modal-overlay", "hidden"),
      networkHelper.waitForPageLoad(page),
    ]);
  } else if (sendButton) {
    await Promise.race([
      networkHelper.waitForNetworkIdle(page),
      networkHelper.waitForSelector(page, ".artdeco-modal-overlay", "hidden"),
      networkHelper.waitForPageLoad(page),
    ]);
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
};

/**
 * Reads the profile intro of a LinkedIn user. The user must be on a profile page of a person to read the profile intro
 * @param page - Playwright Page object
 * @param networkHelper - Helper object for network-related operations
 * @returns
 */
export async function readProfileIntroOnPersonPage(
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

/**
 * Reads the contact info of a LinkedIn user. This assumes that the user is on the contact info modal of a person
 * @param page - Playwright Page object. The page must be on the contact info modal of a person
 * @param networkHelper - Helper object for network-related operations
 * @returns
 */
export async function readContactInfoOnContactModal(
  page: Page,
  networkHelper: NetworkHelper,
) {
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

/**
 * Clicks on the connect button on a LinkedIn profile page and runs callback that is designed for that callback. The user must be on a profile page of a person to click the connect button.
 * @param page - The Playwright Page object. The page must be on the profile page of a person
 * @param networkHelper - Helper object for network-related operations
 * @param operation - callback function that is designed to run after the connect button is clicked
 * @returns
 */
export async function withContactInfoModal<T>(
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

/**
 * Follows a LinkedIn company page. You must be on the LinkedIn company page to follow a company page
 * @param page - Playwright Page object. The page must be on the company page
 * @param networkHelper - Helper object for network-related operations
 * @param companyName - The name of the company to follow
 * @returns
 */
export async function followCompanyOnCompanyPage(
  page: Page,
  networkHelper: NetworkHelper,
  companyName?: string,
): Promise<LinkedInFollowResult> {
  // Look for the Follow button
  const followButton = await page
    .locator('button:has-text("Follow"), button:has-text("+ Follow")')
    .first();

  if (!followButton) {
    console.log(
      "Follow button not found" + companyName ? ` for ${companyName}` : "",
    );
    await networkHelper.takeScreenshot(
      page,
      "linkedin",
      "no-follow-button" + (companyName ? `-${companyName}` : ""),
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
    await networkHelper.waitForNetworkIdle(page);
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
}
/**
 * Opens the post creation modal on LinkedIn.
 * @param networkHelper - Helper object for network-related operations
 * @param page - Playwright Page object. The page must be on the LinkedIn home page
 * @throws Error if unable to open the post creation modal
 */
export const clickOnPostModal = async (
  networkHelper: NetworkHelper,
  page: Page,
) => {
  console.log("Locating 'Start a post' button...");
  await networkHelper.retryWithBackoff(async () => {
    // Find the "Start a post" button
    const startPostButton = page.getByRole("button", {
      name: "Start a post",
    });
    // Wait for the button to be visible
    await startPostButton.waitFor({
      state: "visible",
      timeout: NETWORK_TIMEOUT,
    });
    console.log("'Start a post' button located and visible.");
  });
  // Take a screenshot before clicking the button
  await networkHelper.takeScreenshot(
    page,
    "linkedin",
    "1-before-clicking-start-post",
  );

  console.log("Clicking 'Start a post' button...");
  await networkHelper.retryWithBackoff(async () => {
    // Click the "Start a post" button
    await page.getByRole("button", { name: "Start a post" }).click();
    // Wait for the page to load after clicking
    await networkHelper.waitForPageLoad(page);
    console.log("'Start a post' button clicked successfully.");
  });
  // Take a screenshot after clicking the button
  await networkHelper.takeScreenshot(
    page,
    "linkedin",
    "2-after-clicking-start-post",
  );

  console.log("Waiting for post creation modal...");
  await networkHelper.retryWithBackoff(async () => {
    // Wait for the post creation modal to appear
    await page.waitForSelector('div[role="dialog"]', {
      state: "visible",
      timeout: NETWORK_TIMEOUT,
    });
    // Wait for all network activity to settle
    await networkHelper.waitForNetworkIdle(page);
    console.log("Post creation modal is visible.");
  });
  // Take a screenshot of the post creation modal
  await networkHelper.takeScreenshot(page, "linkedin", "3-post-creation-modal");
};

/**
 * Writes the content of a post in the LinkedIn post creation modal.
 * @param networkHelper - Helper object for network-related operations
 * @param postContent - The content to be written in the post
 * @param page - Playwright Page object. The page must be on the LinkedIn post creation modal
 * @throws Error if unable to write the post content
 */
export const writePostContent = async (
  networkHelper: NetworkHelper,
  postContent: string,
  page: Page,
) => {
  console.log("Locating and interacting with text editor...");

  await networkHelper.retryWithBackoff(async () => {
    // Find the text editor in the post creation modal
    const textEditor = page.getByRole("textbox", {
      name: "Text editor for creating",
    });
    // Wait for the text editor to be visible
    await textEditor.waitFor({ state: "visible", timeout: NETWORK_TIMEOUT });
    // Fill the text editor with the post content
    await textEditor.fill(postContent);
    // Wait for all network activity to settle
    await networkHelper.waitForNetworkIdle(page);
    console.log("Post content written successfully.");
  });
  // Take a screenshot after writing the post content
  await networkHelper.takeScreenshot(page, "linkedin", "4-after-writing-post");
};

/**
 * Clicks the 'Post' button to publish the LinkedIn post.
 * @param networkHelper - Helper object for network-related operations
 * @param page - Playwright Page object. The page must be on the LinkedIn post creation modal and the text must be filled
 * @throws Error if unable to click the 'Post' button or confirm post creation
 */
export const clickPostButton = async (
  networkHelper: NetworkHelper,
  page: Page,
) => {
  console.log("Locating and clicking 'Post' button...");
  await networkHelper.retryWithBackoff(async () => {
    // Find the 'Post' button
    const postButton = page.getByRole("button", {
      name: "Post",
      exact: true,
    });
    // Wait for the 'Post' button to be visible
    await postButton.waitFor({ state: "visible", timeout: NETWORK_TIMEOUT });
    // Click the 'Post' button
    await postButton.click();
    console.log("'Post' button clicked successfully.");
  });
  // Take a screenshot after clicking the 'Post' button
  await networkHelper.takeScreenshot(page, "linkedin", "5-after-clicking-post");

  console.log("Waiting for post confirmation...");
  // Wait for either network idle, post success message, or page load
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
  // Take a final screenshot after posting
  await networkHelper.takeScreenshot(page, "linkedin", "6-after-posting");
};

/**
 * Navigates to the user's own LinkedIn profile page.
 * @param networkHelper - Helper object for network-related operations
 * @param page - Playwright Page object. The page must be on the LinkedIn home page
 * @throws Error if unable to navigate to the profile page
 */
export const navigateToProfile = async (
  networkHelper: NetworkHelper,
  page: Page,
) => {
  // Wait for all network activity to settle
  await networkHelper.waitForNetworkIdle(page);

  await networkHelper.retryWithBackoff(async () => {
    // Click on the user's profile photo in the navigation bar
    await page.click(".global-nav__me-photo");
  });

  await networkHelper.retryWithBackoff(async () => {
    // Click on the "View Profile" link in the dropdown menu
    await page.click('//a[text()="View Profile"]');
  });
  // Wait for the profile page to load
  await networkHelper.waitForPageLoad(page);
};

/**
 * Reads and extracts information about the user's LinkedIn connections from the connections page.
 * @param networkHelper - Helper object for network-related operations
 * @param page - Playwright Page object. The page must be on the LinkedIn connections page
 * @returns An array of LinkedInConnection objects containing connection information
 * @throws Error if unable to read connection information
 */
export const readContactsFromConnectionPage = async (
  networkHelper: NetworkHelper,
  page: Page,
): Promise<LinkedInConnection[]> => {
  // Wait for all network activity to settle
  await networkHelper.waitForNetworkIdle(page);
  // Extract connection information from the page
  return await page.$$eval(".mn-connection-card", (cards) =>
    cards.map((card) => ({
      name:
        card.querySelector(".mn-connection-card__name")?.textContent?.trim() ||
        "",
      title:
        card
          .querySelector(".mn-connection-card__occupation")
          ?.textContent?.trim() || "",
      profileUrl: card.querySelector(".mn-connection-card__link")?.href || "",
    })),
  );
};

/**
 * Navigates to the user's LinkedIn connections page.
 * @param networkHelper - Helper object for network-related operations
 * @param page - Playwright Page object. The page must be on a profile page
 * @throws Error if unable to navigate to the connections page
 */
export const navigateToConnections = async (
  networkHelper: NetworkHelper,
  page: Page,
) => {
  console.log("Trying to get connections");
  await networkHelper.retryWithBackoff(async () => {
    // Wait for the connections link to be visible
    await networkHelper.waitForSelector(
      page,
      'a[href*="/mynetwork/invite-connect/connections/"]',
      "visible",
    );
    // Find the connections link
    const connectionsLink = await page.waitForSelector(
      'a[href*="/mynetwork/invite-connect/connections/"]',
      { state: "visible" },
    );
    // Click on the connections link
    await connectionsLink.click();
    console.log("Clicked on connections link");
    // Wait for the connections page to load
    await networkHelper.waitForPageLoad(page);
  });
  // Wait again for the page to fully load (ensuring all dynamic content is loaded)
  await networkHelper.waitForPageLoad(page);
};

export default {
  createPost,
  getConnections,
  followCompanyPage,
  sendMessage,
  getUserInfo,
  sendConnectionRequest,
  sendMessageOnProfilePage,
  clickFirstResultOnSearchPage,
  searchOnHomePage,
  clickConnectButtonOnPersonPage,
  fulfillConnectionRequestOnConnectionModal,
  readProfileIntroOnPersonPage,
  readContactInfoOnContactModal,
  readContactsFromConnectionPage,
  withContactInfoModal,
  followCompanyOnCompanyPage,
  clickOnPostModal,
  writePostContent,
  clickPostButton,
  navigateToProfile,
  navigateToConnections,
};
