/* ==========================================================================
   app.js
   The one file every page imports first. Holds the single source of
   truth for config (sheet URLs, dates, Telegram link) and a couple of
   bootstrap helpers needed on literally every page. Page-specific logic
   (products, search, blogs, etc.) lives in its own module and imports
   CONFIG from here — never duplicates it.
   ========================================================================== */

import { qs, qsa } from "./utils.js";

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
  /* Replace the entry IDs below with the actual ones from your Google Form.
     Open the form in edit mode, click a field → three-dot menu → "Get pre-filled link",
     then copy the "entry.1234567890" value for each field. */
  NEWSLETTER_ENTRY_NAME: "entry.2005620554",
  NEWSLETTER_ENTRY_EMAIL: "entry.1045781291",
  NEWSLETTER_ENTRY_THOUGHT: "entry.839337160",
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

/** On mobile, show a confirmation dialog instead of navigating directly. */
function initTelegramDialog() {
  var dialog = document.createElement("div");
  dialog.className = "tg-dialog";
  dialog.innerHTML =
    '<div class="tg-dialog-overlay"></div>' +
    '<div class="tg-dialog-box" role="dialog" aria-labelledby="tg-dialog-title">' +
      '<svg class="tg-dialog-icon" width="56" height="56" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>' +
      '<h3 id="tg-dialog-title">Join Telegram</h3>' +
      '<p>Get instant deal alerts on Telegram.</p>' +
      '<div class="tg-dialog-actions">' +
        '<a class="btn-primary" href="' + CONFIG.TELEGRAM_CHANNEL_URL + '" target="_blank" rel="noopener">Open Telegram</a>' +
        '<button class="btn-ghost tg-dialog-close">Maybe later</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(dialog);

  var close = function () { dialog.classList.remove("is-open"); };
  dialog.querySelector(".tg-dialog-close").addEventListener("click", close);

  document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });

  // Intercept clicks on all Telegram CTAs on mobile
  qsa("[data-telegram-cta]").forEach(function (el) {
    el.addEventListener("click", function (e) {
      if (window.innerWidth <= 768) {
        e.preventDefault();
        dialog.classList.add("is-open");
      }
    });
  });
}

/** Stamp the current year into any [data-current-year] element in the footer. */
export function setFooterYear() {
  qsa("[data-current-year]").forEach((el) => {
    el.textContent = new Date().getFullYear();
  });
}

/** Show a temporary toast notification at the top of the viewport. */
export function showToast(message) {
  var existing = qs(".app-toast");
  if (existing) existing.remove();
  var toast = document.createElement("div");
  toast.className = "app-toast";
  toast.textContent = message;
  toast.setAttribute("role", "status");
  toast.setAttribute("aria-live", "polite");
  document.body.appendChild(toast);
  setTimeout(function () {
    toast.classList.add("app-toast--hide");
    setTimeout(function () { toast.remove(); }, 400);
  }, 3000);
}

/** Listen for online/offline events. Shows a toast and reloads when the network recovers. */
export function initNetworkDetection() {
  if (window._networkInitDone) return;
  window._networkInitDone = true;
  window.addEventListener("offline", function () {
    showToast("You're offline. Deals will update when reconnected.");
  });
  window.addEventListener("online", function () {
    showToast("Connection restored. Updating deals...");
    setTimeout(function () { window.location.reload(); }, 1500);
  });
}

/** Run on every page, before any page-specific module initializes. */
export function initShared() {
  wireTelegramButtons();
  initTelegramDialog();
  setFooterYear();
  initNetworkDetection();
  initNavButtons();
  initExternalLinkHandler();
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

/** Show a centered notification when users click links that leave the site. */
var _toastEl = null;
var _toastTimer = null;
var _pendingUrl = null;

/** Derive a friendly destination name from a URL. */
function getSiteName(url) {
  try {
    var host = new URL(url).hostname.replace(/^www\./, "");
    if (/amazon/i.test(host)) return "Amazon";
    if (/t\.me|telegram/i.test(host)) return "Telegram";
    if (/flipkart/i.test(host)) return "Flipkart";
    if (/ebay/i.test(host)) return "eBay";
    if (/walmart/i.test(host)) return "Walmart";
    if (/bestbuy|best.?buy/i.test(host)) return "Best Buy";
    if (/target/i.test(host)) return "Target";
    if (/aliexpress/i.test(host)) return "AliExpress";
    if (/shopify/i.test(host)) return "Shopify";
    if (/google/i.test(host)) return "Google";
    return host.split(".")[0].charAt(0).toUpperCase() + host.split(".")[0].slice(1);
  } catch (e) {
    return "link";
  }
}

function showExternalToast(url) {
  _pendingUrl = url;

  var siteName = getSiteName(url);

  if (!_toastEl) {
    _toastEl = document.createElement("div");
    _toastEl.className = "ext-link-toast";
    _toastEl.innerHTML =
      '<svg class="ext-link-toast-icon" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>' +
      '<h3 class="toast-title"></h3>' +
      '<p class="toast-domain"></p>' +
      '<div class="toast-progress"><div class="toast-progress-bar"></div></div>' +
      '<div class="toast-actions">' +
        '<button class="btn-ghost toast-cancel">Cancel</button>' +
        '<button class="btn-primary toast-open">Open now</button>' +
      '</div>';
    document.body.appendChild(_toastEl);

    _toastEl.querySelector(".toast-cancel").addEventListener("click", function () {
      dismissExternalToast();
    });
    _toastEl.querySelector(".toast-open").addEventListener("click", function () {
      if (_pendingUrl) {
        clearTimeout(_toastTimer);
        var win = window.open(_pendingUrl, "_blank", "noopener");
        if (!win) window.location.href = _pendingUrl;
        dismissExternalToast();
      }
    });
  }

  _toastEl.querySelector(".toast-title").textContent = "Open in " + siteName;
  _toastEl.querySelector(".toast-domain").textContent = url;

  _toastEl.classList.add("is-visible");

  var bar = _toastEl.querySelector(".toast-progress-bar");
  bar.classList.remove("is-shrinking");
  requestAnimationFrame(function () {
    requestAnimationFrame(function () {
      bar.classList.add("is-shrinking");
    });
  });

  _toastTimer = setTimeout(function () {
    if (_pendingUrl) {
      var win = window.open(_pendingUrl, "_blank", "noopener");
      if (!win) window.location.href = _pendingUrl;
      dismissExternalToast();
    }
  }, 5000);
}

function dismissExternalToast() {
  if (_toastEl) _toastEl.classList.remove("is-visible");
  _pendingUrl = null;
  if (_toastTimer) { clearTimeout(_toastTimer); _toastTimer = null; }
}

/** Programmatic trigger so other modules (e.g. card dead-space click) can
 *  show the same notification instead of opening directly. */
export function navigateExternal(url) {
  showExternalToast(url);
}

function initExternalLinkHandler() {
  var siteHost = location.hostname;
  document.addEventListener("click", function (e) {
    if (e.defaultPrevented) return;

    var link = e.target.closest("a");
    if (!link) return;

    if (link.closest(".tg-dialog")) return;
    // Show notification for Telegram on laptop; phone has its own dialog
    if (link.hasAttribute("data-telegram-cta") && window.innerWidth <= 768) return;

    var href = link.getAttribute("href");
    if (!href || href.startsWith("#") || href.startsWith("javascript:")) return;

    try {
      var url = new URL(href, window.location.href);
    } catch (e) { return; }
    if (url.hostname === siteHost) return;

    e.preventDefault();
    showExternalToast(href);
  });
}
