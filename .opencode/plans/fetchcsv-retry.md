# Add retry logic to `fetchCSV` in `js/utils.js`

## Problem
`fetchCSV` has no retry logic — transient Google Sheets / network failures cause sections on the homepage (and other pages) to remain empty after the page loads. A manual refresh usually fixes it.

## Change
Modify `fetchCSV` to retry failed Papa Parse attempts up to 2 times with a 1-second delay:

```js
export function fetchCSV(url, retries = 2) {
  return new Promise((resolve, reject) => {
    if (!url || url.includes("PASTE_YOUR")) {
      reject(new Error("Sheet URL not configured yet — check app.js"));
      return;
    }
    function attempt(remaining) {
      Papa.parse(url, {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: (results) => resolve(results.data || []),
        error: (err) => {
          if (remaining > 0) {
            setTimeout(function () { attempt(remaining - 1); }, 1000);
          } else {
            reject(err);
          }
        },
      });
    }
    attempt(retries);
  });
}
```

## Files
- `js/utils.js` — only file changed

## Effect
Every page that calls `fetchCSV` (deals, categories, blogs, gifts, guides, newsletter) automatically gets retry behavior. No other files need changes.
