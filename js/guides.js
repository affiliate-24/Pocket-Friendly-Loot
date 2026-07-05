/* ==========================================================================
   guides.js
   Renders the Best_Products tab. Unlike Blogs/Gift_Ideas, one "guide" is
   spread across multiple rows (one per ranked product), so the first
   job is grouping rows by Slug before anything else can render.
   ========================================================================== */

import { CONFIG } from "./app.js";
import { fetchCSV, qs, getQueryParam, findById, formatMoney } from "./utils.js";
import { loadDeals } from "./products.js";

export function groupBySlug(rows) {
  const groups = new Map();
  rows.forEach((row) => {
    if (!groups.has(row.Slug)) {
      groups.set(row.Slug, { title: row.List_Title, slug: row.Slug, category: row.Category, rows: [] });
    }
    groups.get(row.Slug).rows.push(row);
  });
  groups.forEach((g) => g.rows.sort((a, b) => parseFloat(a.Rank) - parseFloat(b.Rank)));
  return Array.from(groups.values());
}

export async function initBestProductsPage() {
  const slug = getQueryParam("slug");
  const [rankRows, deals] = await Promise.all([fetchCSV(CONFIG.SHEETS.bestProducts), loadDeals()]);
  const allGuides = groupBySlug(rankRows);

  if (slug) {
    const guide = allGuides.find((g) => g.slug === slug);
    if (!guide) {
      renderNotFound();
      return;
    }
    renderGuideDetail(guide, deals);
  } else {
    renderListing(allGuides, deals);
  }
}

function renderListing(guides, deals) {
  const container = qs("#guides-listing");
  if (!container) return;

  if (!guides.length) {
    container.innerHTML = `<div class="state-empty"><div class="display">No ranked lists yet</div><div>Add rows to the Best_Products tab.</div></div>`;
    return;
  }

  container.innerHTML = guides
    .map((guide) => {
      const topRows = guide.rows.slice(0, 5);
      const rowsHTML = topRows
        .map((row) => {
          const product = findById(deals, "S_No", row.S_No);
          if (!product) return "";
          return `
            <div class="rank-row">
              <span class="badge badge-rank">#${row.Rank}</span>
              <img src="${product.Image_URL}" alt="${product.Product_Name}" loading="lazy">
              <div class="rank-info">
                <div class="rank-name">${product.Product_Name}</div>
                ${row.Ranking_Note ? `<div class="rank-note">${row.Ranking_Note}</div>` : ""}
              </div>
              <div class="rank-price">${formatMoney(product.Sale_Price)}</div>
            </div>`;
        })
        .join("");
      if (!rowsHTML) return "";
      return `
        <div class="guide-card" data-animate>
          <h3><a href="best-products.html?slug=${encodeURIComponent(guide.slug)}">${guide.title}</a></h3>
          ${rowsHTML}
        </div>`;
    })
    .filter(Boolean)
    .join("");
}

function buildComparisonTable(guide, deals) {
  const products = guide.rows.map((row) => ({ row, product: findById(deals, "S_No", row.S_No) })).filter((x) => x.product);
  if (!products.length) return "";

  // Collect whichever Spec labels are actually used across these products
  const specSlots = ["Spec1", "Spec2", "Spec3"];
  const usedLabels = new Set();
  products.forEach(({ product }) => {
    specSlots.forEach((slot) => {
      const label = product[`${slot}_Label`];
      if (label) usedLabels.add(label);
    });
  });

  const specLookup = (product, label) => {
    for (const slot of specSlots) {
      if (product[`${slot}_Label`] === label) return product[`${slot}_Value`] || "—";
    }
    return "—";
  };

  const header = `<tr><th>Rank</th><th>Product</th><th>Price</th><th>Rating</th>${[...usedLabels].map((l) => `<th>${l}</th>`).join("")}</tr>`;
  const body = products
    .map(
      ({ row, product }) => `
      <tr>
        <td>#${row.Rank}</td>
        <td>${product.Product_Name}</td>
        <td>${formatMoney(product.Sale_Price)}</td>
        <td>${product.Rating ? `${product.Rating} ★` : "—"}</td>
        ${[...usedLabels].map((l) => `<td>${specLookup(product, l)}</td>`).join("")}
      </tr>`
    )
    .join("");

  return `<table class="compare-table"><thead>${header}</thead><tbody>${body}</tbody></table>`;
}

function renderGuideDetail(guide, deals) {
  qs("#guides-listing-view")?.setAttribute("hidden", "true");
  const detailView = qs("#guide-detail-view");
  detailView?.removeAttribute("hidden");

  document.title = `${guide.title} — ${CONFIG.SITE_NAME}`;
  qs("#guide-title").textContent = guide.title;

  const rowsHTML = guide.rows
    .map((row) => {
      const product = findById(deals, "S_No", row.S_No);
      if (!product) return "";
      return `
        <div class="rank-row">
          <span class="badge badge-rank">#${row.Rank}</span>
          <img src="${product.Image_URL}" alt="${product.Product_Name}" loading="lazy">
          <div class="rank-info">
            <div class="rank-name"><a href="${product.Affiliate_Link}" target="_blank" rel="noopener sponsored nofollow">${product.Product_Name}</a></div>
            ${row.Ranking_Note ? `<div class="rank-note">${row.Ranking_Note}</div>` : ""}
          </div>
          <div class="rank-price">${formatMoney(product.Sale_Price)}</div>
        </div>`;
    })
    .join("");
  qs("#guide-rank-list").innerHTML = rowsHTML;
  qs("#guide-compare-table").innerHTML = buildComparisonTable(guide, deals);
}

function renderNotFound() {
  const detailView = qs("#guide-detail-view");
  if (detailView) {
    detailView.removeAttribute("hidden");
    detailView.innerHTML = `<div class="state-empty"><div class="display">Guide not found</div></div>`;
  }
}
