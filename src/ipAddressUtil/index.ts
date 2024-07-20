import { Page } from "playwright";

/**
 * Represents the structure of the location data returned by the IP address lookup service.
 */
export type LocationData = {
  /** The country where the IP address is located */
  country: string;
  /** Autonomous System Number information */
  asn: {
    /** The ASN number */
    asnum: number;
    /** The organization name associated with the ASN */
    org_name: string;
  };
  /** Geographical information */
  geo: {
    city: string;
    region: string;
    region_name: string;
    postal_code: string;
    latitude: number;
    longitude: number;
    tz: string;
    lum_city: string;
    lum_region: string;
  };
};

/**
 * Retrieves the user's IP address and associated location data.
 *
 * This function navigates to a specific URL that returns JSON data containing
 * information about the user's IP address and geographical location. It then
 * parses this data and returns it as a LocationData object.
 *
 * @param page - The Playwright Page object to use for navigation
 * @returns A Promise that resolves to a LocationData object containing the IP and location information
 * @throws Will throw an error if the page doesn't contain any text or if the JSON parsing fails
 */
export const runGetUserIpAddress = async (
  page: Page,
): Promise<LocationData> => {
  // Navigate to the IP address lookup service
  await page.goto("https://lumtest.com/myip.json");

  // Wait for the page to finish loading
  await page.mainFrame().waitForLoadState();

  // Extract the text content from the page body
  const text = await page.textContent("body");

  // Check if text content was successfully retrieved
  if (!text) {
    throw new Error("No text found on page");
  }

  // Parse the JSON text and return the resulting object
  return JSON.parse(text);
};

export default { runGetUserIpAddress };
