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

  setCorsHeaders(res);

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  try {
    const url = new URL(APPS_SCRIPT_URL);

    if (req.method === "GET") {

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


    const response = await fetch(url.toString(), options);
    const text = await response.text();

    let parsed;
    try {

    return res.status(response.status).json(normalizeResult(parsed, response.status));
  } catch (error) {
    return res.status(500).json({ ok: false, error: String(error) });
  }
}
