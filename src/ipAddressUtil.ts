import { Page } from "playwright";

type LocationData = {
  country: string;
  asn: {
    asnum: number;
    org_name: string;
  };
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

export const runGetUserIpAddress = async (
  page: Page,
): Promise<LocationData> => {
  await page.goto("https://lumtest.com/myip.json");
  await page.mainFrame().waitForLoadState();
  const text = await page.textContent("body");
  if (!text) {
    throw new Error("No text found on page");
  }
  return JSON.parse(text);
};
