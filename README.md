# Anon Web Automation Library

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

#### LinkedIn

| Feature                   | Function Name           |
|---------------------------|-------------------------|
| Create a post             | `createPost`            |
| Get connections           | `getConnections`        |
| Follow a company          | `followCompanyPage`     |
| Send a message            | `sendMessage`           |
| Get user info             | `getUserInfo`           |
| Send connection request   | `sendConnectionRequest` |

#### Amazon

| Feature           | Function Name |
|-------------------|---------------|
| Get all orders    | `getAllOrders`|
| Search for an item| `searchItem`  |

#### Instagram

| Feature              | Function Name |
|----------------------|---------------|
| Send a direct message| `sendMessage` |

## Why Use This Library?

1. **Rapid Development**: These pre-built actions allow you to quickly implement complex web interactions in your AI
agents or applications.
2. **Real-World Examples**: See how Anon can be used to interact with popular platforms, providing a blueprint for your
own custom integrations.
3. **Extensible Foundation**: Use these scripts as a starting point to build more complex, AI-driven workflows and
applications.

## Prerequisites

- Anon SDK (including necessary credentials and setup)
- Node.js (version X.X.X or higher)
- Playwright

## Installation

To use the Anon example library, you would need to run the following actions

```bash
npm install @anon/actions
```

## Usage

Here's how you can use these actions to quickly build interactive AI agents or automated workflows:

```javascript
import {
  NetworkHelper,
  runCreateLinkedinPost
} from "@anon/actions";
import {
  Client,
  executeRuntimeScript,
  setupAnonBrowserWithContext,
} from "@anon/sdk-typescript";
import { Page } from "playwright";

console.log(
`Setting up browser script for ${account.app} session for app user id ${APP_USER_ID}`,
);
const { browserContext } = await setupAnonBrowserWithContext(
    client,
    account,
    { type: "local", input: { headless: false } },
);

const message = `This post was constructed with the Anon SDK! Integrate your AI apps to the real world using Anon. Come
check out https://www.anon.com/`
const result = await executeRuntimeScript({
    client,
    account,
    target: { browserContext: browserContext },
    initialUrl: "https://www.linkedin.com",
    run: runCreateLinkedinPost(new NetworkHelper(1000), message),
});
```

These examples demonstrate how you can quickly build interactive AI agents that perform actions on LinkedIn and Amazon
using Anon and this library.

## Building on Top of This Library

You can extend these actions to create more complex AI-driven applications. Some ideas:

1. A LinkedIn networking assistant that automatically engages with relevant connections
2. An Amazon price tracking and automatic purchasing agent
3. A cross-platform social media manager
4. An automated job application system using LinkedIn

The possibilities are endless with Anon and these pre-built actions!

Are you interested? Fill out [this survey]([https://anondotcom.typeform.com/request-access).
