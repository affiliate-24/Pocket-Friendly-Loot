import { chromium } from "playwright";
const browser = await chromium.launch();
const failures = [];
const check = (label, cond, d = "") => {
  console.log(`${cond ? "PASS" : "FAIL"}  ${label}${d ? ` — ${d}` : ""}`);
  if (!cond) failures.push(label);
};

const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
let errors = [];
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });

/* Trending: sort + category filter */
await page.goto("http://localhost:8080/trending-deals.html", { waitUntil: "load" });
await page.waitForTimeout(800);
const tCount = await page.locator("#deals-grid .card").count();
check("trending: deals rendered", tCount > 0, `${tCount} cards`);
await page.locator("#sort-select").selectOption("discount-desc");
await page.waitForTimeout(500);
check("trending: sort works", (await page.locator("#deals-grid .card").count()) > 0);
const catOptions = await page.locator("#category-select option").count();
check("trending: category dropdown populated", catOptions > 1, `${catOptions} options`);

/* Todays: category filter narrows the grid */
await page.goto("http://localhost:8080/todays-deals.html", { waitUntil: "load" });
await page.waitForTimeout(700);
const before = await page.locator("#deals-grid .card").count();
await page.locator("#category-select").selectOption({ index: 1 });
await page.waitForTimeout(600);
const after = await page.locator("#deals-grid .card").count();
check("todays: category filter narrows", after < before || after === 0, `${before} -> ${after}`);

/* Search empty state + results page */
await page.goto("http://localhost:8080/search.html", { waitUntil: "load" });
await page.waitForTimeout(500);
check("search (no q): no crash", (await page.locator("#search-results").count()) === 1);
await page.goto("http://localhost:8080/search.html?q=zzzznomatch", { waitUntil: "load" });
await page.waitForTimeout(800);
const emptyText = await page.locator("#search-results").textContent();
check("search (no match): empty state shown", emptyText.includes("No results"));

/* Blogs article with recommended products */
await page.goto("http://localhost:8080/blogs.html?slug=3-step-pricing-audit-before-buying-online", { waitUntil: "load" });
await page.waitForTimeout(800);
const recCount = await page.locator("#recommended-products .card").count();
check("blogs article: recommended products render", recCount > 0, `${recCount} cards`);

/* Best products article detail (?slug=) */
await page.goto("http://localhost:8080/best-products.html?slug=best-earbuds-2000", { waitUntil: "load" });
await page.waitForTimeout(800);
check("best-products article: rank list renders", (await page.locator("#guide-rank-list .rank-row").count()) > 0);

/* All static pages: 200 + zero console errors */
const staticPages = ["about", "contact", "terms", "privacy-policy", "affiliate-disclosure", "install_bookmarklet", "404", "saved"];
for (const p of staticPages) {
  errors = [];
  const resp = await page.goto(`http://localhost:8080/${p}.html`, { waitUntil: "load" });
  await page.waitForTimeout(500);
  const errs = errors.filter((e) => !e.includes("favicon") && !e.includes("net::ERR") && !e.includes("404"));
  check(`${p}.html: 200 + clean`, resp.status() === 200 && errs.length === 0, errs.join(" | "));
}

/* Payload size snapshot */
const sizes = [];
for (const p of ["index", "todays-deals", "blogs", "about"]) {
  const r = await page.goto(`http://localhost:8080/${p}.html`, { waitUntil: "load" });
  sizes.push(`${p}=${r.headers()["content-length"] || "?"}`);
}
console.log("sizes:", sizes.join(" "));

console.log(failures.length ? `\n${failures.length} FAILURE(S)` : "\nALL ROUND-2 TESTS PASSED");
await browser.close();
process.exitCode = failures.length ? 1 : 0;
