/* ==========================================================================
   gifts.js
   Same listing+detail-via-?slug= pattern as blogs.js, simpler content:
   a guide title/description plus a set of referenced products.
   ========================================================================== */

import { CONFIG } from "./app.js";
import { fetchCSV, qs, getQueryParam, findByIds } from "./utils.js";
import { loadDeals, buildCardHTML } from "./products.js";

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
      (guide) => `
      <a class="teaser-card" href="gift-ideas.html?slug=${encodeURIComponent(guide.Slug)}" data-animate>
        <img src="${guide.Hero_Image_URL}" alt="${guide.Guide_Title}" loading="lazy">
        <div class="teaser-body">
          ${guide.Occasion_Tag ? `<div class="teaser-tag">${guide.Occasion_Tag}</div>` : ""}
          <h3>${guide.Guide_Title}</h3>
          <p>${guide.Description || ""}</p>
        </div>
      </a>`
    )
    .join("");
}

async function renderGuideDetail(guide) {
  document.title = `${guide.Guide_Title} — ${CONFIG.SITE_NAME}`;

  qs("#gift-listing-view")?.setAttribute("hidden", "true");
  const detailView = qs("#gift-detail-view");
  detailView?.removeAttribute("hidden");

  qs("#gift-hero-img").src = guide.Hero_Image_URL;
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
  }
}

function renderNotFound() {
  const detailView = qs("#gift-detail-view");
  if (detailView) {
    detailView.removeAttribute("hidden");
    detailView.innerHTML = `<div class="state-empty"><div class="display">Gift guide not found</div></div>`;
  }
}
