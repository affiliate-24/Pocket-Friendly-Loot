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
} from "./utils.js";
import { loadDeals, buildCardHTML } from "./products.js";

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
  container.innerHTML = sorted
    .map(
      (post) => `
      <a class="teaser-card" href="blogs.html?slug=${encodeURIComponent(post.Slug)}" data-animate>
        <img src="${post.Hero_Image_URL}" alt="${post.Title}" loading="lazy">
        <div class="teaser-body">
          ${post.Category ? `<div class="teaser-tag">${post.Category}</div>` : ""}
          <h3>${post.Title}</h3>
          <p>${post.Excerpt || ""}</p>
        </div>
      </a>`
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

  qs("#article-hero-img").src = post.Hero_Image_URL;
  qs("#article-hero-img").alt = post.Title;
  qs("#article-title").textContent = post.Title;
  qs("#article-meta").innerHTML = `
    <span>${post.Author || CONFIG.SITE_NAME}</span>
    <span>•</span>
    <span>${new Date(post.Published_Date).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</span>
    <span>•</span>
    <span>${readingTime} min read</span>`;
  qs("#article-content").innerHTML = html;

  const tocEl = qs("#article-toc");
  if (toc.length) {
    tocEl.innerHTML = `<h4>On this page</h4>` + toc.map((t) => `<a class="toc-link" href="#${t.id}">${t.text}</a>`).join("");
  } else {
    tocEl.closest(".toc")?.setAttribute("hidden", "true");
  }

  if (post.Recommended_Product_SNos) {
    const deals = await loadDeals();
    const recommended = findByIds(deals, "S_No", post.Recommended_Product_SNos);
    const recEl = qs("#recommended-products");
    if (recommended.length && recEl) {
      recEl.innerHTML = `<h3>Recommended products</h3>` + recommended.map(buildCardHTML).join("");
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
  setTag('meta[property="og:image"]', "content", post.Hero_Image_URL || "");
  setTag('meta[name="twitter:title"]', "content", post.Title);
  setTag('meta[name="twitter:description"]', "content", post.Excerpt || "");
  setTag('meta[name="twitter:image"]', "content", post.Hero_Image_URL || "");
  setTag('link[rel="canonical"]', "href", `${CONFIG.SITE_URL}/blogs.html?slug=${post.Slug}`);

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
