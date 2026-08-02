import { chromium } from "playwright";

const url = "http://localhost:8080/install_bookmarklet.html";
const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message));
page.on("dialog", async (d) => {
  console.log("DIALOG:", JSON.stringify(d.message().slice(0, 80)));
  await d.dismiss();
});

await page.goto(url, { waitUntil: "load" });
console.log("errors on load:", errors.length ? errors.join(" | ") : "NONE");

const href0 = await page.evaluate(() => document.getElementById("bmLink").href);
console.log("href starts with javascript:", href0.startsWith("javascript:"));
const code0 = decodeURIComponent(href0.slice("javascript:".length));
try {
  new Function(code0);
  console.log("bookmarklet code PARSES OK, length:", code0.length);
} catch (e) {
  console.log("BOOKMARKLET PARSE ERROR:", e.message);
}

await page.fill("#tagInput", "mytag-21");
const href1 = await page.evaluate(() => document.getElementById("bmLink").href);
const code1 = decodeURIComponent(href1.slice("javascript:".length));
console.log("tag injected:", code1.includes("mytag-21"), "| placeholder gone:", !code1.includes("__TAG__"));

await page.click("#bmLink");
await page.waitForTimeout(500);
console.log("errors after click:", errors.length ? errors.join(" | ") : "NONE");

await browser.close();
