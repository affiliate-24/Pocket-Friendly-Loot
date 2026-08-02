/* ==========================================================================
   guides.js
   Renders the Best_Products tab. Unlike Blogs/Gift_Ideas, one "guide" is
   spread across multiple rows (one per ranked product), so the first
   job is grouping rows by Slug before anything else can render.
   ========================================================================== */

import { CONFIG } from "./app.js";
import { fetchCSV, qs, getQueryParam, findById, formatMoney, escapeHtml } from "./utils.js";
import { loadDeals, buildCardHTML, setupCardInteractions } from "./products.js";
import { buildGuideCardHTML } from "./templates.js";

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

  var guideMap = {};
  guides.forEach(function (g) { guideMap[g.slug] = g; });

  container.innerHTML = guides.map(buildGuideCardHTML).join("");

  container.addEventListener("click", function (e) {
    var header = e.target.closest(".guide-card-header");
    if (!header) return;
    if (e.target.closest("a")) return;
    var card = header.closest(".guide-card");
    if (!card) return;
    toggleCard(card, guideMap, deals);
  });
}

function toggleCard(card, guideMap, deals) {
  var isOpen = card.classList.toggle("is-expanded");
  card.querySelector(".guide-card-header").setAttribute("aria-expanded", String(isOpen));
  if (isOpen) {
    var bodyInner = card.querySelector(".guide-card-body-inner");
    if (!bodyInner.hasAttribute("data-loaded")) {
      var slug = card.getAttribute("data-slug");
      var guide = guideMap[slug];
      if (guide) {
        bodyInner.innerHTML = guide.rows
          .map(function (row) {
            var product = findById(deals, "S_No", row.S_No);
            if (!product) return "";
            return buildCardHTML(product, row.Rank);
          })
          .filter(Boolean)
          .join("");
        setupCardInteractions(bodyInner);
        bodyInner.setAttribute("data-loaded", "true");
      }
    }
  }
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
