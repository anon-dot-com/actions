# API Documentation

## Summary

| Function Name | Feature |
|---------------|----------|
| `sendMessage` | Sends a direct message to a specified recipient on Instagram |
| `navigateToDirectInbox` | Navigates to the Instagram Direct Inbox |
| `closeNotificationModal` | Handles the notification modal if it appears |
| `selectRecipientOnDirectMessage` | Opens up a new message modal and selects a recipient |
| `sendMessageOnMessageModal` | Sends a message to the selected recipient |
| `waitForMessageSent` |  |

## Detailed Documentation

### sendMessage

Sends a direct message to a specified recipient on Instagram.

**Type:** `(networkHelper: NetworkHelper, recipient: string, message: string) => (page: Page) => Promise<void>`

#### Parameters

- `networkHelper` (`NetworkHelper`): - Helper object for network-related operations
- `recipient` (`string`): - The username of the message recipient - This user will be on the home page
- `message` (`string`): - The content of the message to be sent

---

### navigateToDirectInbox

Navigates to the Instagram Direct Inbox.

**Type:** `(page: Page, networkHelper: NetworkHelper) => Promise<void>`

#### Parameters

- `page` (`Page`): - Playwright Page object. This action should be able to run on any page
- `networkHelper` (`NetworkHelper`): - Helper object for network-related operations

---

### closeNotificationModal

Handles the notification modal if it appears.

**Type:** `(page: Page, networkHelper: NetworkHelper) => Promise<void>`

#### Parameters

- `page` (`Page`): - Playwright Page object. This action should be able to run on any page
- `networkHelper` (`NetworkHelper`): - Helper object for network-related operations

---

### selectRecipientOnDirectMessage

Opens up a new message modal and selects a recipient.

**Type:** `(page: Page, networkHelper: NetworkHelper, recipient: string) => Promise<void>`

#### Parameters

- `page` (`Page`): - Playwright Page object. The page should be on the Direct Inbox page
- `networkHelper` (`NetworkHelper`): - Helper object for network-related operations
- `recipient` (`string`): - The username of the message recipient

---

### sendMessageOnMessageModal

Sends a message to the selected recipient.

**Type:** `(page: Page, networkHelper: NetworkHelper, message: string) => Promise<void>`

#### Parameters

- `page` (`Page`): - Playwright Page object. This assumes that the page is on the direct message inbox page with the message modal open.
- `networkHelper` (`NetworkHelper`): - Helper object for network-related operations
- `message` (`string`): - The content of the message to be sent

---

### waitForMessageSent



**Type:** `(page: Page, networkHelper: NetworkHelper) => Promise<void>`

#### Parameters

- `page` (`Page`): 
- `networkHelper` (`NetworkHelper`): 

---

