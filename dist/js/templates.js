/* ==========================================================================
   templates.js
   Pure markup builders shared by BOTH the browser modules (products.js,
   categories.js, blogs.js, gifts.js, guides.js) and the Netlify build
   script (scripts/build.mjs, which imports this file to pre-render HTML
   at build time). Nothing here touches the DOM, localStorage, or window —
   it is safe to import from Node.js.

   Because the browser and the build use the exact same functions, the
   pre-rendered HTML is always identical to what the client would have
   produced, and there is only one copy of each markup template to maintain.
   ========================================================================== */

import { escapeHtml, formatMoney, discountPct } from "./utils.js";

/** A deal row is only renderable if it has a product name. */
export function isValidDeal(deal) {
  return deal && deal.Product_Name && deal.Product_Name.trim() !== "";
}

const HEART_ICON = `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 21s-7.5-4.6-10-9.3C.5 8 2 4.5 5.5 4 8 3.6 10 5 12 7.5 14 5 16 3.6 18.5 4 22 4.5 23.5 8 22 11.7 19.5 16.4 12 21 12 21z"/></svg>`;

function buildStarsHTML(rating, reviewCount) {
  const r = parseFloat(rating);
  if (!r) return "";
  const full = Math.round(r);
  let stars = "";
  for (let i = 1; i <= 5; i++) {
    stars += `<span class="${i <= full ? "star-filled" : "star-empty"}" aria-hidden="true">★</span>`;
  }
  const countHTML = reviewCount ? `<span class="review-count">(${Number(reviewCount).toLocaleString("en-IN")})</span>` : "";
  return `<div class="stars" role="img" aria-label="${r} out of 5 stars${reviewCount ? `, ${reviewCount} reviews` : ""}">${stars}${countHTML}</div>`;
}

/**
 * Builds one product card. `deal` is a row from the Deals tab (optionally
 * merged with a curated-tab badge override). Optional `rank` adds a rank
 * badge (e.g. #1, #2) inside .card-img. `wishlisted` defaults to false so
 * the build script can render cards without touching localStorage.
 */
export function buildCardHTML(deal, rank, wishlisted = false) {
  if (!isValidDeal(deal)) return "";
  const pct = discountPct(deal.Original_Price, deal.Sale_Price);
  // Escape every sheet-derived string before it is inserted into innerHTML.
  // This neutralizes stored XSS if a row in the Google Sheet contains HTML markup.
  const badgeText = escapeHtml(deal._badgeOverride || (pct ? `${pct}% OFF` : ""));
  const name = escapeHtml(deal.Product_Name || "");
  const cat = escapeHtml(deal.Category || "Deal");
  // Image URL and affiliate link are attributes — use encodeURI to block attribute injection.
  const rawImg = (deal.Image_URL || "").trim();
  const img = rawImg ? encodeURI(rawImg) : "";
  const rawLink = (deal.Affiliate_Link || "#").trim();
  const link = rawLink ? encodeURI(rawLink) : "#";

  return `
    <article class="card" data-sno="${escapeHtml(String(deal.S_No))}" data-link="${link}" tabindex="-1">
      <div class="card-img">
        ${rank ? `<span class="badge badge-rank">#${rank}</span>` : ""}
        ${badgeText ? `<span class="badge badge-discount">${badgeText}</span>` : ""}
        <button
          type="button"
          class="wishlist-btn ${wishlisted ? "active" : ""}"
          data-wishlist-btn
          data-sno="${escapeHtml(String(deal.S_No))}"
          aria-pressed="${wishlisted}"
          aria-label="${wishlisted ? "Remove from" : "Add to"} wishlist: ${name}"
        >${HEART_ICON}</button>
        ${img ? `<img src="${img}" alt="${name}" loading="lazy" onerror="this.style.display='none'">` : ""}
      </div>
      <div class="card-body">
        <!-- this is commented because every product box containaing it -->
        <!-- <span class="badge badge-affiliate">Affiliate</span> -->
        <div class="card-cat">${cat}</div>
        <div class="card-name"><a href="${link}" target="_blank" rel="noopener sponsored nofollow">${name}</a></div>
        ${buildStarsHTML(deal.Rating, deal.Review_Count)}
        <div class="card-price">
          ${deal.Original_Price ? `<span class="orig">${formatMoney(deal.Original_Price)}</span>` : ""}
          <span class="sale">${formatMoney(deal.Sale_Price)}</span>
        </div>
        <a class="card-cta" href="${link}" target="_blank" rel="noopener sponsored nofollow">Grab Deal</a>
      </div>
    </article>`;
}

export function buildSkeletonCardHTML() {
  return `
    <div class="card skeleton-card" aria-hidden="true">
      <div class="skeleton-block skeleton-img"></div>
      <div class="skeleton-block skeleton-line"></div>
      <div class="skeleton-block skeleton-line short"></div>
    </div>`;
}

/**
 * Teaser card used by Blogs + Gift Ideas listings and the home-page
 * previews. `img`/`title`/`desc`/`tag` must already be safe-encoded by
 * the caller (or a sheet row could inject markup); href is a local
 * relative link (e.g. "blogs.html?slug=...").
 */
export function buildTeaserCardHTML({ img = "", title = "", desc = "", tag = "", href = "#" }) {
  return `
  <a class="teaser-card" href="${encodeURI(href)}" data-animate>
    <img src="${img}" alt="${title}" loading="lazy">
    <div class="teaser-body">
      ${tag ? `<div class="teaser-tag">${tag}</div>` : ""}
      <h3>${title}</h3>
      <p>${desc}</p>
    </div>
  </a>`;
}

/** Full category card for categories.html — links into Today's Deals pre-filtered by category. */
export function buildCategoryCardHTML(cat) {
  // Escape all sheet-derived content to prevent stored XSS / CSS injection.
  const safeName = escapeHtml(cat.Category_Name || "");
  const safeDesc = cat.Description ? escapeHtml(cat.Description) : "";
  const safeIcon = cat.Icon_Emoji ? escapeHtml(cat.Icon_Emoji) : "";
  const safeImg = cat.Image_URL ? encodeURI(cat.Image_URL) : "";
  const safeHref = `category.html?cat=${encodeURIComponent(cat.Category_Name)}`;
  return `
  <a class="category-card${cat.Image_URL ? " category-card--img" : ""}" href="${safeHref}" data-animate${cat.Image_URL ? ` style="background-image:url('${escapeHtml(safeImg)}')"` : ""}>
    ${!cat.Image_URL && cat.Icon_Emoji ? `<div class="icon" aria-hidden="true">${safeIcon}</div>` : ""}
    <h3>${safeName}</h3>
    ${safeDesc ? `<p>${safeDesc}</p>` : ""}
  </a>`;
}

/** Collapsible "best products" listing card shown on best-products.html. */
export function buildGuideCardHTML(guide) {
  const safeTitle = escapeHtml(guide.title || "");
  const safeSlug = encodeURIComponent(guide.slug || "");
  return `
  <div class="guide-card" data-slug="${safeSlug}" data-animate>
    <div class="guide-card-header" role="button" tabindex="0" aria-expanded="false">
      <h3><a href="best-products.html?slug=${safeSlug}">${safeTitle}</a></h3>
      <svg class="guide-chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
    </div>
    <div class="guide-card-body">
      <div class="guide-card-body-inner"></div>
    </div>
  </div>`;
}

/** Home-page "Best Products" preview link card. */
export function buildGuidePreviewHTML(guide) {
  const safeTitle = escapeHtml(guide.title || "");
  const safeSlug = encodeURIComponent(guide.slug || "");
  return `
  <a class="guide-preview-card" href="best-products.html?slug=${safeSlug}">${safeTitle}</a>`;
}
