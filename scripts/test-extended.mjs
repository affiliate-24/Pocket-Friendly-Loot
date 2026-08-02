import { chromium } from "playwright";
const browser = await chromium.launch();
const failures = [];
const check = (label, cond, d = "") => {
  console.log(`${cond ? "PASS" : "FAIL"}  ${label}${d ? ` — ${d}` : ""}`);
  if (!cond) failures.push(label);
};

/* A. Network audit: track every request on JS-enabled loads */
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const googleRequests = [];
page.on("request", (req) => {
  const u = req.url();
  if (u.includes("docs.google.com") || u.includes("spreadsheets.google.com") || u.includes("googleusercontent")) googleRequests.push(u);
});

for (const p of ["/index.html", "/todays-deals.html", "/blogs.html", "/search.html?q=earbuds", "/saved.html"]) {
  await page.goto("http://localhost:8080" + p, { waitUntil: "load" });
  await page.waitForTimeout(700);
}
check("zero Google/Sheets requests on 5 JS-enabled loads", googleRequests.length === 0, `${googleRequests.length} requests`);

/* B. Pre-rendered content with JavaScript fully disabled */
const noJsCtx = await browser.newContext({ javaScriptEnabled: false });
const noJsPage = await noJsCtx.newPage({ viewport: { width: 1280, height: 800 } });
await noJsPage.goto("http://localhost:8080/index.html", { waitUntil: "load" });
check("no-JS: home deals grid has cards", (await noJsPage.locator("#home-deals-grid .card").count()) > 0);
check("no-JS: home categories have cards", (await noJsPage.locator("#home-categories-grid .category-card").count()) >= 4);
check("no-JS: blogs listing has teasers", (await noJsPage.locator("#home-blogs-preview .teaser-card").count()) > 0);
await noJsPage.goto("http://localhost:8080/todays-deals.html", { waitUntil: "load" });
check("no-JS: todays deals grid has cards", (await noJsPage.locator("#deals-grid .card").count()) > 0);
await noJsPage.goto("http://localhost:8080/best-products.html", { waitUntil: "load" });
check("no-JS: best-products guide cards present", (await noJsPage.locator("#guides-listing .guide-card").count()) > 0);

/* C. Mobile viewport: nav, search toggle, grids */
const mob = await browser.newPage({ viewport: { width: 390, height: 844 } });
await mob.goto("http://localhost:8080/index.html", { waitUntil: "load" });
await mob.waitForTimeout(700);
check("mobile: deals grid renders", (await mob.locator("#home-deals-grid .card").count()) > 0);
check("mobile: mobile search toggle visible", await mob.locator(".nav-search-toggle").isVisible());
await mob.locator(".nav-search-toggle").click();
check("mobile: search bar opens", await mob.locator("#mobile-search-bar").isVisible());
await mob.locator("#mobile-search-bar input").fill("earbud");
check("mobile: search bar accepts input", (await mob.locator("#mobile-search-bar input").inputValue()) === "earbud");
await mob.locator(".nav-toggle").click();
check("mobile: hamburger menu opens", await mob.locator("#mobile-menu").isVisible());

console.log(failures.length ? `\n${failures.length} FAILURE(S)` : "\nALL EXTENDED TESTS PASSED");
await browser.close();
process.exitCode = failures.length ? 1 : 0;
