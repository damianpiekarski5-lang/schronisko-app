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

  if (raw?.ok === true && Array.isArray(raw?.data)) {
    return { ok: true, data: raw.data };
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

  if (Array.isArray(raw)) {
    return { ok: true, data: raw };
  }

  return { ok: false, error: raw?.error || raw?.message || "Nieznana odpowiedź backendu" };
}

function safeJsonParse(text) {
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    const gvizPrefix = "/*O_o*/\ngoogle.visualization.Query.setResponse(";
    if (text.startsWith(gvizPrefix) && text.endsWith(");")) {
      return JSON.parse(text.slice(gvizPrefix.length, -2));
    }
    return null;
  }
}

export default async function handler(req, res) {
  setCorsHeaders(res);

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const url = new URL(APPS_SCRIPT_URL);

    if (req.method === "GET") {
      for (const [key, value] of Object.entries(req.query || {})) {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, String(value));
        }
      }
    }

    const options =
      req.method === "POST"
        ? {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(req.body ?? {}),
            redirect: "follow",
          }
        : { method: "GET", redirect: "follow" };

    const response = await fetch(url.toString(), options);
    const text = await response.text();
    const parsed = safeJsonParse(text) || { ok: false, error: "Niepoprawna odpowiedź JSON" };

    return res.status(response.status).json(normalizeResult(parsed, response.status));
  } catch (error) {
    return res.status(500).json({ ok: false, error: String(error) });
  }
}
