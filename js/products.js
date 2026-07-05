/* ==========================================================================
   products.js
   Everything to do with rendering Deals: fetching the three product
   tabs, building a card's markup, sorting, infinite scroll, the
   frontend-only wishlist, and the accessible whole-card-click behavior
   described in components.css.
   ========================================================================== */

import { CONFIG } from "./app.js";
import {
  fetchCSV,
  formatMoney,
  discountPct,
  qs,
  qsa,
  findById,
  findByIds,
} from "./utils.js";

const WISHLIST_KEY = "mela_wishlist";

/* ---------------------------- Data loading ---------------------------- */
export function loadDeals() {
  return fetchCSV(CONFIG.SHEETS.deals);
}
export function loadTodaysDeals() {
  return fetchCSV(CONFIG.SHEETS.todaysDeals);
}
export function loadTrendingDeals() {
  return fetchCSV(CONFIG.SHEETS.trendingDeals);
}

/** Resolve a curated tab (Todays_Deals/Trending_Deals — rows with S_No + Sort_Order) into full Deal objects from the master catalog, in the curated tab's order. */
export function resolveCuratedList(curatedRows, allDeals) {
  return curatedRows
    .slice()
    .sort((a, b) => (parseFloat(a.Sort_Order) || 0) - (parseFloat(b.Sort_Order) || 0))
    .map((row) => {
      const deal = findById(allDeals, "S_No", row.S_No);
      return deal ? { ...deal, _badgeOverride: row.Badge_Text || row.Trend_Note || "" } : null;
    })
    .filter(Boolean);
}

/* ---------------------------- Wishlist (frontend only, localStorage) ---------------------------- */
function getWishlist() {
  try {
    return JSON.parse(localStorage.getItem(WISHLIST_KEY) || "[]");
  } catch {
    return [];
  }
}
function saveWishlist(list) {
  localStorage.setItem(WISHLIST_KEY, JSON.stringify(list));
}
export function isWishlisted(sNo) {
  return getWishlist().includes(String(sNo));
}
export function toggleWishlist(sNo) {
  const list = getWishlist();
  const id = String(sNo);
  const next = list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
  saveWishlist(next);
  return next.includes(id);
}

/* ---------------------------- Markup builders ---------------------------- */
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

/** Builds one product card. `deal` is a row from the Deals tab (optionally merged with a curated-tab badge override). */
export function buildCardHTML(deal) {
  const pct = discountPct(deal.Original_Price, deal.Sale_Price);
  const wishlisted = isWishlisted(deal.S_No);
  const badgeText = deal._badgeOverride || (pct ? `${pct}% OFF` : "");
  const name = deal.Product_Name || "";
  const img = (deal.Image_URL || "").trim();
  const link = (deal.Affiliate_Link || "#").trim();

  return `
    <article class="card" data-sno="${deal.S_No}" data-link="${link}" tabindex="-1">
      <div class="card-img">
        ${badgeText ? `<span class="badge badge-discount">${badgeText}</span>` : ""}
        <button
          type="button"
          class="wishlist-btn ${wishlisted ? "active" : ""}"
          data-wishlist-btn
          data-sno="${deal.S_No}"
          aria-pressed="${wishlisted}"
          aria-label="${wishlisted ? "Remove from" : "Add to"} wishlist: ${name}"
        >${HEART_ICON}</button>
        ${img ? `<img src="${img}" alt="${name}" loading="lazy" onerror="this.style.display='none'">` : ""}
      </div>
      <div class="card-body">
        <!-- this is commented because every product box containaing it -->
        <!-- <span class="badge badge-affiliate">Affiliate</span> -->
        <div class="card-cat">${deal.Category || "Deal"}</div>
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

/* ---------------------------- Rendering ---------------------------- */
export function renderSkeletonGrid(container, count = 8) {
  container.innerHTML = Array.from({ length: count }, buildSkeletonCardHTML).join("");
}

export function renderEmptyState(container, message = "No deals here yet.") {
  container.innerHTML = `<div class="state-empty"><div class="display">Nothing to show</div><div>${message}</div></div>`;
}

export function renderErrorState(container, message = "Couldn't load deals — check your connection and try again.") {
  container.innerHTML = `<div class="state-error"><div class="display">Something went wrong</div><div>${message}</div></div>`;
}

export function renderGrid(container, deals) {
  if (!deals.length) {
    renderEmptyState(container);
    return;
  }
  container.innerHTML = deals.map(buildCardHTML).join("");
  container.classList.add("fade-in");
  setupCardInteractions(container);
}

/** Delegated handlers for the whole grid: wishlist toggle + accessible whole-card click-through. */
export function setupCardInteractions(container) {
  container.addEventListener("click", (e) => {
    const wishlistBtn = e.target.closest("[data-wishlist-btn]");
    if (wishlistBtn) {
      e.preventDefault();
      e.stopPropagation();
      const active = toggleWishlist(wishlistBtn.dataset.sno);
      wishlistBtn.classList.toggle("active", active);
      wishlistBtn.setAttribute("aria-pressed", String(active));
      return;
    }
    // If the click landed on a real link/button, let it behave natively —
    // this branch only handles clicks on the "dead space" of the card
    // (image background, padding) for mouse users. Keyboard users always
    // reach the real <a> elements directly, so this never replaces
    // keyboard access — see the note in components.css.
    if (e.target.closest("a, button")) return;
    const card = e.target.closest(".card");
    if (card && card.dataset.link) {
      window.open(card.dataset.link, "_blank", "noopener");
    }
  });
}

/* ---------------------------- Sorting ---------------------------- */
export function sortDeals(deals, sortKey) {
  const list = deals.slice();
  switch (sortKey) {
    case "price-asc":
      return list.sort((a, b) => parseFloat(a.Sale_Price) - parseFloat(b.Sale_Price));
    case "price-desc":
      return list.sort((a, b) => parseFloat(b.Sale_Price) - parseFloat(a.Sale_Price));
    case "discount-desc":
      return list.sort((a, b) => (discountPct(b.Original_Price, b.Sale_Price) || 0) - (discountPct(a.Original_Price, a.Sale_Price) || 0));
    case "rating-desc":
      return list.sort((a, b) => (parseFloat(b.Rating) || 0) - (parseFloat(a.Rating) || 0));
    default:
      return list;
  }
}

/* ---------------------------- Infinite scroll ----------------------------
   Generic: renders `batchSize` items at a time into `container`, loading
   more whenever the sentinel element scrolls into view. */
export function initInfiniteScroll(container, items, batchSize = 12) {
  let rendered = 0;
  const sentinel = document.createElement("div");
  sentinel.className = "load-more-sentinel";

  function renderNextBatch() {
    const batch = items.slice(rendered, rendered + batchSize);
    if (!batch.length) {
      sentinel.remove();
      observer.disconnect();
      return;
    }
    const html = batch.map(buildCardHTML).join("");
    sentinel.insertAdjacentHTML("beforebegin", html);
    rendered += batch.length;
    if (rendered >= items.length) {
      sentinel.remove();
      observer.disconnect();
    }
  }

  const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) renderNextBatch();
  });

  if (!items.length) {
    renderEmptyState(container);
    return;
  }
  container.innerHTML = "";
  container.appendChild(sentinel);
  renderNextBatch();
  observer.observe(sentinel);
  setupCardInteractions(container);
}
