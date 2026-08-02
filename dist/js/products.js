/* ==========================================================================
   products.js
   Everything to do with rendering Deals: fetching the three product
   tabs, building a card's markup, sorting, infinite scroll, the
   frontend-only wishlist, and the accessible whole-card-click behavior
   described in components.css.
   ========================================================================== */

import { CONFIG, navigateExternal } from "./app.js";
import {
  fetchCSV,
  qs,
  qsa,
  findById,
  findByIds,
} from "./utils.js";
import { buildCardHTML as buildCardMarkup, buildSkeletonCardHTML, isValidDeal } from "./templates.js";

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
      return deal && isValidDeal(deal) ? { ...deal, _badgeOverride: row.Badge_Text || row.Trend_Note || "" } : null;
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
// Exported so saved.html (the wishlist page) can read the stored IDs and
// resolve them to full deal rows via the master Deals tab.
export function getWishlistIds() {
  return getWishlist();
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
  window.dispatchEvent(new CustomEvent("wishlist:updated"));
  return next.includes(id);
}

/* ---------------------------- Markup builders ---------------------------- */

/**
 * Builds one product card, decorated with the visitor's current wishlist
 * state. The raw markup lives in templates.js (shared with the build
 * script); this wrapper only adds the localStorage wishlist state that
 * only the browser knows.
 */
export function buildCardHTML(deal, rank) {
  return buildCardMarkup(deal, rank, isWishlisted(deal && deal.S_No));
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
  var valid = deals.filter(isValidDeal);
  if (!valid.length) {
    renderEmptyState(container);
    return;
  }
  container.innerHTML = valid.map(buildCardHTML).join("");
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
      navigateExternal(card.dataset.link);
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
  var valid = items.filter(isValidDeal);
  if (!valid.length) {
    renderEmptyState(container);
    return;
  }
  let rendered = 0;
  const sentinel = document.createElement("div");
  sentinel.className = "load-more-sentinel";

  function renderNextBatch() {
    const batch = valid.slice(rendered, rendered + batchSize);
    if (!batch.length) {
      sentinel.remove();
      observer.disconnect();
      return;
    }
    const html = batch.map(buildCardHTML).join("");
    sentinel.insertAdjacentHTML("beforebegin", html);
    rendered += batch.length;
    if (rendered >= valid.length) {
      sentinel.remove();
      observer.disconnect();
    }
  }

  const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) renderNextBatch();
  });

  container.innerHTML = "";
  container.appendChild(sentinel);
  renderNextBatch();
  observer.observe(sentinel);
  setupCardInteractions(container);
}
