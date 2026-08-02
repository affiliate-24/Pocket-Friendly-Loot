/**
 * netlify-build-hook.gs
 * Google Apps Script for Pocket Friendly Loot.
 *
 * Whenever rows are added/edited in the product Google Sheet, this script
 * calls the Netlify Build Hook so Netlify rebuilds the site (~60s) and
 * publishes the fresh data.
 *
 * SETUP (5 minutes):
 *   1. In your Google Sheet: Extensions → Apps Script
 *   2. Paste this whole file into the editor (Code.gs)
 *   3. Replace NETLIFY_BUILD_HOOK_URL below with your real hook URL
 *      (Netlify → Site configuration → Build & deploy → Build hooks)
 *   4. Click "Save" then the "Run" button once and approve permissions
 *   5. In the editor sidebar: Triggers (alarm icon) → Add Trigger:
 *        - Choose which function:   onSheetEdit
 *        - Choose which deployment: Head
 *        - Event source:            From spreadsheet
 *        - Event type:              On edit
 *        - Failure notification:    daily (optional)
 *   6. Test: edit any cell in the sheet → wait ~60s → the live site updates.
 */

var NETLIFY_BUILD_HOOK_URL = "PASTE_YOUR_NETLIFY_BUILD_HOOK_URL_HERE";

/** Debounce flag so rapid cell edits trigger one rebuild, not a flood. */
var REBUILD_DEBOUNCE_MS = 30 * 1000;

function onSheetEdit(e) {
  if (!e || !e.range) return;
  triggerNetlifyBuild();
}

function triggerNetlifyBuild() {
  var cache = CacheService.getScriptCache();
  var last = cache.get("lastBuildHookCall");
  var now = Date.now();
  if (last && now - Number(last) < REBUILD_DEBOUNCE_MS) {
    Logger.log("Build hook skipped (debounced).");
    return;
  }
  cache.put("lastBuildHookCall", String(now), 600);

  if (!NETLIFY_BUILD_HOOK_URL || NETLIFY_BUILD_HOOK_URL.indexOf("PASTE_YOUR") !== -1) {
    Logger.log("Netlify build hook URL not configured yet.");
    return;
  }

  var response = UrlFetchApp.fetch(NETLIFY_BUILD_HOOK_URL, {
    method: "post",
    muteHttpExceptions: true,
  });
  Logger.log("Netlify rebuild triggered: " + response.getResponseCode() + " " + response.getContentText());
}

/** Manual fallback: run this from the Apps Script editor to rebuild now. */
function rebuildNow() {
  triggerNetlifyBuild();
}
