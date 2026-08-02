/* ==========================================================================
   categories.js
   Loads the Categories tab and renders it two ways: as filter chips
   (reused on Today's Deals, Best Products, etc.) and as full cards on
   the dedicated Categories page.
   ========================================================================== */

import { CONFIG } from "./app.js";
import { fetchCSV, qsa, escapeHtml } from "./utils.js"; // escapeHtml added for XSS protection on sheet content
import { buildCategoryCardHTML } from "./templates.js";

export function loadCategories() {
  return fetchCSV(CONFIG.SHEETS.categories);
}

/**
 * Renders "All" + one chip per category name. `onSelect(categoryName)`
 * fires on click; the caller owns re-filtering and re-rendering chips
 * with the new active state.
 */
export function renderCategoryChips(container, categoryNames, activeCategory, onSelect) {
  const names = ["All Products", ...categoryNames];
  container.innerHTML = names
    .map(
      (name) => {
        // escapeHtml prevents stored XSS if a category name contains HTML markup
        const safeName = escapeHtml(name);
        return `
        <button
          type="button"
          class="chip ${name === activeCategory ? "active" : ""}"
          role="button"
          aria-pressed="${name === activeCategory}"
          data-category="${safeName}"
        >${safeName}</button>`;
      }
    )
    .join("");

  qsa(".chip", container).forEach((chip) => {
    chip.addEventListener("click", () => onSelect(chip.dataset.category));
  });
}

/** Updates an already-rendered chip set's active/aria-pressed state without rebuilding it. */
export function setActiveChip(container, activeCategory) {
  qsa(".chip", container).forEach((chip) => {
    const isActive = chip.dataset.category === activeCategory;
    chip.classList.toggle("active", isActive);
    chip.setAttribute("aria-pressed", String(isActive));
  });
}

/** Full category cards for categories.html — links into Today's Deals pre-filtered by category. */
export function renderCategoryCards(container, categories) {
  if (!categories.length) {
    container.innerHTML = `<div class="state-empty"><div class="display">No categories yet</div><div>Add rows to the Categories tab.</div></div>`;
    return;
  }
  const sorted = categories.slice().sort((a, b) => (parseFloat(a.Sort_Order) || 0) - (parseFloat(b.Sort_Order) || 0));
  container.innerHTML = sorted.map(buildCategoryCardHTML).join("") + `
    <a class="category-card" href="category.html" data-animate>
      <div class="icon" aria-hidden="true">📦</div>
      <h3>All Products</h3>
      <p>Browse every product across all categories.</p>
    </a>`;
}
