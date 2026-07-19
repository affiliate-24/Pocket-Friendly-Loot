/* ==========================================================================
   gifts.js
   Same listing+detail-via-?slug= pattern as blogs.js, simpler content:
   a guide title/description plus a set of referenced products.
   ========================================================================== */

import { CONFIG } from "./app.js";
import { fetchCSV, qs, getQueryParam, findByIds, escapeHtml } from "./utils.js"; // escapeHtml added for XSS protection on sheet content
import { loadDeals, buildCardHTML, setupCardInteractions } from "./products.js"; // setupCardInteractions added to wire wishlist on gift detail cards

export async function initGiftIdeasPage() {
  const slug = getQueryParam("slug");
  const guides = await fetchCSV(CONFIG.SHEETS.giftIdeas);

  if (slug) {
    const guide = guides.find((g) => g.Slug === slug);
    if (!guide) {
      renderNotFound();
      return;
    }
    await renderGuideDetail(guide);
  } else {
    renderListing(guides);
  }
}

function renderListing(guides) {
  const container = qs("#gift-listing");
  if (!container) return;

  if (!guides.length) {
    container.innerHTML = `<div class="state-empty"><div class="display">No gift guides yet</div><div>Add a row to the Gift_Ideas tab.</div></div>`;
    return;
  }

  container.innerHTML = guides
    .map(
      (guide) => {
        // Escape every sheet-derived string before insertion into innerHTML to prevent stored XSS.
        const safeSlug = encodeURIComponent(guide.Slug || "");
        const safeImg = guide.Hero_Image_URL ? encodeURI(guide.Hero_Image_URL) : "";
        const safeTitle = escapeHtml(guide.Guide_Title || "");
        const safeTag = guide.Occasion_Tag ? escapeHtml(guide.Occasion_Tag) : "";
        const safeDesc = guide.Description ? escapeHtml(guide.Description) : "";
        return `
        <a class="teaser-card" href="gift-ideas.html?slug=${safeSlug}" data-animate>
          <img src="${safeImg}" alt="${safeTitle}" loading="lazy">
          <div class="teaser-body">
            ${safeTag ? `<div class="teaser-tag">${safeTag}</div>` : ""}
            <h3>${safeTitle}</h3>
            <p>${safeDesc}</p>
          </div>
        </a>`;
      }
    )
    .join("");
}

async function renderGuideDetail(guide) {
  document.title = `${guide.Guide_Title} — ${CONFIG.SITE_NAME}`;

  qs("#gift-listing-view")?.setAttribute("hidden", "true");
  const detailView = qs("#gift-detail-view");
  detailView?.removeAttribute("hidden");

  // encodeURI guards against attribute-injection via sheet-provided image URL
  qs("#gift-hero-img").src = guide.Hero_Image_URL ? encodeURI(guide.Hero_Image_URL) : "";
  qs("#gift-hero-img").alt = guide.Guide_Title;
  qs("#gift-title").textContent = guide.Guide_Title;
  qs("#gift-description").textContent = guide.Description || "";

  const deals = await loadDeals();
  const products = findByIds(deals, "S_No", guide.Product_SNos);
  const grid = qs("#gift-products-grid");
  if (grid) {
    grid.innerHTML = products.length
      ? products.map(buildCardHTML).join("")
      : `<div class="state-empty"><div class="display">No products linked yet</div></div>`;
    // Wire up wishlist toggle + accessible whole-card click for the rendered product cards
    // (Issue #3 — previously missing, so heart buttons were dead on gift detail pages).
    if (products.length) setupCardInteractions(grid);
  }
}

function renderNotFound() {
  const detailView = qs("#gift-detail-view");
  if (detailView) {
    detailView.removeAttribute("hidden");
    detailView.innerHTML = `<div class="state-empty"><div class="display">Gift guide not found</div></div>`;
  }
}
