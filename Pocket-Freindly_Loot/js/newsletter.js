/* ==========================================================================
   newsletter.js
   No backend/database means no custom signup handling — a Google Form
   is the standard no-code way to collect emails, writing each
   submission straight into its own response sheet. This module just
   wires the on-page button/embed to that form.
   ========================================================================== */

import { CONFIG } from "./app.js";
import { qsa } from "./utils.js";

export function initNewsletter() {
  qsa("[data-newsletter-link]").forEach((el) => {
    el.href = CONFIG.NEWSLETTER_FORM_URL;
    el.target = "_blank";
    el.rel = "noopener";
  });

  qsa("[data-newsletter-embed]").forEach((el) => {
    if (CONFIG.NEWSLETTER_FORM_URL.includes("PASTE_YOUR")) return; // don't embed a placeholder
    const iframe = document.createElement("iframe");
    iframe.src = CONFIG.NEWSLETTER_FORM_URL;
    iframe.width = "100%";
    iframe.height = "420";
    iframe.style.border = "none";
    iframe.title = "Newsletter signup form";
    el.appendChild(iframe);
  });
}
