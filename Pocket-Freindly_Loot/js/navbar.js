/* ==========================================================================
   navbar.js
   Everything the nav needs to do beyond its static markup: sticky shadow
   on scroll, highlighting the current page, and an accessible mobile
   menu (keyboard + Escape + outside-click all close it, aria-expanded
   kept in sync for screen readers).
   ========================================================================== */

import { qs, qsa } from "./utils.js";

export function initNavbar() {
  highlightActiveLink();
  setupStickyShadow();
  setupMobileMenu();
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
}
