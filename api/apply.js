// Vercel Serverless Function: nimmt Formular-Einsendungen entgegen
// und verschickt sie per Resend-API als E-Mail.
// Benötigt die Umgebungsvariable RESEND_API_KEY (in Vercel hinterlegt).

const FROM = "Close Group <bewerbungen@theclosegroup.de>";
const TO = ["Noahcollet999@gmail.com"];

function esc(value) {
  return String(value == null ? "" : value).replace(/[<>&]/g, function (c) {
    return { "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c];
  });
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "RESEND_API_KEY ist nicht gesetzt" });
    return;
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }
  body = body || {};

  // Honeypot gegen Spam-Bots
  if (body.website) {
    res.status(200).json({ ok: true });
    return;
  }

  const name = (body.name || "").trim();
  const email = (body.email || "").trim();
  const phone = (body.phone || "").trim();
  const message = (body.message || "").trim();
  const page = (body.page || "").trim();

  if (!email) {
    res.status(400).json({ error: "E-Mail ist erforderlich" });
    return;
  }

  const rows = [
    ["Name", name],
    ["E-Mail", email],
    ["Telefon", phone],
    ["Nachricht", message],
    ["Quelle", page],
  ]
    .filter(function (r) { return r[1]; })
    .map(function (r) {
      return (
        '<tr><td style="padding:6px 12px;font-weight:600;color:#111;vertical-align:top;">' +
        esc(r[0]) +
        '</td><td style="padding:6px 12px;color:#333;">' +
        esc(r[1]).replace(/\n/g, "<br>") +
        "</td></tr>"
      );
    })
    .join("");

  const html =
    '<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;">' +
    '<h2 style="color:#111;">Neue Bewerbung / Anfrage</h2>' +
    '<table style="border-collapse:collapse;width:100%;background:#f7f7f7;border-radius:8px;">' +
    rows +
    "</table>" +
    '<p style="color:#888;font-size:12px;margin-top:16px;">Gesendet über theclosegroup.de</p>' +
    "</div>";

  try {
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM,
        to: TO,
        reply_to: email,
        subject: "Neue Bewerbung – " + (name || email),
        html: html,
      }),
    });

    if (!resp.ok) {
      const detail = await resp.text();
      res.status(502).json({ error: "Versand fehlgeschlagen", detail: detail });
      return;
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Serverfehler" });
  }
};
