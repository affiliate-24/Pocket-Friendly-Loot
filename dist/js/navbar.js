/* ==========================================================================
   navbar.js
   Everything the nav needs to do beyond its static markup: sticky shadow
   on scroll, highlighting the current page, and an accessible mobile
   menu (keyboard + Escape + outside-click all close it, aria-expanded
   kept in sync for screen readers).
   ========================================================================== */

import { qs, qsa } from "./utils.js";

/** Read the wishlist from localStorage and update the saved-badge count and icon fill state. */
function updateSavedBadge() {
  var badge = document.getElementById("saved-badge");
  if (!badge) return;
  try {
    var list = JSON.parse(localStorage.getItem("mela_wishlist") || "[]");
    badge.textContent = list.length;
    // Toggle .has-items on the parent link so the SVG fills when products are saved
    var link = badge.closest(".nav-saved-link");
    if (link) link.classList.toggle("has-items", list.length > 0);
  } catch {
    badge.textContent = "0";
  }
}

export function initNavbar() {
  highlightActiveLink();
  setupStickyShadow();
  setupMobileMenu();
  updateSavedBadge();
  setupMobileSearch();
  setupSearchShortcut();
  // Re-read the wishlist count whenever a card's wishlist button is toggled
  window.addEventListener("wishlist:updated", updateSavedBadge);
}

/**
 * Mobile only: a search icon in the top bar that toggles a collapsible
 * search bar below it (no category select). Desktop keeps the inline
 * search bar and the icon stays hidden.
 */
function setupMobileSearch() {
  const actions = qs(".nav-actions");
  const navbar = qs(".navbar");
  const topBar = qs(".nav-top");
  if (!actions || !navbar || !topBar) return;

  // Search icon button, inserted just before the hamburger toggle
  const icon = document.createElement("button");
  icon.type = "button";
  icon.className = "nav-search-toggle";
  icon.setAttribute("aria-label", "Search");
  icon.setAttribute("aria-expanded", "false");
  icon.setAttribute("aria-controls", "mobile-search-bar");
  icon.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>';
  const toggle = qs(".nav-toggle", actions);
  if (toggle) actions.insertBefore(icon, toggle);
  else actions.appendChild(icon);

  // Collapsible search bar, placed right after the top bar
  const bar = document.createElement("div");
  bar.className = "mobile-search-bar";
  bar.id = "mobile-search-bar";
  bar.hidden = true;
  bar.innerHTML = '<form class="mobile-search-form" action="search.html" method="GET">' +
    '<input class="mobile-search-input" name="q" type="text" placeholder="Search products…" aria-label="Search products" autocomplete="off">' +
    '<button class="mobile-search-submit" type="submit" aria-label="Submit search">' +
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>' +
    '</button></form>';
  topBar.after(bar);

  const open = (show) => {
    bar.hidden = !show;
    icon.setAttribute("aria-expanded", String(show));
    if (show) {
      const input = qs(".mobile-search-input", bar);
      if (input) input.focus();
    }
  };

  icon.addEventListener("click", () => {
    open(bar.hidden);
  });

  // Close on Escape
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !bar.hidden) open(false);
  });

  // Focus the search input when the page loads on mobile with a ?q= query
  if (window.matchMedia("(max-width: 768px)").matches) {
    const params = new URLSearchParams(window.location.search);
    const q = params.get("q");
    if (q) {
      const input = qs(".mobile-search-input", bar);
      if (input) input.value = q;
      open(true);
    }
  }

  // Keep the toggle hidden on desktop if the viewport changes
  const mq = window.matchMedia("(max-width: 768px)");
  const onViewport = () => {
    if (!mq.matches) open(false);
  };
  if (mq.addEventListener) mq.addEventListener("change", onViewport);
  else if (mq.addListener) mq.addListener(onViewport);
}

/**
 * Any link pointing to search.html is treated as "jump to the search bar"
 * rather than opening a separate search page. On desktop we focus the
 * header's inline input; on mobile we open the collapsible bar. The
 * results page only ever opens when the user actually submits a query.
 */
function setupSearchShortcut() {
  document.addEventListener("click", (e) => {
    const link = e.target.closest('a[href$="search.html"], a[href*="search.html"]');
    if (!link) return;

    const mobileBar = qs(".mobile-search-bar");
    if (mobileBar && window.matchMedia("(max-width: 768px)").matches) {
      e.preventDefault();
      mobileBar.hidden = false;
      const icon = qs(".nav-search-toggle");
      if (icon) icon.setAttribute("aria-expanded", "true");
      const input = qs(".mobile-search-input", mobileBar);
      if (input) {
        input.focus();
        input.scrollIntoView({ block: "center", behavior: "smooth" });
      }
      return;
    }

    const input = qs(".search-input-field");
    if (!input) return;
    e.preventDefault();
    input.focus();
    input.scrollIntoView({ block: "center", behavior: "smooth" });
  });
}

/** Adds .active to whichever .nav-link's href matches the current page. */
function highlightActiveLink() {
  const current = window.location.pathname.split("/").pop() || "index.html";
  qsa(".nav-link").forEach((link) => {
    const linkPage = link.getAttribute("href")?.split("/").pop();
    if (linkPage === current) {
      link.classList.add("active");
      link.setAttribute("aria-current", "page");
    }
  });
  if (current === "category.html") {
    const catLink = qs('.nav-link[href="categories.html"]');
    if (catLink) {
      catLink.classList.add("active");
      catLink.setAttribute("aria-current", "page");
    }
  }
}

/** Toggles a background/shadow class once the page has scrolled past the navbar's own height. */
function setupStickyShadow() {
  const navbar = qs(".navbar");
  if (!navbar) return;
  const threshold = 12;
  const onScroll = () => {
    navbar.classList.toggle("is-scrolled", window.scrollY > threshold);
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
}

/** Hamburger toggle with proper aria-expanded state and multiple close paths. */
function setupMobileMenu() {
  const toggle = qs(".nav-toggle");
  const menu = qs(".mobile-menu");
  if (!toggle || !menu) return;

  const setOpen = (open) => {
    toggle.setAttribute("aria-expanded", String(open));
    menu.classList.toggle("is-open", open);
  };

  toggle.addEventListener("click", () => {
    const isOpen = toggle.getAttribute("aria-expanded") === "true";
    setOpen(!isOpen);
  });

  // Close on Escape for keyboard users
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") setOpen(false);
  });

  // Close when a link inside the menu is chosen
  qsa("a", menu).forEach((link) => link.addEventListener("click", () => setOpen(false)));

  // Close when clicking outside the menu/toggle
  document.addEventListener("click", (e) => {
    if (!menu.contains(e.target) && !toggle.contains(e.target)) setOpen(false);
  });

  // Close on scroll
  let scrollTimeout;
  window.addEventListener("scroll", function () {
    if (toggle.getAttribute("aria-expanded") === "true") {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(function () { setOpen(false); }, 80);
    }
  }, { passive: true });
}
