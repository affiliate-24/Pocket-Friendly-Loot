/* ==========================================================================
   search.js
   The Search page's engine: pulls all five content tabs once, builds a
   simple in-memory index, and filters it on page load using ?q= from URL.
   Products are rendered as cards in a 4-per-row grid.
   ========================================================================== */

import { CONFIG } from "./app.js";
import { fetchCSV, qs, formatMoney } from "./utils.js";
import { buildCardHTML, setupCardInteractions } from "./products.js";

export async function buildSearchIndex() {
  const [deals, categories, blogs, bestProducts, giftIdeas] = await Promise.all([
    fetchCSV(CONFIG.SHEETS.deals).catch(() => []),
    fetchCSV(CONFIG.SHEETS.categories).catch(() => []),
    fetchCSV(CONFIG.SHEETS.blogs).catch(() => []),
    fetchCSV(CONFIG.SHEETS.bestProducts).catch(() => []),
    fetchCSV(CONFIG.SHEETS.giftIdeas).catch(() => []),
  ]);
  return { deals, categories, blogs, bestProducts, giftIdeas };
}

function matches(value, term) {
  return String(value || "").toLowerCase().includes(term);
}

export function searchAll(index, rawTerm) {
  const term = rawTerm.trim().toLowerCase();
  if (!term) return null;

  return {
    products: index.deals.filter((d) => matches(d.Product_Name, term)).slice(0, 12),
    categories: index.categories.filter((c) => matches(c.Category_Name, term)),
    blogs: index.blogs.filter((b) => matches(b.Title, term) || matches(b.Excerpt, term)),
    guides: [...new Set(index.bestProducts.filter((g) => matches(g.List_Title, term)).map((g) => g.List_Title))]
      .map((title) => index.bestProducts.find((g) => g.List_Title === title)),
    gifts: index.giftIdeas.filter((g) => matches(g.Guide_Title, term) || matches(g.Description, term)),
  };
}

function rowHTML(title, href, imageUrl, subtitle) {
  return `
    <a class="search-result-row" href="${href}">
      ${imageUrl ? `<img src="${imageUrl}" alt="" loading="lazy">` : ""}
      <div>
        <div>${title}</div>
        ${subtitle ? `<div style="color:var(--color-text-muted);font-size:var(--text-sm)">${subtitle}</div>` : ""}
      </div>
    </a>`;
}

export function renderSearchResults(container, results, term) {
  if (!results) {
    container.innerHTML = `<div class="state-empty"><div class="display">Search products</div><div>Type a keyword in the search bar above.</div></div>`;
    return;
  }

  const totalCount = (results.products?.length || 0) +
    (results.categories?.length || 0) +
    (results.blogs?.length || 0) +
    (results.guides?.length || 0) +
    (results.gifts?.length || 0);

  if (!totalCount) {
    container.innerHTML = `<div class="state-empty"><div class="display">No results for "${term}"</div><div>Try a different search term.</div></div>`;
    return;
  }

  let html = `<div class="search-result-group"><h2>Products</h2><div class="grid">${results.products.map(buildCardHTML).join("")}</div></div>`;

  const otherGroups = [
    { key: "categories", label: "Categories", build: (c) => rowHTML(c.Category_Name, `todays-deals.html?cat=${encodeURIComponent(c.Category_Name)}`, c.Image_URL) },
    { key: "blogs", label: "Blogs", build: (b) => rowHTML(b.Title, `blogs.html?slug=${encodeURIComponent(b.Slug)}`, b.Hero_Image_URL, b.Excerpt) },
    { key: "guides", label: "Best Products guides", build: (g) => rowHTML(g.List_Title, `best-products.html?slug=${encodeURIComponent(g.Slug)}`, "") },
    { key: "gifts", label: "Gift guides", build: (g) => rowHTML(g.Guide_Title, `gift-ideas.html?slug=${encodeURIComponent(g.Slug)}`, g.Hero_Image_URL, g.Description) },
  ];

  html += otherGroups
    .filter((g) => results[g.key]?.length)
    .map((g) => `
      <div class="search-result-group">
        <h2>${g.label}</h2>
        <div class="search-result-list">${results[g.key].map(g.build).join("")}</div>
      </div>`)
    .join("");

  container.innerHTML = html;
  const grid = container.querySelector(".grid");
  if (grid) setupCardInteractions(grid);
}

export async function initSearchPage() {
  const resultsEl = qs("#search-results");
  if (!resultsEl) return;

  const params = new URLSearchParams(window.location.search);
  const term = params.get("q");
  if (!term) {
    resultsEl.innerHTML = `<div class="state-empty"><div class="display">Search products</div><div>Type a keyword in the search bar above.</div></div>`;
    return;
  }

  resultsEl.innerHTML = `<div class="state-loading"><div class="display">Searching for "${term}"…</div></div>`;
  const index = await buildSearchIndex();
  const results = searchAll(index, term);
  renderSearchResults(resultsEl, results, term);

  // Update page title
  document.title = `${term} — Pocket Friendly Loot`;
}
