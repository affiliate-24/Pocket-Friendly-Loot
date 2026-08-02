/* ==========================================================================
   build.mjs — Build-Time Static Generation (the "lighter pre-render")

   Runs on Netlify's servers (`npm run build`). It:

   1. Copies the existing static site (HTML/CSS/JS/images) into dist/.
   2. Fetches all Google Sheets CSVs ONCE, server-side (no browser involved),
      with retry/backoff/timeout — a flaky sheet can never blank the site.
   3. Embeds the dataset into every page as inline JSON (window.PAGE_DATA),
      so the browser's fetchCSV() resolves instantly with zero network I/O.
   4. Pre-renders each data-driven page's default view (deals grids, blog
      teasers, category cards, guide listings) as plain static HTML, so
      content is visible immediately — even before/without JavaScript.

   The pre-rendered markup is produced by the SAME template functions the
   browser uses (js/templates.js), so build output always matches what the
   client would have rendered.
   ========================================================================== */

import { readFile, writeFile, mkdir, readdir, copyFile, rm, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Papa from "papaparse";

import { CONFIG } from "../js/app.js";
import {
  buildCardHTML,
  buildTeaserCardHTML,
  buildCategoryCardHTML,
  buildGuideCardHTML,
  buildGuidePreviewHTML,
} from "../js/templates.js";
import { resolveCuratedList } from "../js/products.js";
import { groupBySlug } from "../js/guides.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = path.join(ROOT, "dist");

const FETCH_TIMEOUT = 30000;
const FETCH_RETRIES = 3;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ------------------------------ Sheet fetch ------------------------------ */

async function fetchSheetCSV(url) {
  let lastError;
  for (let attempt = 1; attempt <= FETCH_RETRIES; attempt++) {
    try {
      const res = await fetch(url, {
        redirect: "follow",
        signal: AbortSignal.timeout(FETCH_TIMEOUT),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      const rows = Papa.parse(text, { header: true, skipEmptyLines: true }).data;
      return rows || [];
    } catch (err) {
      lastError = err;
      if (attempt < FETCH_RETRIES) {
        console.warn(`  [build] fetch attempt ${attempt} failed for ${url}: ${err.message} — retrying…`);
        await sleep(1000 * attempt);
      }
    }
  }
  throw lastError;
}

async function fetchAllSheets() {
  console.log("[build] Fetching Google Sheets data…");
  const data = {};
  const entries = Object.entries(CONFIG.SHEETS);
  for (const [key, url] of entries) {
    try {
      const rows = await fetchSheetCSV(url);
      data[url] = rows;
      console.log(`  [build] ✓ ${key}: ${rows.length} rows (${url.slice(0, 60)}…)`);
    } catch (err) {
      // A failed sheet must NOT kill the deploy. The page simply skips the
      // pre-render section that needs it, and the browser falls back to the
      // existing live-fetch path for that one URL (fetchCSV keeps working).
      console.warn(`  [build] ✗ ${key} failed after ${FETCH_RETRIES} attempts: ${err.message} — page will fall back to live fetch for this sheet.`);
    }
  }
  return data;
}

/* ------------------------------ File copying ------------------------------ */

async function copyDirRecursive(srcDir, destDir) {
  await mkdir(destDir, { recursive: true });
  const entries = await readdir(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    const src = path.join(srcDir, entry.name);
    const dest = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      await copyDirRecursive(src, dest);
    } else {
      await copyFile(src, dest);
    }
  }
}

async function copySite() {
  console.log("[build] Copying static site into dist/…");
  const htmlFiles = (await readdir(ROOT)).filter((f) => f.endsWith(".html"));
  for (const f of htmlFiles) {
    await copyFile(path.join(ROOT, f), path.join(DIST, f));
  }
  for (const extra of ["robots.txt", "sitemap.xml"]) {
    try {
      await copyFile(path.join(ROOT, extra), path.join(DIST, extra));
    } catch { /* optional files */ }
  }
  for (const dir of ["css", "js", "images", "assets"]) {
    try {
      await copyDirRecursive(path.join(ROOT, dir), path.join(DIST, dir));
    } catch (err) {
      console.warn(`  [build] skip copying ${dir}/: ${err.message}`);
    }
  }
}

/* ------------------------------ Data injection ------------------------------ */

/** Serialize the dataset safely for embedding in a <script> block. */
function serializePageData(data) {
  const json = JSON.stringify(data)
    .replace(/</g, "\\u003c")      // neutralize any "</script>" inside sheet content
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
  return `<script>window.PAGE_DATA=${json};</script>`;
}

/** Inject the inline dataset just before </body>. */
function injectPageData(html, data) {
  const script = serializePageData(data);
  const marker = "</body>";
  const idx = html.lastIndexOf(marker);
  if (idx === -1) return html + "\n" + script + "\n";
  return html.slice(0, idx) + "\n" + script + "\n" + html.slice(idx);
}

/* ------------------------------ Pre-rendering ------------------------------ */

/** Replace `<div ... id="X" ...></div>` (empty container) with content inside. */
function fillContainer(html, id, content) {
  const re = new RegExp(`(<div\\b[^>]*\\bid="${id}"[^>]*>)</div>`);
  return html.replace(re, `$1${content}</div>`);
}

function buildDealCards(deals, count) {
  return deals.slice(0, count).map((d) => buildCardHTML(d)).join("");
}

function buildTeasers(rows, count, hrefFor) {
  return rows.slice(0, count).map((r) => buildTeaserCardHTML(hrefFor(r))).join("");
}

function preRender(data) {
  const deals = data[CONFIG.SHEETS.deals] || [];
  const todays = data[CONFIG.SHEETS.todaysDeals] || [];
  const trending = data[CONFIG.SHEETS.trendingDeals] || [];
  const categories = data[CONFIG.SHEETS.categories] || [];
  const blogs = (data[CONFIG.SHEETS.blogs] || []).slice().sort((a, b) => new Date(b.Published_Date) - new Date(a.Published_Date));
  const guides = groupBySlug(data[CONFIG.SHEETS.bestProducts] || []);
  const gifts = data[CONFIG.SHEETS.giftIdeas] || [];

  const sortedCats = categories.slice().sort((a, b) => (parseFloat(a.Sort_Order) || 0) - (parseFloat(b.Sort_Order) || 0));
  const allProductsCard = `
    <a class="category-card" href="category.html" data-animate>
      <div class="icon" aria-hidden="true">📦</div>
      <h3>All Products</h3>
      <p>Browse every product across all categories.</p>
    </a>`;

  const plans = [
    {
      file: "index.html",
      fills: [
        ["home-deals-grid", buildDealCards(resolveCuratedList(todays, deals), 4)],
        ["home-categories-grid", sortedCats.slice(0, 6).map(buildCategoryCardHTML).join("") + allProductsCard],
        ["home-guides-headings", `<div class="guide-preview">${guides.slice(0, 3).map(buildGuidePreviewHTML).join("")}</div>`],
        ["home-gifts-preview", buildTeasers(gifts, 3, (g) => ({ img: g.Hero_Image_URL ? encodeURI(g.Hero_Image_URL) : "", title: g.Guide_Title || "", desc: g.Description || "", tag: "", href: `gift-ideas.html?slug=${encodeURIComponent(g.Slug || "")}` }))],
        ["home-blogs-preview", buildTeasers(blogs, 3, (b) => ({ img: b.Hero_Image_URL ? encodeURI(b.Hero_Image_URL) : "", title: b.Title || "", desc: b.Excerpt || "", tag: "", href: `blogs.html?slug=${encodeURIComponent(b.Slug || "")}` }))],
      ],
    },
    { file: "todays-deals.html", fills: [["deals-grid", buildDealCards(resolveCuratedList(todays, deals), 12)]] },
    { file: "trending-deals.html", fills: [["deals-grid", buildDealCards(resolveCuratedList(trending, deals), 12)]] },
    { file: "categories.html", fills: [["deals-grid", buildDealCards(deals, 12)]] },
    { file: "category.html", fills: [["deals-grid", buildDealCards(deals, 12)]] },
    {
      file: "blogs.html",
      fills: [["blog-listing", buildTeasers(blogs, blogs.length, (b) => ({ img: b.Hero_Image_URL ? encodeURI(b.Hero_Image_URL) : "", title: b.Title || "", desc: b.Excerpt || "", tag: b.Category || "", href: `blogs.html?slug=${encodeURIComponent(b.Slug || "")}` }))]],
    },
    {
      file: "gift-ideas.html",
      fills: [["gift-listing", buildTeasers(gifts, gifts.length, (g) => ({ img: g.Hero_Image_URL ? encodeURI(g.Hero_Image_URL) : "", title: g.Guide_Title || "", desc: g.Description || "", tag: g.Occasion_Tag || "", href: `gift-ideas.html?slug=${encodeURIComponent(g.Slug || "")}` }))]],
    },
    { file: "best-products.html", fills: [["guides-listing", guides.map(buildGuideCardHTML).join("")]] },
  ];

  return plans;
}

/* ------------------------------ Main ------------------------------ */

async function main() {
  console.log("[build] Starting…");
  await rm(DIST, { recursive: true, force: true });
  await mkdir(DIST, { recursive: true });

  await copySite();
  const data = await fetchAllSheets();

  const htmlFiles = (await readdir(ROOT)).filter((f) => f.endsWith(".html"));
  const preRenderPlans = preRender(data);
  const pageData = {};
  for (const url of Object.keys(data)) pageData[url] = data[url];

  let rendered = 0;
  for (const file of htmlFiles) {
    let html = await readFile(path.join(ROOT, file), "utf8");

    const plan = preRenderPlans.find((p) => p.file === file);
    if (plan) {
      for (const [id, content] of plan.fills) {
        if (content && html.includes(`id="${id}"`)) {
          html = fillContainer(html, id, content);
          rendered++;
        }
      }
    }

    html = injectPageData(html, pageData);
    await writeFile(path.join(DIST, file), html);
  }

  console.log(`[build] Pre-rendered ${rendered} page sections across ${htmlFiles.length} pages.`);
  const totalBytes = Object.values(pageData).reduce((sum, rows) => sum + JSON.stringify(rows).length, 0);
  console.log(`[build] Inline dataset: ~${Math.round(totalBytes / 1024)} KB per page.`);
  console.log("[build] Done. Publish directory: dist/");
}

main().catch((err) => {
  console.error("[build] FAILED:", err);
  process.exitCode = 1;
});
