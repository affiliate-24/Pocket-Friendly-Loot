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
  SALE_START: new Date("2026-07-04T00:00:00+05:30"),
  SALE_END: new Date("2026-07-06T23:59:59+05:30"),
  SITE_NAME: "Pocket Friendly Loot",
  SITE_URL: "https://your-domain-or-netlify-url.com",
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
}
