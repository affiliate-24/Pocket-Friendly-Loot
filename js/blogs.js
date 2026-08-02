/* ==========================================================================
   blogs.js
   Single page (blogs.html) handles both the listing view and, when a
   ?slug= is present, a full article view — the standard no-backend
   "template + query param" pattern used the same way by guides.js and
   gifts.js.
   ========================================================================== */

import { CONFIG } from "./app.js";
import {
  fetchCSV,
  qs,
  getQueryParam,
  parseLiteContent,
  calcReadingTime,
  findByIds,
  escapeHtml, // imported for XSS protection on sheet-derived strings (Title, Excerpt, etc.)
} from "./utils.js";
import { loadDeals, buildCardHTML, setupCardInteractions } from "./products.js"; // setupCardInteractions added to wire wishlist on recommended products
import { buildTeaserCardHTML } from "./templates.js";

export async function initBlogsPage() {
  const slug = getQueryParam("slug");
  const blogs = await fetchCSV(CONFIG.SHEETS.blogs);

  if (slug) {
    const post = blogs.find((b) => b.Slug === slug);
    if (!post) {
      renderNotFound();
      return;
    }
    await renderArticle(post);
  } else {
    renderListing(blogs);
  }
}

function renderListing(blogs) {
  const container = qs("#blog-listing");
  const headerEl = qs("#page-header-title");
  if (headerEl) headerEl.textContent = "Blogs";
  if (!container) return;

  if (!blogs.length) {
    container.innerHTML = `<div class="state-empty"><div class="display">No articles yet</div><div>Add a row to the Blogs tab.</div></div>`;
    return;
  }

  const sorted = blogs.slice().sort((a, b) => new Date(b.Published_Date) - new Date(a.Published_Date));
  // Escape every sheet-derived string to prevent stored XSS via a malicious Blogs row.
  container.innerHTML = sorted
    .map((post) =>
      buildTeaserCardHTML({
        img: post.Hero_Image_URL ? encodeURI(post.Hero_Image_URL) : "",
        title: escapeHtml(post.Title || ""),
        desc: post.Excerpt ? escapeHtml(post.Excerpt) : "",
        tag: post.Category ? escapeHtml(post.Category) : "",
        href: `blogs.html?slug=${encodeURIComponent(post.Slug || "")}`,
      })
    )
    .join("");
}

async function renderArticle(post) {
  document.title = `${post.Title} — ${CONFIG.SITE_NAME}`;
  setMetaTags(post);

  qs("#article-listing-view")?.setAttribute("hidden", "true");
  const articleView = qs("#article-detail-view");
  articleView?.removeAttribute("hidden");

  const { html, toc, wordCount } = parseLiteContent(post.Content);
  const readingTime = calcReadingTime(wordCount);

  // encodeURI on the hero image URL guards against attribute-injection (e.g. " javascript:...")
  qs("#article-hero-img").src = post.Hero_Image_URL ? encodeURI(post.Hero_Image_URL) : "";
  qs("#article-hero-img").alt = post.Title;  // alt via setAttribute is safe (does not parse HTML)
  qs("#article-title").textContent = post.Title;  // textContent is XSS-safe by design
  // escapeHtml on Author prevents markup injection via the article-meta innerHTML assignment below.
  qs("#article-meta").innerHTML = `
    <span>${escapeHtml(post.Author || CONFIG.SITE_NAME)}</span>
    <span>•</span>
    <span>${new Date(post.Published_Date).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</span>
    <span>•</span>
    <span>${readingTime} min read</span>`;
  // article-content `html` is produced by parseLiteContent which already escapes inside its own pipeline — safe.
  qs("#article-content").innerHTML = html;

  const tocEl = qs("#article-toc");
  if (toc.length) {
    // escapeHtml on t.text prevents XSS from sheet content; t.id is slugified internally (safe).
    tocEl.innerHTML = `<h4>On this page</h4>` + toc.map((t) => `<a class="toc-link" href="#${t.id}">${escapeHtml(t.text)}</a>`).join("");
  } else {
    tocEl.closest(".toc")?.setAttribute("hidden", "true");
  }

  if (post.Recommended_Product_SNos) {
    const deals = await loadDeals();
    const recommended = findByIds(deals, "S_No", post.Recommended_Product_SNos);
    const recEl = qs("#recommended-products");
    if (recommended.length && recEl) {
      recEl.innerHTML = `<h3>Recommended products</h3>` + recommended.map(buildCardHTML).join("");
      // Wire up wishlist toggle + accessible whole-card click for the recommended product cards
      // (Issue #3 — previously missing, so heart buttons were dead on blog article pages).
      setupCardInteractions(recEl);
    }
  }
}

function setMetaTags(post) {
  const setTag = (selector, attr, value) => {
    const el = qs(selector);
    if (el) el.setAttribute(attr, value);
  };
  setTag('meta[name="description"]', "content", post.Excerpt || "");
  setTag('meta[property="og:title"]', "content", post.Title);
  setTag('meta[property="og:description"]', "content", post.Excerpt || "");
  // Encode the image URL to neutralize any attribute-injection attempt from a sheet row.
  setTag('meta[property="og:image"]', "content", post.Hero_Image_URL ? encodeURI(post.Hero_Image_URL) : "");
  setTag('meta[name="twitter:title"]', "content", post.Title);
  setTag('meta[name="twitter:description"]', "content", post.Excerpt || "");
  setTag('meta[name="twitter:image"]', "content", post.Hero_Image_URL ? encodeURI(post.Hero_Image_URL) : "");
  setTag('link[rel="canonical"]', "href", `${CONFIG.SITE_URL}/blogs.html?slug=${encodeURIComponent(post.Slug)}`);

  // Schema.org Article structured data, injected fresh per article
  const schema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.Title,
    image: post.Hero_Image_URL,
    datePublished: post.Published_Date,
    author: { "@type": "Person", name: post.Author || CONFIG.SITE_NAME },
  };
  let schemaTag = qs("#article-schema");
  if (!schemaTag) {
    schemaTag = document.createElement("script");
    schemaTag.type = "application/ld+json";
    schemaTag.id = "article-schema";
    document.head.appendChild(schemaTag);
  }
  schemaTag.textContent = JSON.stringify(schema);
}

function renderNotFound() {
  const articleView = qs("#article-detail-view");
  if (articleView) {
    articleView.removeAttribute("hidden");
    articleView.innerHTML = `<div class="state-empty"><div class="display">Article not found</div><div>It may have been moved or removed.</div></div>`;
  }
}
