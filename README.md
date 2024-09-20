# Anon Actions Library

## Overview

This library showcases the power of Anon in building interactive AI agents that can perform actions on popular websites
like LinkedIn and Amazon. Anon enables developers to access their users' sessions and execute actions on their behalf,
opening up new possibilities for creating intelligent, automated applications.

## What is Anon?

Anon is a groundbreaking platform that allows developers to build interactive AI agents by providing secure access to
users' browser sessions. With Anon, you can:

- Create AI agents that interact with web applications on behalf of users
- Automate complex workflows across multiple websites
- Build innovative applications that leverage existing web platforms

This library demonstrates how Anon can be used to quickly implement common actions on popular websites, serving as a
foundation for more complex AI-driven applications.

## Features

This library provides ready-to-use browser scripts written in [Playwright](https://playwright.dev/) for common actions
on consumer applications, such as LinkedIn and Amazon, showcasing how Anon can be used to build powerful applications
on top of existing web platforms.

### App Actions

#### Amazon

| Function Name | Feature |
|---------------|----------|
| `demoAddHeadphonesToCart` | Automates the process of adding AirPods to the cart on Amazon |
| `getAllOrders` | Retrieves all orders from the Amazon account |
| `searchItem` | Searches for a specified item on Amazon |
| `addItemToCartOnProductPage` | Adds the current item to the cart from the product page |
| `submitCheckoutOnCheckoutPage` | Submits the checkout process on the Amazon checkout page |
| `navigateToCheckoutPage` | Navigates to the checkout page from the current page |
| `navigateToAccountPage` | Navigates to the account page from the current page |
| `navigateToOrdersPage` | Navigates to the orders page from the current page |

#### Instagram

| Function Name | Feature |
|---------------|----------|
| `sendMessage` | Sends a direct message to a specified recipient on Instagram |
| `navigateToDirectInbox` | Navigates to the Instagram Direct Inbox |
| `closeNotificationModal` | Handles the notification modal if it appears |
| `selectRecipientOnDirectMessage` | Opens up a new message modal and selects a recipient |
| `sendMessageOnMessageModal` | Sends a message to the selected recipient |

#### Linkedin

| Function Name | Feature |
|---------------|----------|
| `createPost` | Creates a LinkedIn post |
| `getConnections` | Gets the LinkedIn connections of the currently logged in user |
| `followCompanyPage` | Follows a LinkedIn company page |
| `sendMessage` | Sends a LinkedIn message to a recipient |
| `getUserInfo` | Gets the general information and contact info of a LinkedIn user |
| `sendConnectionRequest` | Sends a LinkedIn connection request to a person |
| `sendMessageOnProfilePage` | Sends a LinkedIn message to a person |
| `clickFirstResultOnSearchPage` | Clicks on the first result of a search page based on the search query type |
| `searchOnHomePage` | Writes a search query  on LinkedIn |
| `readProfileIntroOnPersonPage` | Reads the profile intro of a LinkedIn user |
| `readContactInfoOnContactModal` | Reads the contact info of a LinkedIn user |
| `withContactInfoModal` | Clicks on the connect button on a LinkedIn profile page and runs callback that is designed for that callback |
| `followCompanyOnCompanyPage` | Follows a LinkedIn company page |
| `clickOnPostModal` | Opens the post creation modal on LinkedIn |
| `writePostContent` | Writes the content of a post in the LinkedIn post creation modal |
| `clickPostButton` | Clicks the 'Post' button to publish the LinkedIn post |
| `navigateToProfile` | Navigates to the user's own LinkedIn profile page |
| `readContactsFromConnectionPage` | Reads and extracts information about the user's LinkedIn connections from the connections page |
| `navigateToConnections` | Navigates to the user's LinkedIn connections page |

## Why Use This Library?

1. **Rapid Development**: These pre-built actions allow you to quickly implement complex web interactions in your AI
agents or applications.
2. **Real-World Examples**: See how Anon can be used to interact with popular platforms, providing a blueprint for your
own custom integrations.
3. **Extensible Foundation**: Use these scripts as a starting point to build more complex, AI-driven workflows and
applications.

## Prerequisites

- Anon SDK (including necessary credentials and setup)
- Node.js (version 18.0.0 or higher)
- Playwright

## Installation

The Anon's actions library is currently in private beta. To get access and start building on Anon's platform:

1. Login to the [Anon Console](https://console.anon.com)

2. Install the Anon actions library in your Node.js project:

    ```bash
    npm install @anon/actions \
    --registry=https://npm.cloudsmith.io/anon/anon-sdk/ \
    --//npm.cloudsmith.io/anon/anon-sdk/:_authToken=YQtlU86MhKOXijPS
    ```

You're now ready to use the Anon actions library!

See the "Usage" section below for examples on how to get started
with your first Anon-powered application.

## Usage

Here's how you can use these actions to quickly build interactive AI agents or automated workflows:

```ts
import { LinkedIn, NetworkHelper } from "@anon/actions";
import {
  Client,
  executeRuntimeScript,
  setupAnonBrowserWithContext,
} from "@anon/sdk-typescript";

const APP_USER_ID = process.env.ANON_APP_USER_ID!;
const API_KEY = process.env.ANON_API_KEY!;
const ENV = (process.env.ENV as "local" | "sandbox" | "prod" | "staging") || "sandbox";
const validEnvironments: Array<"local" | "sandbox" | "prod" | "staging"> = ["local", "sandbox", "prod", "staging"];
if (!validEnvironments.includes(ENV)) {
  throw new Error("Invalid env");
}

const account = {
  // check out our list of supported apps here: https://docs.anon.com/docs/getting-started/overview
  // this should align with a session you uploaded with the web-link example
  app: "linkedin",
  // this is the "sub" field of your user's JWTs
  userId: APP_USER_ID,
};

const client = new Client({
  environment: ENV,
  // create a server SdkClient and use its ApiKey
  // for testing, can alternately use an admin member's api key
  apiKey: API_KEY,
});

const main = async () => {
  console.log(
    `Setting up browser script for ${account.app} session for app user id ${APP_USER_ID}`,
  );
  const { browserContext } = await setupAnonBrowserWithContext(
    client,
    account,
    {
      type: "local",
      input: { headless: false, proxy: { isAnonProxyEnabled: true } },
    },
  );

  const networkHelper = new NetworkHelper(10000);

  const message = `This post was constructed with the Anon SDK! Integrate your AI apps to the real world using Anon. 
  Come check out https://www.anon.com/`
  await executeRuntimeScript({
    client,
    account,
    target: { browserContext },
    initialUrl: "https://www.linkedin.com",
    run: LinkedIn.createPost(networkHelper, message),
  });
};

main();
```

In this particular example, we are making a post on LinkedIn.

These examples demonstrate how you can quickly build interactive AI agents that perform actions on LinkedIn and Amazon
using the Anon action library.

## Building on Top of This Library

You can extend these actions to create more complex AI-driven applications. Some ideas:

1. A LinkedIn networking assistant that automatically engages with relevant connections
2. An Amazon price tracking and automatic purchasing agent
3. A cross-platform social media manager
4. An automated job application system using LinkedIn

If you have an idea on how to improve this library or want to contribute your own actions, please see the [CONTRIBUTING.md](CONTRIBUTING.md) guide.

---

Are you interested in learning more? Fill out [this access form]([https://anondotcom.typeform.com/request-access).
