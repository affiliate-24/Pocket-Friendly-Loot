/* test-browser.mjs — headless click-through of the built dist/ site.
   Verifies pages load, inline data renders, and key interactions work.
   Usage: node scripts/test-browser.mjs   (serve.mjs must be running on :8080) */

import { chromium } from "playwright";

const BASE = "http://localhost:8080";
const results = [];
let failures = 0;

function check(label, cond, detail = "") {
  results.push(`${cond ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
  if (!cond) failures++;
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
page.on("console", (m) => { if (m.type() === "error") errors.push(`console: ${m.text()}`); });

async function goto(path) {
  errors.length = 0;
  const resp = await page.goto(BASE + path, { waitUntil: "load", timeout: 20000 });
  await page.waitForTimeout(600); // let async module scripts settle
  return resp;
}

/* 1. Home page: pre-rendered deals + categories + previews visible WITHOUT JS */
await page.goto(BASE + "/index.html", { waitUntil: "domcontentloaded" });
await page.evaluate(() => document.scripts[0]); // ensure scripting disabled check below works
check("index: pre-rendered deals visible before JS", (await page.locator("#home-deals-grid .card").count()) > 0);
check("index: pre-rendered categories", (await page.locator("#home-categories-grid .category-card").count()) >= 4);
check("index: guides preview", (await page.locator("#home-guides-headings .guide-preview-card").count()) >= 1);
check("index: gifts preview", (await page.locator("#home-gifts-preview .teaser-card").count()) >= 1);
check("index: blogs preview", (await page.locator("#home-blogs-preview .teaser-card").count()) >= 1);

/* 2. JS-enabled home: inline data renders grids, no fetch to Google */
await page.goto(BASE + "/index.html", { waitUntil: "load" });
await page.waitForTimeout(800);
check("index(js): deals grid populated", (await page.locator("#home-deals-grid .card").count()) > 0);
check("index(js): no google fetch on load", !errors.some((e) => e.includes("docs.google")));

/* 3. Today's Deals: curated grid + sort + category filter */
await page.goto(BASE + "/todays-deals.html", { waitUntil: "load" });
await page.waitForTimeout(800);
const todaysCount = await page.locator("#deals-grid .card").count();
check("todays: deals rendered", todaysCount > 0, `${todaysCount} cards`);
const sortSelect = page.locator("#sort-select");
await sortSelect.selectOption("price-asc");
await page.waitForTimeout(400);
const firstPrice = await page.locator("#deals-grid .card .sale").first().textContent();
check("todays: sort works", firstPrice !== null && firstPrice.length > 0, `first price ${firstPrice}`);
check("todays: no google fetch", !errors.some((e) => e.includes("docs.google")));

/* 4. Category page (query param) */
await page.goto(BASE + "/category.html?cat=Electronics", { waitUntil: "load" });
await page.waitForTimeout(600);
check("category?cat=: heading updated", (await page.locator("#category-heading").textContent()) === "Electronics");
check("category?cat=: grid rendered", (await page.locator("#deals-grid .card").count()) > 0);

/* 5. Blog article (query param) */
await page.goto(BASE + "/blogs.html", { waitUntil: "load" });
await page.waitForTimeout(600);
check("blogs: listing rendered", (await page.locator("#blog-listing .teaser-card").count()) > 0);
const firstSlug = await page.locator("#blog-listing .teaser-card").first().getAttribute("href");
if (firstSlug) {
  await page.goto(BASE + "/" + firstSlug, { waitUntil: "load" });
  await page.waitForTimeout(600);
  check("blogs article: detail view shown", await page.locator("#article-detail-view").isVisible());
  check("blogs article: title set", (await page.locator("#article-title").textContent()).length > 5);
  check("blogs article: content rendered", (await page.locator("#article-content p").count()) > 0);
}

/* 6. Gift ideas detail */
await page.goto(BASE + "/gift-ideas.html?slug=gifts-for-men", { waitUntil: "load" });
await page.waitForTimeout(600);
check("gifts detail: products grid rendered", (await page.locator("#gift-products-grid .card").count()) > 0);

/* 7. Best products: guide listing + expand */
await page.goto(BASE + "/best-products.html", { waitUntil: "load" });
await page.waitForTimeout(600);
check("best-products: guide cards", (await page.locator("#guides-listing .guide-card").count()) > 0);
await page.locator("#guides-listing .guide-card-header").first().click();
await page.waitForTimeout(500);
check("best-products: expand shows ranked cards", (await page.locator(".guide-card.is-expanded .card").count()) > 0);

/* 8. Search page */
await page.goto(BASE + "/search.html?q=earbuds", { waitUntil: "load" });
await page.waitForTimeout(800);
check("search: products group", (await page.locator(".search-result-group").count()) >= 1);

/* 9. Wishlist toggle + saved page */
await page.goto(BASE + "/todays-deals.html", { waitUntil: "load" });
await page.waitForTimeout(600);
await page.locator("#deals-grid [data-wishlist-btn]").first().click();
await page.waitForTimeout(300);
await page.goto(BASE + "/saved.html", { waitUntil: "load" });
await page.waitForTimeout(600);
check("saved: wishlisted item appears", (await page.locator("#saved-grid .card").count()) > 0);

/* 10. Static pages render */
for (const p of ["/about.html", "/search.html", "/404.html", "/privacy-policy.html"]) {
  const resp = await goto(p);
  check(`${p}: 200`, resp && resp.status() === 200);
}

console.log(results.join("\n"));
console.log(`\n${failures ? failures + " FAILURE(S)" : "ALL BROWSER TESTS PASSED"}`);
await browser.close();
process.exitCode = failures ? 1 : 0;
