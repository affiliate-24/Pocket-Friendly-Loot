/* ==========================================================================
   utils.js
   Pure, dependency-free helpers shared by every other module. Nothing in
   here touches CONFIG or the DOM beyond simple query helpers — keeps it
   safely importable from anywhere without circular-import risk.
   ========================================================================== */

/** Format a raw number/string as an Indian Rupee amount, e.g. "₹1,299" */
export function formatMoney(value) {
  if (value === undefined || value === null || value === "") return "";
  const clean = String(value).replace(/[^0-9.]/g, "");
  if (!clean) return String(value);
  return "₹" + Number(clean).toLocaleString("en-IN");
}

/** % discount between an original and sale price. Returns null if it can't be computed. */
export function discountPct(original, sale) {
  const o = parseFloat(String(original).replace(/[^0-9.]/g, ""));
  const s = parseFloat(String(sale).replace(/[^0-9.]/g, ""));
  if (!o || !s || o <= 0) return null;
  return Math.round((1 - s / o) * 100);
}

/** Debounce — delays calling fn until `wait` ms after the last call. */
export function debounce(fn, wait = 200) {
  let timer;
  return function debounced(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), wait);
  };
}

/** Querystring shorthands */
export function qs(selector, parent = document) {
  return parent.querySelector(selector);
}
export function qsa(selector, parent = document) {
  return Array.from(parent.querySelectorAll(selector));
}

/** Read a single query-string parameter from the current URL. */
export function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

/** URL-safe slug from any string — used as a fallback if a sheet row has no Slug. */
export function slugify(text) {
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Fetch a published Google Sheet CSV and resolve with an array of row
 * objects (PapaParse's `header:true` mode). Loaded as a global <script>
 * (not an ES module), so `Papa` is available on `window` here.
 */
export function fetchCSV(url) {
  return new Promise((resolve, reject) => {
    if (!url || url.includes("PASTE_YOUR")) {
      reject(new Error("Sheet URL not configured yet — check app.js"));
      return;
    }
    Papa.parse(url, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: (results) => resolve(results.data || []),
      error: (err) => reject(err),
    });
  });
}

/** Find one row in `rows` whose `idField` matches `id` (string-safe compare). */
export function findById(rows, idField, id) {
  return rows.find((r) => String(r[idField] || "").trim() === String(id).trim());
}

/**
 * Look up multiple rows from a comma-separated id list (e.g. a
 * Recommended_Product_SNos cell like "3,7,12"), preserving that order.
 */
export function findByIds(rows, idField, csvIdList) {
  if (!csvIdList) return [];
  const ids = String(csvIdList).split(",").map((s) => s.trim()).filter(Boolean);
  return ids
    .map((id) => findById(rows, idField, id))
    .filter(Boolean);
}

/**
 * Parse the lightweight blog/guide content format described in
 * SCHEMA.md: a blank line starts a new paragraph, a line starting with
 * "## " becomes a subheading (and a table-of-contents entry).
 * Returns { html, toc, wordCount }.
 */
export function parseLiteContent(raw) {
  const text = String(raw || "").replace(/\r\n/g, "\n").trim();
  if (!text) return { html: "", toc: [], wordCount: 0 };

  const blocks = text.split(/\n\s*\n/); // blank line = new block
  const toc = [];
  let wordCount = 0;
  let headingIndex = 0;

  const html = blocks
    .map((block) => {
      const trimmed = block.trim();
      if (trimmed.startsWith("## ")) {
        const headingText = trimmed.slice(3).trim();
        const id = `section-${headingIndex++}-${slugify(headingText)}`;
        toc.push({ id, text: headingText });
        wordCount += headingText.split(/\s+/).filter(Boolean).length;
        return `<h2 id="${id}">${escapeHtml(headingText)}</h2>`;
      }
      wordCount += trimmed.split(/\s+/).filter(Boolean).length;
      return `<p>${escapeHtml(trimmed).replace(/\n/g, "<br>")}</p>`;
    })
    .join("\n");

  return { html, toc, wordCount };
}

/** Reading time in whole minutes, minimum 1, at a standard 200wpm. */
export function calcReadingTime(wordCount, wordsPerMinute = 200) {
  return Math.max(1, Math.round(wordCount / wordsPerMinute));
}

/** Minimal HTML-escaping so sheet content can't accidentally break markup. */
export function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
