/* ==========================================================================
   animations.js
   Three independent pieces of "things that move": the Prime Day
   countdown, the scrolling category ticker, and a generic scroll-reveal
   observer that any page can opt into with a [data-animate] attribute.
   ========================================================================== */

import { CONFIG } from "./app.js";
import { qs, qsa } from "./utils.js";

function pad(n) {
  return String(n).padStart(2, "0");
}

export function initCountdown() {
  const labelEl = qs("#countdown-label");
  const dEl = qs("#cd-d"), hEl = qs("#cd-h"), mEl = qs("#cd-m"), sEl = qs("#cd-s");
  if (!labelEl || !dEl) return;

  function tick() {
    const now = new Date();
    let target, label;
    if (now < CONFIG.SALE_START) { target = CONFIG.SALE_START; label = "Sale starts in"; }
    else if (now <= CONFIG.SALE_END) { target = CONFIG.SALE_END; label = "Sale ends in"; }
    else { target = null; label = "Prime Day has ended — see you at the next sale"; }

    labelEl.textContent = label;
    if (!target) {
      [dEl, hEl, mEl, sEl].forEach((el) => (el.textContent = "00"));
      return;
    }
    const diff = Math.max(0, target - now);
    dEl.textContent = pad(Math.floor(diff / 86400000));
    hEl.textContent = pad(Math.floor((diff % 86400000) / 3600000));
    mEl.textContent = pad(Math.floor((diff % 3600000) / 60000));
    sEl.textContent = pad(Math.floor((diff % 60000) / 1000));
  }
  tick();
  setInterval(tick, 1000);
}

export function initTicker(words = ["ELECTRONICS", "FASHION", "HOME & KITCHEN", "BEAUTY", "BOOKS", "EVERYDAY ESSENTIALS"]) {
  const ticker = qs("#ticker");
  if (!ticker) return;
  const html = words.map((w) => `<span><b>•</b> ${w}</span>`).join("");
  ticker.innerHTML = html + html; // doubled so the -50% keyframe loops seamlessly
}

/** Fades/slides in any [data-animate] element the first time it enters the viewport. */
export function initScrollReveal() {
  const targets = qsa("[data-animate]");
  if (!targets.length || !("IntersectionObserver" in window)) {
    targets.forEach((el) => el.classList.add("is-visible"));
    return;
  }
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1 }
  );
  targets.forEach((el) => observer.observe(el));
}

/** Call after dynamically injecting new [data-animate] elements (e.g. after a CSV load) so they get observed too. */
export function refreshScrollReveal() {
  initScrollReveal();
}
