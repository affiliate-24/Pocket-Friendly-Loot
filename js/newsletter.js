import { CONFIG, showToast } from "./app.js";
import { qsa } from "./utils.js";

export function initNewsletter() {
  qsa("[data-subscribe-form]").forEach(function (form) {
    initSubscriptionForm(form);
  });
}

function initSubscriptionForm(form) {
  var actionUrl = CONFIG.NEWSLETTER_FORM_URL.replace("/viewform", "/formResponse");
  form.action = actionUrl;
  form.method = "POST";

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    var iframe = document.createElement("iframe");
    iframe.name = "hidden_iframe_" + Date.now();
    iframe.style.display = "none";
    document.body.appendChild(iframe);
    form.target = iframe.name;

    form.submit();

    var btn = form.querySelector("button[type=submit]");
    var btnText = btn ? btn.textContent.trim() : "";
    showToast(btnText === "Send" ? "Sent successfully!" : "Subscribed successfully!");

    form.reset();

    setTimeout(function () { iframe.remove(); }, 5000);
  });
}
