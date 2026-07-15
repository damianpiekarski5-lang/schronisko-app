// Import historii spacerów z harmonogramu wolontariuszy (XLSX, zakładka
// WYJŚCIA): kolumna A = boks, kolumna B = opiekun (psy w nawiasach),
// kolumny z datami zawierają oznaczenia. Zasady (tylko jednoznaczne wpisy):
// - boks z JEDNYM psem: każde niepuste oznaczenie = spacer
// - boks z wieloma psami: oznaczenie zawierające "x" ("x", "TLSx", "Ex")
//   = wszystkie psy (x wstawia się przy zabraniu ostatniego psa z boksu);
//   litery imion bez x ("R", "St", "KM") = konkretne psy; emoji/godziny/
//   inicjały wolontariuszy nie mówią który pies wyszedł -> pomijane z raportem

import * as XLSX from "xlsx";

// Normalizacja do porównań: małe litery, bez polskich znaków i śmieci
export function normName(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/ł/g, "l")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]/g, "")
    .trim();
}

const HAS_X_RE = /x/i;
const LETTERS_RE = /[^A-Za-zżźćńółęąśŻŹĆŃÓŁĘĄŚ]/g;

function cleanDogName(raw) {
  // "Bazylia-szp." -> "Bazylia"; "Krakers - spokojne spacery" -> "Krakers"
  let n = String(raw || "").trim();
  n = n.split(" - ")[0];
  n = n.replace(/[-\s]*szp\.?$/i, "");
  return n.trim();
}

function excelDateToStr(v) {
  if (v instanceof Date) {
    const y = v.getFullYear();
    const m = String(v.getMonth() + 1).padStart(2, "0");
    const d = String(v.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  return null;
}

// Zwraca { rows: [{boks, pavilion, box, names[], marks: {date: mark}}] }
export async function parseWalkSchedule(file, fromDate, toDate) {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { cellDates: true });
  const sheetName = wb.SheetNames.find((n) => normName(n).includes("wyjscia"));
  if (!sheetName) throw new Error("Nie znaleziono zakładki WYJŚCIA w tym pliku");
  const ws = wb.Sheets[sheetName];
  const grid = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null });

  // Kolumny z datami w zakresie (wiersz 1)
  const header = grid[0] || [];
  const dateCols = [];
  header.forEach((v, idx) => {
    const ds = excelDateToStr(v);
    if (ds && ds >= fromDate && ds <= toDate) dateCols.push({ idx, date: ds });
  });
  if (dateCols.length === 0) {
    throw new Error("Brak kolumn z datami w wybranym zakresie — sprawdź zakres i plik");
  }

  const rows = [];
  for (let r = 2; r < grid.length; r++) {
    const line = grid[r] || [];
    const boksRaw = String(line[0] ?? "").trim();
    if (!boksRaw) continue;
    const bm = boksRaw.match(/^([A-Za-złó\s]+?)\s*(\d+)$/i);
    const pavilion = bm ? bm[1].replace(/\s+/g, "").toUpperCase() : "";
    const box = bm ? parseInt(bm[2], 10) : null;

    const label = String(line[1] ?? "");
    const pm = label.match(/\(([^)]*)\)/);
    const names = pm
      ? pm[1].split(",").map(cleanDogName).filter(Boolean)
      : [];

    const marks = {};
    for (const { idx, date } of dateCols) {
      const v = line[idx];
      const mark = v == null ? "" : String(v).trim();
      if (mark) marks[date] = mark;
    }
    if (Object.keys(marks).length > 0 || names.length > 0) {
      rows.push({ boks: boksRaw, pavilion, box, names, marks });
    }
  }
  return { rows, dates: dateCols.map((d) => d.date) };
}

// Dopasowanie do bazy psów aplikacji. dogs: [{id, name, pavilion, box}]
// Zwraca { walks: [{dogId, dogName, date}], ambiguous: [{date, boks, mark, reason}] }
export function matchWalks(rows, dogs) {
  const byBox = new Map();
  const byName = new Map();
  for (const d of dogs) {
    if (!d.id) continue;
    const bk = `${String(d.pavilion || "").toUpperCase()}|${Number(d.box)}`;
    if (!byBox.has(bk)) byBox.set(bk, []);
    byBox.get(bk).push(d);
    const nk = normName(d.name);
    if (!byName.has(nk)) byName.set(nk, []);
    byName.get(nk).push(d);
  }

  const walks = [];
  const ambiguous = [];
  const seen = new Set(); // dedup dogId|date

  const addWalk = (d, date) => {
    const key = `${d.id}|${date}`;
    if (seen.has(key)) return;
    seen.add(key);
    walks.push({ dogId: d.id, dogName: d.name, date });
  };

  for (const row of rows) {
    const boxKey = `${row.pavilion}|${row.box}`;
    const boxDogs = byBox.get(boxKey) || [];

    // Psy wiersza: z nawiasów (rozpoznane po imieniu), inaczej z boksu
    let rowDogs = [];
    if (row.names.length > 0) {
      for (const n of row.names) {
        const nk = normName(n);
        const inBox = boxDogs.filter((d) => normName(d.name) === nk);
        const global = byName.get(nk) || [];
        const cand = inBox.length === 1 ? inBox : global;
        rowDogs.push(cand.length === 1 ? cand[0] : { name: n, id: null });
      }
    } else {
      rowDogs = boxDogs;
    }
    const resolved = rowDogs.filter((d) => d.id);

    for (const [date, mark] of Object.entries(row.marks)) {
      const letters = mark.replace(LETTERS_RE, "");

      if (rowDogs.length === 1) {
        // Pojedynczy pies w boksie: KAŻDE niepuste oznaczenie
        // (X, litera, cyfra, emoji, kropka...) traktujemy jako spacer
        if (rowDogs[0].id) addWalk(rowDogs[0], date);
        else ambiguous.push({ date, boks: row.boks, mark, reason: `pies nierozpoznany: ${rowDogs[0].name}` });
        continue;
      }
      if (rowDogs.length === 0) {
        ambiguous.push({ date, boks: row.boks, mark, reason: "brak psów w tym boksie w bazie" });
        continue;
      }

      // Boks wielopsi — jednoznaczne są TYLKO:
      // - oznaczenie zawierające x ("x", "TLSx", "Ex") = WSZYSTKIE psy
      //   z boksu (x wstawiane przy zabraniu ostatniego psa)
      // - litery pasujące do imion psów = konkretne psy
      // Emoji, godziny, inicjały wolontariuszy itp. nie mówią,
      // KTÓRY pies wyszedł -> pomijamy z raportem
      if (HAS_X_RE.test(letters)) {
        resolved.forEach((d) => addWalk(d, date));
        if (resolved.length < rowDogs.length) {
          ambiguous.push({ date, boks: row.boks, mark, reason: "część psów z boksu nierozpoznana w bazie" });
        }
        continue;
      }
      if (!letters) {
        ambiguous.push({ date, boks: row.boks, mark, reason: "oznaczenie bez liter w boksie z wieloma psami" });
        continue;
      }
      const tokens = mark.split(LETTERS_RE).filter(Boolean);
      let anyAmb = tokens.length === 0;
      for (const t of tokens) {
        const tn = normName(t);
        const pref = resolved.filter((d) => normName(d.name).startsWith(tn));
        if (pref.length === 1) {
          addWalk(pref[0], date);
          continue;
        }
        // "KM" = K + M — każda litera wskazuje dokładnie jednego psa
        const perLetter = [];
        let ok = tn.length > 0;
        for (const ch of tn) {
          const lm = resolved.filter((d) => normName(d.name).startsWith(ch));
          if (lm.length === 1 && !perLetter.includes(lm[0])) perLetter.push(lm[0]);
          else { ok = false; break; }
        }
        if (ok && perLetter.length > 0) perLetter.forEach((d) => addWalk(d, date));
        else anyAmb = true;
      }
      if (anyAmb) {
        ambiguous.push({ date, boks: row.boks, mark, reason: "oznaczenie bez jednoznacznego dopasowania do psa" });
      }
    }
  }

  walks.sort((a, b) => a.date.localeCompare(b.date) || a.dogName.localeCompare(b.dogName));
  return { walks, ambiguous };
}
