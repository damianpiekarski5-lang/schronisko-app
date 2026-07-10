// Parser rejestru zwierząt (PDF ze schroniskowego systemu).
// Odtwarza wiersze tabeli po współrzędnych tekstu: nagłówki "boks",
// "Nazwa", "id", "wiek" wyznaczają zakresy X kolumn, wiersze grupujemy po Y.
// Przetestowany na rejestrze z 10.07.2026 (201 psów, 4 strony).

import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf";
import pdfjsWorker from "pdfjs-dist/legacy/build/pdf.worker.entry";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

const ID_RE = /^P\s*\d+\/\d+\/\d+$/i;

// Klucz porównywania ID — bez spacji, wielkimi literami
// ("P 75/06/18" i "P75/06/18" to ten sam pies)
export function normalizeDogId(id) {
  return String(id || "").replace(/\s+/g, "").trim().toUpperCase();
}

// Format ID jak w arkuszu: "P 75/06/18" (spacja po P)
function formatDogId(raw) {
  return String(raw).replace(/\s+/g, "").toUpperCase().replace(/^P/, "P ");
}

// "ZF07" -> { pavilion: "ZF", box: 7 };  "D2" -> { pavilion: "D", box: 2 }
function parseBoks(str) {
  const m = String(str || "").trim().match(/^([a-ząćęłńóśźż\s]+?)\s*(\d+)\s*$/i);
  if (!m) return { pavilion: "", box: null };
  return {
    pavilion: m[1].replace(/\s+/g, "").toUpperCase(),
    box: parseInt(m[2], 10),
  };
}

export async function parseDogListPdf(file) {
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;

  const rows = [];
  let cols = null; // pozycje kolumn z ostatniego nagłówka (strony 2+ mogą go nie mieć)

  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    const items = content.items
      .map((it) => ({ str: String(it.str), x: it.transform[4], y: it.transform[5] }))
      .filter((it) => it.str.trim());

    // Nagłówki kolumn na tej stronie
    const found = {};
    for (const it of items) {
      const k = it.str.trim().toLowerCase();
      if (k === "boks" && found.boks == null) found.boks = it.x;
      else if (k === "nazwa" && found.name == null) found.name = it.x;
      else if (k === "id" && found.id == null) found.id = it.x;
      else if (k === "wiek" && found.wiek == null) found.wiek = it.x;
    }
    if (found.boks != null && found.name != null && found.id != null && found.wiek != null) {
      cols = found;
    }
    if (!cols) continue;

    // Grupowanie w wiersze po współrzędnej Y
    const lines = [];
    for (const it of items) {
      const line = lines.find((l) => Math.abs(l.y - it.y) <= 2.5);
      if (line) line.items.push(it);
      else lines.push({ y: it.y, items: [it] });
    }

    for (const line of lines) {
      // Fragmenty tekstu w zakresie X danej kolumny, sklejone w kolejności
      const inRange = (lo, hi) =>
        line.items
          .filter((i) => i.x >= lo && i.x < hi)
          .sort((a, b) => a.x - b.x)
          .map((i) => i.str)
          .join("")
          .replace(/\s+/g, " ")
          .trim();

      const idStr = inRange(cols.id - 8, cols.wiek - 8);
      if (!ID_RE.test(idStr)) continue;

      const boksStr = inRange(cols.boks - 25, cols.name - 8);
      const nameStr = inRange(cols.name - 8, cols.id - 8);
      const { pavilion, box } = parseBoks(boksStr);

      rows.push({
        id: formatDogId(idStr),
        name: nameStr,
        pavilion,
        box,
        boksRaw: boksStr,
      });
    }
  }

  // Deduplikacja po znormalizowanym ID
  const byId = new Map();
  for (const r of rows) {
    const key = normalizeDogId(r.id);
    if (key && !byId.has(key)) byId.set(key, r);
  }
  return Array.from(byId.values());
}
