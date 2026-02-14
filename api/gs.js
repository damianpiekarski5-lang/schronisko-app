export default async function handler(req, res) {
  const APPS_SCRIPT_URL =
    "https://script.google.com/macros/s/AKfycbzBGx3FjEbJq8yz7wCNJF_GAPsKeclfkRFLt-kDVpxcesN8cKGxwz789DiDsOBnjeh1/exec";

  try {
    // Forward querystring dla GET (np. ?action=getDashboard)
    const url = new URL(APPS_SCRIPT_URL);
    if (req.method === "GET") {
      for (const [k, v] of Object.entries(req.query || {})) {
        url.searchParams.set(k, String(v));
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

    try {
      const json = JSON.parse(text);
      return res.json(json);
    } catch {
      return res.json({ ok: false, error: "Non-JSON response", raw: text });
    }
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
}
