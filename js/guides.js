/* ==========================================================================
   guides.js
   Renders the Best_Products tab. Unlike Blogs/Gift_Ideas, one "guide" is
   spread across multiple rows (one per ranked product), so the first
   job is grouping rows by Slug before anything else can render.
   ========================================================================== */

import { CONFIG } from "./app.js";
import { fetchCSV, qs, getQueryParam, findById, formatMoney, escapeHtml } from "./utils.js"; // escapeHtml added for XSS protection on sheet content
import { loadDeals } from "./products.js";

export function groupBySlug(rows) {
  const groups = new Map();
  rows.forEach((row) => {
    if (!groups.has(row.Slug)) {
      groups.set(row.Slug, { title: row.List_Title, slug: row.Slug, category: row.Category, rows: [] });
    }
    groups.get(row.Slug).rows.push(row);
  });
  groups.forEach((g) => g.rows.sort((a, b) => parseFloat(a.Rank) - parseFloat(b.Rank)));
  return Array.from(groups.values());
}

export async function initBestProductsPage() {
  const slug = getQueryParam("slug");
  const [rankRows, deals] = await Promise.all([fetchCSV(CONFIG.SHEETS.bestProducts), loadDeals()]);
  const allGuides = groupBySlug(rankRows);

  if (slug) {
    const guide = allGuides.find((g) => g.slug === slug);
    if (!guide) {
      renderNotFound();
      return;
    }
    renderGuideDetail(guide, deals);
  } else {
    renderListing(allGuides, deals);
  }
}

function renderListing(guides, deals) {
  const container = qs("#guides-listing");
  if (!container) return;

  if (!guides.length) {
    container.innerHTML = `<div class="state-empty"><div class="display">No ranked lists yet</div><div>Add rows to the Best_Products tab.</div></div>`;
    return;
  }

  container.innerHTML = guides
    .map((guide) => {
      const topRows = guide.rows.slice(0, 5);
      const rowsHTML = topRows
        .map((row) => {
          const product = findById(deals, "S_No", row.S_No);
          if (!product) return "";
          // Escape sheet-derived fields to prevent stored XSS
          const safeName = escapeHtml(product.Product_Name || "");
          const safeImg = product.Image_URL ? encodeURI(product.Image_URL) : "";
          const safeNote = row.Ranking_Note ? escapeHtml(row.Ranking_Note) : "";
          const safeRank = escapeHtml(String(row.Rank));
          return `
            <div class="rank-row">
              <span class="badge badge-rank">#${safeRank}</span>
              <img src="${safeImg}" alt="${safeName}" loading="lazy">
              <div class="rank-info">
                <div class="rank-name">${safeName}</div>
                ${safeNote ? `<div class="rank-note">${safeNote}</div>` : ""}
              </div>
              <div class="rank-price">${formatMoney(product.Sale_Price)}</div>
            </div>`;
        })
        .join("");
      if (!rowsHTML) return "";
      // Escape guide title for the same reason
      const safeTitle = escapeHtml(guide.title || "");
      const safeSlug = encodeURIComponent(guide.slug || "");
      return `
        <div class="guide-card" data-animate>
          <h3><a href="best-products.html?slug=${safeSlug}">${safeTitle}</a></h3>
          ${rowsHTML}
        </div>`;
    })
    .filter(Boolean)
    .join("");
}

function renderGuideDetail(guide, deals) {
  qs("#guides-listing-view")?.setAttribute("hidden", "true");
  const detailView = qs("#guide-detail-view");
  detailView?.removeAttribute("hidden");

  // Escape guide title before placing it into document.title (textContent is safe,
  // but we still escape for consistency here since escapeHtml preserves apostrophes etc.)
  document.title = `${guide.title} — ${CONFIG.SITE_NAME}`;
  qs("#guide-title").textContent = guide.title;

  const rowsHTML = guide.rows
    .map((row) => {
      const product = findById(deals, "S_No", row.S_No);
      if (!product) return "";
      // Escape every sheet-derived string before insertion into innerHTML
      const safeName = escapeHtml(product.Product_Name || "");
      const safeImg = product.Image_URL ? encodeURI(product.Image_URL) : "";
      const safeNote = row.Ranking_Note ? escapeHtml(row.Ranking_Note) : "";
      const safeRank = escapeHtml(String(row.Rank));
      const safeLink = product.Affiliate_Link ? encodeURI(product.Affiliate_Link) : "#";
      return `
        <div class="rank-row">
          <span class="badge badge-rank">#${safeRank}</span>
          <img src="${safeImg}" alt="${safeName}" loading="lazy">
          <div class="rank-info">
            <div class="rank-name"><a href="${safeLink}" target="_blank" rel="noopener sponsored nofollow">${safeName}</a></div>
            ${safeNote ? `<div class="rank-note">${safeNote}</div>` : ""}
          </div>
          <div class="rank-price">${formatMoney(product.Sale_Price)}</div>
        </div>`;
    })
    .join("");
  qs("#guide-rank-list").innerHTML = rowsHTML;
}

function renderNotFound() {
  const detailView = qs("#guide-detail-view");
  if (detailView) {
    detailView.removeAttribute("hidden");
    detailView.innerHTML = `<div class="state-empty"><div class="display">Guide not found</div></div>`;
  }
}
