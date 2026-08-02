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
 *
 * Reliability: Google's CSV endpoints are slow/flaky, so this call
 *  - caches each successful response in localStorage (30 min TTL),
 *  - retries failed downloads with backoff, and
 *  - falls back to the cached copy when a refresh fails but old data exists.
 * Content renders instantly from cache on repeat visits even if the
 * network hiccups.
 */

var SHEET_CACHE_KEY = "mela_sheet_cache_v1";
var SHEET_CACHE_TTL = 30 * 60 * 1000; // 30 minutes
var SHEET_MAX_RETRIES = 3;
var SHEET_TIMEOUT = 15000; // 15 seconds

function readSheetCache() {
  try {
    return JSON.parse(localStorage.getItem(SHEET_CACHE_KEY) || "{}");
  } catch {
    return {};
  }
}

function writeSheetCache(cache) {
  try {
    // Trim to the most recent 30 entries to avoid blowing the quota
    var keys = Object.keys(cache);
    if (keys.length > 30) {
      keys.sort((a, b) => (cache[a].t || 0) - (cache[b].t || 0));
      keys.slice(0, keys.length - 30).forEach((k) => delete cache[k]);
    }
    localStorage.setItem(SHEET_CACHE_KEY, JSON.stringify(cache));
  } catch {
    /* storage full / unavailable — cache is best-effort only */
  }
}

function parseSheetOnce(url) {
  return new Promise((resolve, reject) => {
    Papa.parse(url, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: (results) => resolve(results.data || []),
      error: (err) => reject(err),
    });
  });
}

export function fetchCSV(url) {
  return new Promise((resolve, reject) => {
    if (!url || url.includes("PASTE_YOUR")) {
      reject(new Error("Sheet URL not configured yet — check app.js"));
      return;
    }

    // Build-time pre-render fast path: every page is generated with its
    // dataset embedded as window.PAGE_DATA (keyed by the exact sheet URL),
    // so there is nothing to fetch, cache, or retry — resolve instantly.
    if (typeof window !== "undefined" && window.PAGE_DATA && Array.isArray(window.PAGE_DATA[url])) {
      resolve(window.PAGE_DATA[url]);
      return;
    }

    var cache = readSheetCache();
    var cached = cache[url];

    // Return fresh-enough cache immediately, then refresh in background.
    if (cached && cached.rows && Date.now() - cached.t < SHEET_CACHE_TTL) {
      refreshSheet(url, cache);
      resolve(cached.rows);
      return;
    }

    var attempts = 0;
    var timer;

    function attempt() {
      attempts++;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        fail(new Error("Sheet fetch timed out"));
      }, SHEET_TIMEOUT);

      parseSheetOnce(url).then(
        (rows) => {
          clearTimeout(timer);
          cache[url] = { rows: rows, t: Date.now() };
          writeSheetCache(cache);
          resolve(rows);
        },
        () => {
          clearTimeout(timer);
          if (attempts < SHEET_MAX_RETRIES) {
            setTimeout(attempt, 800 * attempts); // 800ms, 1.6s backoff
          } else {
            fail();
          }
        }
      );
    }

    function fail(_err) {
      clearTimeout(timer);
      // Stale-while-error: serve the last known copy if a refresh fails.
      if (cached && cached.rows) {
        resolve(cached.rows);
        return;
      }
      reject(new Error("Sheet fetch failed"));
    }

    attempt();
  });
}

/** Background refresh: re-fetch a URL and update the cache without blocking the caller. */
function refreshSheet(url, cache) {
  parseSheetOnce(url).then(
    (rows) => {
      cache[url] = { rows: rows, t: Date.now() };
      writeSheetCache(cache);
    },
    () => { /* keep the stale copy until the next successful refresh */ }
  );
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
