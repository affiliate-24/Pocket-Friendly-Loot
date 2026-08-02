import { chromium } from "playwright";
/* Fallback-path test: serve the SOURCE pages (no build, no PAGE_DATA) and
   confirm fetchCSV falls back to live Google fetching, like production did
   before this change. Run serve.mjs on :8090 with "." as the dir first. */
const browser = await chromium.launch();
const page = await browser.newPage();
const googleSeen = [];
page.on("request", (r) => { if (r.url().includes("docs.google.com")) googleSeen.push(r.url()); });
await page.goto("http://localhost:8090/index.html", { waitUntil: "load" });
await page.waitForTimeout(6000);
console.log("google fetches:", googleSeen.length);
console.log("deals cards after fallback fetch:", await page.locator("#home-deals-grid .card").count());
console.log("categories:", await page.locator("#home-categories-grid .category-card").count());
console.log("blogs preview:", await page.locator("#home-blogs-preview .teaser-card").count());
await browser.close();
