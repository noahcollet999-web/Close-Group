// Verbindet die Webflow-Formulare mit dem Myno CRM-Webhook
// (Leads landen im CRM) und optional mit /api/apply (E-Mail via Resend).
(function () {
  var MYNO_WEBHOOK =
    "https://www.myno.co/api/webhooks/website-form/f79f6033fe1bbd026b7000156e7168b9a8da7473af6f17da";
  var EMAIL_ENDPOINT = "/api/apply";
  var SELECTOR = "form.contact-us-form, form.form-wrap";

  function getVal(form, names) {
    for (var i = 0; i < names.length; i++) {
      var el = form.querySelector('[name="' + names[i] + '"]');
      if (el && el.value) return el.value;
    }
    return "";
  }

  function collect(form) {
    return {
      name: getVal(form, ["name", "Name"]),
      email: getVal(form, ["email-3", "email-2", "email", "Email"]),
      phone: getVal(form, ["Phone", "phone"]),
      message: getVal(form, ["field", "message"]),
      website: getVal(form, ["website"]),
      page: location.pathname,
    };
  }

  function postJson(url, payload) {
    return fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
    }).then(function (r) {
      if (!r.ok) throw new Error("request failed");
      return r.json().catch(function () {
        return { ok: true };
      });
    });
  }

  function send(form) {
    var wrap = form.closest(".w-form") || form.parentElement;
    var done = wrap ? wrap.querySelector(".w-form-done") : null;
    var fail = wrap ? wrap.querySelector(".w-form-fail") : null;
    var btn = form.querySelector('[type="submit"]');
    var prevVal = btn ? btn.value : null;
    var data = collect(form);

    // Honeypot: Spam-Bots still schicken, Nutzer sieht Erfolg
    if (data.website) {
      form.style.display = "none";
      if (done) done.style.display = "block";
      if (fail) fail.style.display = "none";
      return;
    }

    if (btn) {
      btn.disabled = true;
      if (btn.getAttribute("data-wait")) btn.value = btn.getAttribute("data-wait");
    }

    // Empfohlene Feldnamen für Myno website-form Webhook
    var leadPayload = {
      name: data.name,
      email: data.email,
      phone: data.phone,
      message: data.message,
      source: "theclosegroup.de",
    };

    postJson(MYNO_WEBHOOK, leadPayload)
      .then(function () {
        // E-Mail parallel; Fehler dort sollen CRM-Erfolg nicht überschreiben
        return postJson(EMAIL_ENDPOINT, data).catch(function () {
          return null;
        });
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
