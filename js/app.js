/* ==========================================================================
   app.js
   The one file every page imports first. Holds the single source of
   truth for config (sheet URLs, dates, Telegram link) and a couple of
   bootstrap helpers needed on literally every page. Page-specific logic
   (products, search, blogs, etc.) lives in its own module and imports
   CONFIG from here — never duplicates it.
   ========================================================================== */

import { qsa } from "./utils.js";

/* ====================== EDIT THESE ====================== */
export const CONFIG = {
  SHEETS: {
    deals: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQlfHk-JQa7q8lIyBxXQtdI3et92suMRw2t2C5A1OfvR41mMZ-wy_hUWuMOizPmFzTbRq0u0WS0OJ-Z/pub?gid=0&single=true&output=csv",
    todaysDeals: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQlfHk-JQa7q8lIyBxXQtdI3et92suMRw2t2C5A1OfvR41mMZ-wy_hUWuMOizPmFzTbRq0u0WS0OJ-Z/pub?gid=2035525778&single=true&output=csv",
    trendingDeals: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQlfHk-JQa7q8lIyBxXQtdI3et92suMRw2t2C5A1OfvR41mMZ-wy_hUWuMOizPmFzTbRq0u0WS0OJ-Z/pub?gid=1671278602&single=true&output=csv",
    categories: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQlfHk-JQa7q8lIyBxXQtdI3et92suMRw2t2C5A1OfvR41mMZ-wy_hUWuMOizPmFzTbRq0u0WS0OJ-Z/pub?gid=1900968817&single=true&output=csv",
    blogs: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQlfHk-JQa7q8lIyBxXQtdI3et92suMRw2t2C5A1OfvR41mMZ-wy_hUWuMOizPmFzTbRq0u0WS0OJ-Z/pub?gid=2115468565&single=true&output=csv",
    bestProducts: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQlfHk-JQa7q8lIyBxXQtdI3et92suMRw2t2C5A1OfvR41mMZ-wy_hUWuMOizPmFzTbRq0u0WS0OJ-Z/pub?gid=763871860&single=true&output=csv",
    giftIdeas: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQlfHk-JQa7q8lIyBxXQtdI3et92suMRw2t2C5A1OfvR41mMZ-wy_hUWuMOizPmFzTbRq0u0WS0OJ-Z/pub?gid=2030758027&single=true&output=csv",
  },
  TELEGRAM_CHANNEL_URL: "https://t.me/PFLoot00",
  NEWSLETTER_FORM_URL: "https://docs.google.com/forms/d/e/1FAIpQLSf3BdjDWcfc1PQFMc5bxvm88sMyeB3phCj4exuIHw5nQ-wqDA/viewform?usp=header",
  CONTACT_FORM_URL: "https://docs.google.com/forms/d/e/1FAIpQLSf8R5XK8VqX9pZ5vN3wY7tL2mJ4kD6hS9fA1bC3nE0oP2gH7Q/viewform?usp=header",
  SALE_START: new Date("2026-07-04T00:00:00+05:30"),
  SALE_END: new Date("2026-07-06T23:59:59+05:30"),
  SALE_WINDOW_LABEL: "Prime Day 2026",
  PRE_SALE_LABEL: "Prime Day 2026 starts soon!",
  DURING_SALE_LABEL: "Prime Day 2026 is live!",
  POST_SALE_LABEL: "Prime Day 2026 has ended",
  SITE_NAME: "Pocket Friendly Loot",
  SITE_URL: "https://pf-loots.netlify.app",
};
/* =========================================================== */

/** Point every Telegram CTA on the page (any element with [data-telegram-cta]) at the real channel. */
export function wireTelegramButtons() {
  qsa("[data-telegram-cta]").forEach((el) => {
    el.href = CONFIG.TELEGRAM_CHANNEL_URL;
  });
}

/** Stamp the current year into any [data-current-year] element in the footer. */
export function setFooterYear() {
  qsa("[data-current-year]").forEach((el) => {
    el.textContent = new Date().getFullYear();
  });
}

/** Run on every page, before any page-specific module initializes. */
export function initShared() {
  wireTelegramButtons();
  setFooterYear();
  initNavButtons();
}

/** Go to Top + Back buttons: show/hide on scroll, smooth scroll, history back. */
export function initNavButtons() {
  const topBtn = document.getElementById("btn-top");
  const backBtn = document.getElementById("btn-back");

  if (topBtn) {
    topBtn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          topBtn.classList.toggle("is-visible", window.scrollY > 300);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  if (backBtn) {
    if (document.referrer && document.referrer.startsWith(location.origin)) {
      backBtn.classList.add("is-visible");
    } else if (window.history.length > 1) {
      backBtn.classList.add("is-visible");
    }
    backBtn.addEventListener("click", () => window.history.back());
  }
}
