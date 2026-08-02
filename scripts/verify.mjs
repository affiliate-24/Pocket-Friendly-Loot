/* verify.mjs — sanity-check the built dist/ (run with `node scripts/verify.mjs`) */
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "dist");

const pages = (await readdir(ROOT)).filter((f) => f.endsWith(".html"));
let failures = 0;

for (const file of pages) {
  const html = await readFile(path.join(ROOT, file), "utf8");
  const m = html.match(/<script>window\.PAGE_DATA=(\{.*?\});<\/script>/s);
  if (!m) {
    console.log(`FAIL ${file}: no PAGE_DATA script`);
    failures++;
    continue;
  }
  let data;
  try {
    data = JSON.parse(m[1].replace(/\\u003c/g, "<"));
  } catch (e) {
    console.log(`FAIL ${file}: PAGE_DATA not parseable: ${e.message}`);
    failures++;
    continue;
  }
  if (/\<\/script\>/i.test(m[1])) {
    console.log(`FAIL ${file}: raw </script> inside data`);
    failures++;
  }
  const sheetCount = Object.keys(data).length;
  if (sheetCount !== 7) {
    console.log(`WARN ${file}: expected 7 sheets, got ${sheetCount}`);
  }
  const rawCloseCount = (html.match(/<\/script>/g) || []).length;
  const scriptOpenCount = (html.match(/<script/g) || []).length;
  console.log(`OK   ${file}: ${sheetCount} sheets, ${rawCloseCount} </script> closes, ${scriptOpenCount} opens, ${html.length.toLocaleString()} bytes`);
}

const preRenderedIds = [
  ["index.html", ["home-deals-grid", "home-categories-grid", "home-guides-headings", "home-gifts-preview", "home-blogs-preview"]],
  ["todays-deals.html", ["deals-grid"]],
  ["trending-deals.html", ["deals-grid"]],
  ["categories.html", ["deals-grid"]],
  ["category.html", ["deals-grid"]],
  ["blogs.html", ["blog-listing"]],
  ["gift-ideas.html", ["gift-listing"]],
  ["best-products.html", ["guides-listing"]],
];

for (const [file, ids] of preRenderedIds) {
  const html = await readFile(path.join(ROOT, file), "utf8");
  for (const id of ids) {
    const re = new RegExp(`<div\\b[^>]*\\bid="${id}"[^>]*>([^]*?)</div>`);
    const mm = html.match(re);
    if (!mm) { console.log(`FAIL ${file} #${id}: container not found`); failures++; continue; }
    const inner = mm[1].trim();
    const hasCard = inner.includes('class="card"') || inner.includes('class="teaser-card"') ||
                    inner.includes('class="category-card"') || inner.includes('class="guide-card"') ||
                    inner.includes('class="guide-preview"');
    if (!inner) { console.log(`WARN ${file} #${id}: container empty (no data?)`); continue; }
    console.log(`OK   ${file} #${id}: ${inner.length.toLocaleString()} chars, content=${hasCard}`);
  }
}

console.log(failures ? `\n${failures} FAILURES` : "\nAll checks passed");
process.exitCode = failures ? 1 : 0;
