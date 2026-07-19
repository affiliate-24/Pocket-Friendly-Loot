/* ==========================================================================
   papafallback.js
   Handles PapaParse loading with CDN fallback to local copy, offline
   detection banner, and auto-recovery when the network is restored.
   Loaded via <script defer> after the CDN PapaParse script tag on every
   page that uses PapaParse.
   ========================================================================== */
(function () {
  "use strict";
  var BANNER_ID = "papa-offline-banner";
  function showBanner() {
    if (document.getElementById(BANNER_ID)) return;
    var b = document.createElement("div");
    b.id = BANNER_ID;
    b.style.cssText = "position:fixed;top:0;left:0;right:0;z-index:9999;background:#FFB627;color:#1A1A1A;text-align:center;padding:12px 20px;font-weight:600;font-size:14px;box-shadow:0 2px 8px rgba(0,0,0,0.2);";
    b.textContent = "You're offline. Product data will load automatically when your connection is restored.";
    document.body.prepend(b);
  }
  function hideBanner() {
    var b = document.getElementById(BANNER_ID);
    if (b) b.remove();
  }
  function loadLocalPapa() {
    if (window.Papa) return;
    var s = document.createElement("script");
    s.src = "assets/papaparse.min.js";
    s.defer = true;
    document.head.appendChild(s);
  }
  if (navigator.onLine === false) showBanner();
  window.addEventListener("offline", showBanner);
  window.addEventListener("online", function () {
    hideBanner();
    if (!window.Papa) loadLocalPapa();
  });
  if (!window.Papa && navigator.onLine !== false) loadLocalPapa();
})();
