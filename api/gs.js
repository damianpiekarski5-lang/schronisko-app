const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbzBGx3FjEbJq8yz7wCNJF_GAPsKeclfkRFLt-kDVpxcesN8cKGxwz789DiDsOBnjeh1/exec";

const ALLOWED_ORIGIN = "*";

function setCorsHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function normalizeResult(raw, status = 200) {
  if (status >= 400) {
    return { ok: false, error: raw?.error || raw?.message || "Błąd backendu" };
  }
  if (raw?.ok === true && (raw?.data?.success === true || raw?.success === true)) {
    return { ok: true, data: { success: true } };
  }
  if (raw?.success === true) {
    return { ok: true, data: { success: true } };
  }
  if (raw?.ok === false) {
    return { ok: false, error: raw?.error || "Błąd backendu" };
  }
  return { ok: false, error: raw?.error || raw?.message || "Nieznana odpowiedź backendu" };
}

export default async function handler(req, res) {
  const APPS_SCRIPT_URL =
    "https://script.google.com/macros/s/AKfycbzBGx3FjEbJq8yz7wCNJF_GAPsKeclfkRFLt-kDVpxcesN8cKGxwz789DiDsOBnjeh1/exec";
  setCorsHeaders(res);

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  try {
    // Forward querystring dla GET (np. ?action=getDashboard)
    const url = new URL(APPS_SCRIPT_URL);

    if (req.method === "GET") {
      for (const [k, v] of Object.entries(req.query || {})) {
        url.searchParams.set(k, String(v));
      for (const [key, value] of Object.entries(req.query || {})) {
        url.searchParams.set(key, String(value));
      }
    }

    const options =
      req.method === "POST"
        ? {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(req.body ?? {}),
          }
        : { method: "GET" };

    const r = await fetch(url.toString(), options);
    const text = await r.text();

    // Zwracamy JSON jeśli się da, inaczej tekst
    res.status(r.status);
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    const response = await fetch(url.toString(), options);
    const text = await response.text();

    let parsed;
    try {
      const json = JSON.parse(text);
      return res.json(json);
      parsed = JSON.parse(text);
    } catch {
      return res.json({ ok: false, error: "Non-JSON response", raw: text });
      parsed = { ok: false, error: "Non-JSON response", raw: text };
    }
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });

    return res.status(response.status).json(normalizeResult(parsed, response.status));
  } catch (error) {
    return res.status(500).json({ ok: false, error: String(error) });
  }
}
