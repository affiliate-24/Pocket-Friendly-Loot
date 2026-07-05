# Pocket Friendly Loot — Setup Guide

A multi-page, no-backend affiliate site. Every page is static HTML/CSS/
vanilla JS; all content lives in one Google Sheets workbook (7 tabs);
the Telegram bot posts new deals automatically. No frameworks, no
database, no build step.

## 1. Set up the Google Sheet

1. Create one new Google Sheets workbook.
2. Create 7 tabs, named exactly: `Deals`, `Todays_Deals`, `Trending_Deals`, `Categories`, `Blogs`, `Best_Products`, `Gift_Ideas`.
3. Import the matching file from `sheet-templates/` into each tab (File → Import → Upload → "Replace current sheet" for that tab) — these have the exact headers each page expects, plus one sample row to show the format.
4. **Delete each sample row** before adding real data.
5. The exact columns, types, and how tabs reference each other are documented in `docs/SCHEMA.md` — keep that open while filling in your first few real rows.
6. Publish **each tab separately**: File → Share → Publish to web → pick the specific sheet from the dropdown → format **CSV** → Publish → copy the link.

You'll end up with 7 different CSV links — one per tab.

## 2. Configure the site

Open `js/app.js` and fill in the `CONFIG` object at the top:
- All 7 `SHEETS` URLs from step 1
- `TELEGRAM_CHANNEL_URL` — your channel link
- `NEWSLETTER_FORM_URL` — a Google Form link (see below)
- `SITE_URL` — once you've deployed (step 4), come back and set this for the meta tags/canonical URLs to be correct

## 3. Newsletter signup (no backend)

Create a Google Form with an email field. Form responses write straight
into their own response sheet automatically — that's the entire
"backend." Copy the form's share link into `NEWSLETTER_FORM_URL`.

## 4. Run it locally / deploy it

This is a static site — no build step. To test locally, just open
`index.html` in a browser (or use a simple local server, since `fetch`
sometimes behaves oddly over `file://`). To make it public:
- **Netlify Drop** — drag the whole `mela-deals` folder onto app.netlify.com/drop
- **GitHub Pages** — push the folder to a repo, enable Pages
- **Cloudflare Pages** — same drag-and-drop idea

## 5. Telegram automation

In `automation/`:
1. Follow the Telegram bot/channel setup (BotFather, add bot as channel admin).
2. Open `post_to_telegram.py`, fill in `SHEET_CSV_URL` (use the **Deals** tab's link — the bot watches your master catalog for new products), `BOT_TOKEN`, `CHANNEL_ID`.
3. `pip install -r requirements.txt --break-system-packages`
4. Run `python post_to_telegram.py` whenever you add a new product to the Deals tab — it posts only what it hasn't posted before (tracked in `posted_log.json`).

## 6. Filling rows faster

`automation/install_bookmarklet.html` gives you a one-click bookmark
that reads a product's title/price/image straight off the Amazon page
you're viewing (no extra requests to Amazon — it just reads what's
already loaded in your browser) and copies a ready-to-paste row to your
clipboard.

## 7. Daily workflow

- **New product, anywhere on the site:** add a row to `Deals`, run the Telegram script.
- **Feature it on Today's Deals:** add its `S_No` to `Todays_Deals`.
- **Feature it as trending:** add its `S_No` to `Trending_Deals`.
- **New blog post:** add a row to `Blogs` (writing tips and the lightweight `## heading` format are in `SCHEMA.md`).
- **New ranked list:** add one row per ranked product to `Best_Products`, all sharing the same `Slug`.
- **New gift guide:** add a row to `Gift_Ideas` with comma-separated `Product_SNos`.

Every page picks up the change on its own next load — nothing else to touch.

## Project structure

See `PROJECT_REVIEW.md` for the full file tree, plus the code quality,
performance, accessibility, and SEO review of everything built.
