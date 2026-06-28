// Verbindet die Webflow-Formulare mit der Vercel-Function /api/apply (Resend).
// Überschreibt das Standard-Webflow-Submit (das auf statischem Hosting nicht funktioniert).
(function () {
  var ENDPOINT = "/api/apply";
  var SELECTOR = "form.contact-us-form, form.form-wrap";

  function getVal(form, names) {
    for (var i = 0; i < names.length; i++) {
      var el = form.querySelector('[name="' + names[i] + '"]');
      if (el && el.value) return el.value;
    }
    return "";
  }

  function send(form) {
    var wrap = form.closest(".w-form") || form.parentElement;
    var done = wrap ? wrap.querySelector(".w-form-done") : null;
    var fail = wrap ? wrap.querySelector(".w-form-fail") : null;
    var btn = form.querySelector('[type="submit"]');
    var prevVal = btn ? btn.value : null;

    var data = {
      name: getVal(form, ["name", "Name"]),
      email: getVal(form, ["email-3", "email-2", "email", "Email"]),
      phone: getVal(form, ["Phone", "phone"]),
      message: getVal(form, ["field", "message"]),
      website: getVal(form, ["website"]),
      page: location.pathname,
    };

    if (btn) {
      btn.disabled = true;
      if (btn.getAttribute("data-wait")) btn.value = btn.getAttribute("data-wait");
    }

    fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
      .then(function (r) {
        if (!r.ok) throw new Error("request failed");
        return r.json();
      })
      .then(function () {
        form.style.display = "none";
        if (done) done.style.display = "block";
        if (fail) fail.style.display = "none";
      })
      .catch(function () {
        if (fail) fail.style.display = "block";
      })
      .then(function () {
        if (btn) {
          btn.disabled = false;
          if (prevVal !== null) btn.value = prevVal;
        }
      });
  }

  function attach(form) {
    form.addEventListener(
      "submit",
      function (e) {
        e.preventDefault();
        e.stopImmediatePropagation();
        send(form);
      },
      true // capture: läuft vor Webflows eigenem Handler
    );
  }

  function init() {
    var forms = document.querySelectorAll(SELECTOR);
    for (var i = 0; i < forms.length; i++) attach(forms[i]);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
