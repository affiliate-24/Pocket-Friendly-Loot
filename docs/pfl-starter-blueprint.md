# PFL Starter — Developer Handoff Spec (v1)

> Status: Ready to hand off. Target reader: a competent JS developer (the friend).
> Reference implementation: this repo (`Pocket-Friendly-Loot`) — `scripts/build.mjs`, `js/templates.js`, `js/utils.js`, `netlify-build-hook.gs`, `scripts/test-*.mjs` are the proven pieces this starter ports from.

## 1. Context & goal

Amazon Associates affiliate sites fed entirely by Google Sheets. The existing site (this repo) proved the pattern: static HTML + build-time sheet fetching = near-instant first load, zero runtime Google requests, content updated by editing a sheet (auto-rebuild via Netlify Build Hook + Apps Script).

We are now building **2–3 new sites in different niches**. Requirements, in order of importance:

1. **No lag / no slow loads** — static-first, data baked in at build time. No runtime fetch from Google (fallback only).
2. **One standard approach for all sites** — a reusable starter template; each new site = clone + config, not a rewrite.
3. **Schema-agnostic** — each niche has a *different* sheet structure. The starter must accept any column layout via config, not hardcoded column names.
4. **Scales when products grow** — the architecture must not degrade at a few hundred products.
5. **Same automation** — sheet edit → auto-rebuild → live in ~60s, per site.

## 2. Tech stack (decision + why)

| Layer | Choice | Why |
|---|---|---|
| Framework | **Astro (latest, static output)** | Component model + static-first + per-entity URLs + islands only where needed. Nothing better exists for this use case (Hugo = no component reuse, 11ty = no islands, Next/SvelteKit = needless server runtime) |
| Language | TypeScript for config/lib; pages `.astro` | Safety + friendlier config files |
| Sheet fetching | Node built-in `fetch` + **PapaParse** (already used in the reference repo) | Zero extra deps, proven in the current build |
| Hosting | Netlify, Git-connected, one repo+site per niche | Already the stack; build hooks for auto-rebuild |
| Tests | Playwright (Chromium) — same approach as reference repo's `scripts/test-*.mjs` | Proved to catch regressions |
| Build trigger | Google Apps Script (`netlify-build-hook.gs`), 30s debounce, on-edit trigger | Already working on the current site |

**Hard requirement:** build must run on Netlify's Node 20+ (global `fetch`, `AbortSignal.timeout`). Pin all deps via committed `package-lock.json`.

## 3. Repository layout (separate repos per site)

```
pfl-starter  (template repo, private)
  |-- Use this template --> site-alpha (repo + Netlify site)
  |-- Use this template --> site-beta
```

Template repo structure:

```
pfl-starter/
  astro.config.mjs          # static output -> dist/
  netlify.toml              # command = "npm run build", publish = "dist"
  package.json              # build = "astro build" (+ prebuild fetch), preview, serve, test
  src/
    layouts/Base.astro      # <head> meta, CSS vars, nav, footer, back/top buttons
    components/             # Card.astro, TeaserCard, CategoryCard, GuideCard, Skeleton,
                            #   NewsletterForm (port from templates.js markup)
    pages/
      index.astro
      deals/[cat].astro     # getStaticPaths from categories sheet
      deals/index.astro
      blogs/index.astro
      blogs/[slug].astro    # real per-article URLs (SEO)
      gifts/index.astro
      search.astro          # client-side filter (one page)
      about.astro, contact.astro, terms.astro, privacy.astro,
      affiliate-disclosure.astro, 404.astro
    lib/
      sheets.ts             # fetch + PapaParse + per-sheet retry/backoff (30s timeout, 3 retries)
      normalize.ts          # maps raw rows -> typed Deal/Blog/Category/Gift using site-config
      site-config.ts        # <<< THE ONLY PER-SITE FILE (see §5)
  public/
    favicon/, robots.txt, og-image.png, manifest
  netlify-build-hook.gs    # copy of Apps Script; per-site: paste hook URL
  scripts/
    serve.mjs, verify.mjs, test-suite.mjs  # same style as reference repo
  tests/  (fixtures, mock sheets JSON for CI without network)
```

## 4. Hard architectural rules

1. **No runtime Google requests.** After build, pages load data from pre-rendered HTML. Client-side JS (`deals/[cat]` filters, `search`) may consume a small embedded JSON blob — but that blob is produced **at build time**, cached, and never re-fetched.
2. **Graceful degradation.** If a sheet fails at build: log loudly, deploy anyway, and let that page use the existing runtime fallback (reference: `fetchCSV` in `js/utils.js`). A bad sheet must never kill the site.
3. **Unknown columns are ignored.** Adding a column to a sheet never breaks the build.
4. **No escaped-string hackery.** (Lesson from the current site's `install_bookmarklet.html` — corrupted by a truncated escaped string. Code shipped inside pages must be generated from real functions / `.toString()`, never hand-escaped strings.)
5. **Markup shared = single source.** All card/teaser markup lives in Astro components only. No duplicated markup in pages.

## 5. Per-site configuration — `src/lib/site-config.ts`

This single file is the only thing a new site must edit (plus branding assets). Full example:

```ts
export const siteConfig = {
  name: "Niche Site Alpha",
  domain: "alpha.example.com",
  amazonTag: "yourtag-21",                 // Amazon Associate tag
  theme: {                                 // CSS custom properties
    bg: "#12122B", surface: "#1B1B3F", gold: "#FFB627",
    text: "#F5F3EC", muted: "#9B98B8",
    font: "Space Grotesk / Inter / JetBrains Mono",
  },
  nav: ["Home", "Deals", "Categories", "Blogs", "Gifts", "About"],
  sheets: {
    deals: {                              // any subset of these blocks; each optional
      url: "https://docs.google.com/spreadsheets/d/e/2PACX-.../pub?output=csv",
      columns: {                          // map sheet header -> normalized field
        title: "Product Name",
        category: "Category",
        originalPrice: "MRP",
        salePrice: "Price",
        image: "Image URL",
        link: "Affiliate Link",
        rating: "Rating",
        reviews: "Review Count",
        custom: ["Warranty", "Specs"],    // extra fields passed through to the card
      },
    },
    categories: { url: "...", columns: { name: "Category", slug: "Slug", image: "Image" } },
    blogs:      { url: "...", columns: { slug: "Slug", title: "Title", date: "Date",
                                         content: "Content (HTML)", image: "Image" } },
    giftIdeas:  { url: "...", columns: { title: "Name", link: "Link", image: "Image" } },
  },
  lists: {                                // which page sections each list page shows
    home: { deals: 4, categories: 6, blogs: 3, gifts: 3 },
    dealsPage: 12, blogsPage: 0, giftsPage: 0,
  },
  features: { newsletter: true, search: true, backToTop: true },
}
```

- Any sheet can be **absent** → that section/page is omitted from the build (no dead links).
- `columns` maps **any** header names → normalized fields, so a fitness niche (rating, difficulty) and a tech niche (specs, warranty) both work with zero code changes.
- `custom` fields render as extra metadata lines on the card (component handles missing values).

## 6. Routes & pages spec

| Route | Type | Data source | Notes |
|---|---|---|---|
| `/` | static | deals + categories + blogs + gifts | config-driven section counts |
| `/deals/` | static | deals | paginated (see §10) |
| `/deals/[cat]/` | generated (`getStaticPaths`) | categories + deals filtered | real URLs per category |
| `/blogs/` | static | blogs | teaser list |
| `/blogs/[slug]/` | generated | blogs | real per-article URL; includes recommended products block |
| `/gifts/` | static | giftIdeas | optional per site |
| `/search/?q=` | client-side | embedded build-time JSON | one page, filter in JS |
| `/about`, `/contact`, `/terms`, `/privacy`, `/affiliate-disclosure`, `/404` | static | none | boilerplate from template |

SEO requirements: per-entity pages get their own `<title>`, meta description, canonical, OG tags; `sitemap.xml` + `robots.txt` generated at build from real routes; `404` matches site theme.

## 7. Branding & theming

All colors/fonts come from `theme` in `site-config.ts` → emitted as CSS variables by `Base.astro`. Per site, the friend only replaces: logo, favicon, OG image, brand name, domain. No CSS edits needed unless a niche wants a truly custom look.

## 8. Automation (identical to current site, parameterized)

1. **`netlify-build-hook.gs`** — Apps Script (attached to each site's main sheet): 30s debounce on any edit → POST to the site's Netlify build hook → deploy ~60s later. Per-site edit: paste hook URL, run `install` once, add on-edit trigger.
2. **Failure handling** — if the hook returns non-2xx, log to the sheet (a "Deploy status" cell) so the site owner sees failures without opening Netlify.
3. **`netlify.toml`**: `command = "npm run build"`, `publish = "dist"`, Node version pinned.

## 9. Testing & verification spec (per site)

- **Build-time:** `verify.mjs` — every expected route exists, every sheet parsed, JSON blobs present, zero placeholder text (`__TAG__`, `PASTE_`, `lorem`) leaked into output.
- **Browser suite (Playwright):** loads every route; asserts rendered cards, filters, search, blogs detail, 404 page; **asserts zero requests to `docs.google.com` / `sheets.googleapis.com`** on all loads.
- **Fallback test:** serve the site with a deliberately broken sheet → pages still render via runtime fallback.
- **Clean-build test:** `npm ci` from scratch + full build (same as reference repo's simulation).
- **Acceptance gate:** all suites green before a site ships.

## 10. Scaling rules

- **List pages paginate** at a config threshold (default 24 items/page).
- **Every entity gets its own small static page** — 100 or 5,000 products cost the same per-page; no giant inline JSON per page.
- **Build-time budget:** warn if a site's build exceeds ~90s (sheets grow → fetch once, per-entity pages are cheap).
- **When a site outgrows static** (≈5–10k products with frequent changes): switch that one site to Astro's **hybrid/server mode** (prerender most pages, on-demand-render hot ones via Netlify Functions) — architecture unchanged, no rewrite.

## 11. Developer checklist — creating a new site

1. `Use this template` → new repo; clone locally.
2. `npm ci`; `npm run build` → confirm the default (demo config) builds green.
3. Edit `src/lib/site-config.ts`: sheets URLs, column mapping, tag, name, domain, theme, nav, features.
4. Replace `public/` branding assets (logo, favicon, og-image).
5. `npm test` (local mock sheets fixture) → green.
6. Push to new repo → create Netlify site (Git-connected, branch `main`) → verify deploy.
7. Create Build Hook in Netlify → paste into `netlify-build-hook.gs` → attach script to the site's sheet → run `install` once → add on-edit trigger.
8. Edit a row in the sheet → confirm auto-deploy within ~60s → confirm live page updated.
9. Final acceptance: Playwright suite against the **live URL** (incl. zero-Google-request assertion).

## 12. Effort estimate (for the friend)

- Starter template: ~1–2 focused days (scaffold, config layer, components, data loader, tests, automation wiring)
- Each new site from the starter: **½–1 day** (config + branding + deploy + acceptance), assuming the client supplies the data pack (see `niche-data-pack-template.md`)
