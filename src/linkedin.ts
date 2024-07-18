import { Page } from "playwright";
import { NetworkHelper } from "./networkHelper"; // Adjust the import path as needed

const NETWORK_TIMEOUT = 5000;

type LinkedInSearchQueryType = "People" | "Companies";

interface LinkedInConnection {
  name: string;
  title: string;
  profileUrl: string;
}

type LinkedInFollowResult =
  | { type: "Success" }
  | { type: "No Effect" }
  | { type: "Error"; description?: string };

export const runCreateLinkedinPost =
  (networkHelper: NetworkHelper, postContent: string) => async (page: Page) => {
    await networkHelper.waitForNetworkIdle(page);
    await clickingOnPostModal(networkHelper, page);
    await writePostContent(networkHelper, postContent, page);
    await clickPostButtonAndWait(networkHelper, page);
  };

export const runGettingLinkedinConnections =
  (networkHelper: NetworkHelper) => async (page: Page) => {
    await navigateToProfile(networkHelper, page);
    await goToConnections(networkHelper, page);
    return await extractConnections(networkHelper, page);
  };

export const runFollowLinkedinPage =
  (networkHelper: NetworkHelper, companyName: string) =>
  async (page: Page): Promise<LinkedInFollowResult> => {
    try {
      await search(page, networkHelper, companyName);
      await clickFirstResult("Companies", page, networkHelper);
      await networkHelper.waitForNetworkIdle(page);
      return await followCompany(page, companyName, networkHelper);
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

// NOTE: This would only work if you are connected with this Person on Linkedin and you previously messaged them before
export const runSendLinkedinMessage =
  (
    networkHelper: NetworkHelper,
    { recipient, message }: { recipient: string; message: string },
  ) =>
  async (page: Page) => {
    await search(page, networkHelper, recipient);
    await clickFirstResult("People", page, networkHelper);
    await handleSendingMessageOnProfile(networkHelper, page, message);
  };

export const runGetUserInfo =
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

// NOTE: This would only work if you are not connected with the person and you are second degree connections with them
export const runSendConnectionRequest =
  (networkHelper: NetworkHelper, personName: string, message?: string) =>
  async (page: Page) => {
    try {
      await search(page, networkHelper, personName);
      await clickFirstResult("People", page, networkHelper);
      await clickConnectButton(page, networkHelper);
      await handleConnectionModal(page, networkHelper, personName, message);
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

const handleSendingMessageOnProfile = async (
  networkHelper: NetworkHelper,
  page: Page,
  message: string,
) => {
  try {
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
    await page.waitForSelector('button.msg-form__send-btn[type="submit"]');
    await page.click('button.msg-form__send-btn[type="submit"]');

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

const clickConnectButton = async (page: Page, networkHelper: NetworkHelper) => {
  await networkHelper.waitForPageLoad(page);
  console.log("Trying to find Connect Button");
  await page.click(
    'button.pvs-profile-actions__action.artdeco-button[aria-label^="Invite"][aria-label$="to connect"]',
  );
  console.log("Clicked button");
};

const handleConnectionModal = async (
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

async function followCompany(
  page: Page,
  companyName: string,
  networkHelper: NetworkHelper,
): Promise<LinkedInFollowResult> {
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

const clickingOnPostModal = async (
  networkHelper: NetworkHelper,
  page: Page,
) => {
  console.log("Locating 'Start a post' button...");
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
    "1-before-clicking-start-post",
  );

  console.log("Clicking 'Start a post' button...");
  await networkHelper.retryWithBackoff(async () => {
    await page.getByRole("button", { name: "Start a post" }).click();
    await networkHelper.waitForPageLoad(page);
    console.log("'Start a post' button clicked successfully.");
  });
  await networkHelper.takeScreenshot(
    page,
    "linkedin",
    "2-after-clicking-start-post",
  );

  console.log("Waiting for post creation modal...");
  await networkHelper.retryWithBackoff(async () => {
    await page.waitForSelector('div[role="dialog"]', {
      state: "visible",
      timeout: NETWORK_TIMEOUT,
    });
    await networkHelper.waitForNetworkIdle(page);
    console.log("Post creation modal is visible.");
  });
  await networkHelper.takeScreenshot(page, "linkedin", "3-post-creation-modal");
};

const writePostContent = async (
  networkHelper: NetworkHelper,
  postContent: string,
  page: Page,
) => {
  console.log("Locating and interacting with text editor...");

  await networkHelper.retryWithBackoff(async () => {
    const textEditor = page.getByRole("textbox", {
      name: "Text editor for creating",
    });
    await textEditor.waitFor({ state: "visible", timeout: NETWORK_TIMEOUT });
    await textEditor.fill(postContent);
    await networkHelper.waitForNetworkIdle(page);
    console.log("Post content written successfully.");
  });
  await networkHelper.takeScreenshot(page, "linkedin", "4-after-writing-post");
};

const clickPostButtonAndWait = async (
  networkHelper: NetworkHelper,
  page: Page,
) => {
  console.log("Locating and clicking 'Post' button...");
  await networkHelper.retryWithBackoff(async () => {
    const postButton = page.getByRole("button", {
      name: "Post",
      exact: true,
    });
    await postButton.waitFor({ state: "visible", timeout: NETWORK_TIMEOUT });
    await postButton.click();
    console.log("'Post' button clicked successfully.");
  });
  await networkHelper.takeScreenshot(page, "linkedin", "5-after-clicking-post");

  console.log("Waiting for post confirmation...");
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
  await networkHelper.takeScreenshot(page, "linkedin", "6-after-posting");
};

const navigateToProfile = async (networkHelper: NetworkHelper, page: Page) => {
  await networkHelper.waitForNetworkIdle(page);

  await networkHelper.retryWithBackoff(async () => {
    await page.click(".global-nav__me-photo");
  });

  await networkHelper.retryWithBackoff(async () => {
    await page.click('//a[text()="View Profile"]');
  });
  await networkHelper.waitForPageLoad(page);
};

// Function to extract connections from the current page
const extractConnections = async (
  networkHelper: NetworkHelper,
  page: Page,
): Promise<LinkedInConnection[]> => {
  await networkHelper.waitForNetworkIdle(page);
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

const goToConnections = async (networkHelper: NetworkHelper, page: Page) => {
  // Click on <a> "connections"
  console.log("Trying to get connections");
  await networkHelper.retryWithBackoff(async () => {
    await networkHelper.waitForSelector(
      page,
      'a[href*="/mynetwork/invite-connect/connections/"]',
      "visible",
    );
    const connectionsLink = await page.waitForSelector(
      'a[href*="/mynetwork/invite-connect/connections/"]',
      { state: "visible" },
    );
    await connectionsLink.click();
    console.log("Clicked on connections link");
    await networkHelper.waitForPageLoad(page);
  });
  await networkHelper.waitForPageLoad(page);
};
