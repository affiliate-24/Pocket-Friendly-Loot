/**
 * netlify-build-hook.gs
 * Google Apps Script for Pocket Friendly Loot.
 *
 * Adds a custom menu item in Google Sheets to manually trigger a Netlify
 * site rebuild only when you are done making all your edits.
 */

var NETLIFY_BUILD_HOOK_URL = "HOOK_URL";

/**
 * Automatically creates a custom top menu in Google Sheets on load.
 */
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('🚀 Site Publisher')
    .addItem('Publish Changes to Live Site', 'triggerNetlifyBuild')
    .addToUi();
}

/**
 * Triggers the Netlify build hook and shows a pop-up confirmation to the user.
 */
function triggerNetlifyBuild() {
  var ui = SpreadsheetApp.getUi();

  // Check if hook URL is filled in
  if (!NETLIFY_BUILD_HOOK_URL || NETLIFY_BUILD_HOOK_URL === "HOOK_URL" || NETLIFY_BUILD_HOOK_URL.indexOf("PASTE_YOUR") !== -1) {
    ui.alert("⚠️ Configuration Error", "Please replace NETLIFY_BUILD_HOOK_URL with your actual Netlify Webhook URL.", ui.ButtonSet.OK);
    return;
  }

  try {
    var response = UrlFetchApp.fetch(NETLIFY_BUILD_HOOK_URL, {
      method: "post",
      muteHttpExceptions: true,
    });

    var statusCode = response.getResponseCode();

    // 200 or 202 status codes mean Netlify successfully accepted the request
    if (statusCode === 200 || statusCode === 202) {
      ui.alert("✅ Success!", "Netlify build triggered! Your site will update live in ~60 seconds.", ui.ButtonSet.OK);
    } else {
      ui.alert("❌ Build Trigger Failed", "Netlify responded with code " + statusCode + ":\n" + response.getContentText(), ui.ButtonSet.OK);
    }

  } catch (error) {
    ui.alert("❌ Network Error", "Failed to reach Netlify: " + error.toString(), ui.ButtonSet.OK);
  }
}

/** Manual fallback: run this directly from the Apps Script editor. */
function rebuildNow() {
  triggerNetlifyBuild();
}