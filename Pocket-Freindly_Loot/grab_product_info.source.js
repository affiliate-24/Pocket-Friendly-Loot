(function () {
  // ============================================================
  // EDIT THIS ONCE: your Amazon Associate tag (the part after
  // "tag=" in any link SiteStripe gives you, e.g. "yourtag-21")
  // ============================================================
  var ASSOCIATE_TAG = "__TAG__";

  function getText(selectors) {
    for (var i = 0; i < selectors.length; i++) {
      var el = document.querySelector(selectors[i]);
      if (el) {
        var text = (el.innerText || el.textContent || "").trim();
        if (text) return text;
      }
    }
    return "";
  }

  function getAttr(selectors, attrs) {
    for (var i = 0; i < selectors.length; i++) {
      var el = document.querySelector(selectors[i]);
      if (el) {
        for (var j = 0; j < attrs.length; j++) {
          var val = el.getAttribute(attrs[j]);
          if (val) return val;
        }
      }
    }
    return "";
  }

  function cleanPrice(text) {
    var match = text.replace(/,/g, "").match(/[\d]+(\.\d+)?/);
    return match ? match[0] : "";
  }

  function cleanNumber(text) {
    var match = text.replace(/,/g, "").match(/[\d]+(,\d{3})*(\.\d+)?/);
    return match ? match[0].replace(/,/g, "") : "";
  }

  var title = getText(["#productTitle"]);
  var category = getText([
    "#wayfinding-breadcrumbs_container a",
    "#wayfinding-breadcrumbs_feature_div a",
    "#wayfinding-breadcrumbs_container span.a-list-item a",
    "#wayfinding-breadcrumbs_container li a"
  ]);

  var salePriceRaw = getText([
    "#corePrice_feature_div .a-price.a-text-price.a-size-medium.apexPriceToPay .a-offscreen",
    "#corePriceDisplay_desktop_feature_div .a-price.priceToPay .a-offscreen",
    ".priceToPay .a-offscreen",
    "#priceblock_dealprice",
    "#priceblock_ourprice",
    "#priceblock_saleprice",
    ".a-price .a-offscreen"
  ]);

  var originalPriceRaw = getText([
    "#corePriceDisplay_desktop_feature_div .basisPrice .a-offscreen",
    ".a-price.a-text-price .a-offscreen",
    "#priceblock_was_price"
  ]);

  var ratingRaw = getText([
    "#averageCustomerReviews .a-icon-alt",
    "#acrPopover .a-icon-alt",
    "span[data-hook='rating-out-of-text']",
    "span.a-icon-alt"
  ]);

  var reviewCountRaw = getText([
    "#acrCustomerReviewText",
    "#acrCustomerReviewLink span",
    "span[data-hook='total-review-count']",
    "#acrCustomerReviewText"
  ]);

  var salePrice = cleanPrice(salePriceRaw);
  var originalPrice = cleanPrice(originalPriceRaw) || salePrice;
  var rating = ratingRaw.match(/[\d]+(\.\d+)?/) ? ratingRaw.match(/[\d]+(\.\d+)?/)[0] : "";
  var reviewCount = cleanNumber(reviewCountRaw);

  var imageUrl = getAttr(
    ["#landingImage", "#imgTagWrapperId img", "#imgBlkFront"],
    ["data-old-hires", "src"]
  );

  var asinMatch = window.location.href.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/);
  var asin = asinMatch ? asinMatch[1] : "";
  var affiliateLink = asin
    ? "https://www.amazon.in/dp/" + asin + "?tag=" + ASSOCIATE_TAG
    : window.location.href;

  // Order matches the sheet: Product_Name, Category, Original_Price,
  // Sale_Price, Image_URL, Affiliate_Link, Rating, Review_Count
  var row = [title, category, originalPrice, salePrice, imageUrl, affiliateLink, rating, reviewCount].join("\t");

  function done() {
    alert(
      "Copied to clipboard \u2014 paste into column B of your sheet.\n\n" +
      title + "\n\u20b9" + originalPrice + " \u2192 \u20b9" + salePrice +
      (rating ? "\nRating: " + rating : "") +
      (reviewCount ? "\nReviews: " + reviewCount : "")
    );
  }

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(row).then(done).catch(function () {
      prompt("Copy this row manually (it's tab-separated for pasting):", row);
    });
  } else {
    prompt("Copy this row manually (it's tab-separated for pasting):", row);
  }
})();
