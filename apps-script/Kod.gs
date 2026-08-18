// ===============================
// SCHRONISKO API v3 – Web App + Arkusz (pełny)
// Jedna baza psów + spacery + zgłoszenia + archiwizacja
// ===============================

const SPREADSHEET_ID = "1NTi42HMtaJB-xK6ZQvupHwCx2hNTR0cjFm6PtGM-mgQ";

const DOGS_SHEET_NAME = "Baza psów";
const WALKS_SHEET_NAME = "Spacery";
const REPORTS_SHEET_NAME = "Zgłoszenia";
const ARCHIVE_SHEET_NAME = "Archiwum";
const ARCHIVE_HEADER_NAME = "Archiwum";
const FAVORITES_SHEET_NAME = "Favorites";
const BEHAVIORYST_DOGS_SHEET_NAME = "PsyBehawiorysty";
const OPIEKUNOWIE_SHEET_NAME = "Opiekunowie";
const HISTORY_SHEET_NAME = "HistoriaPsa";
const ROLES_SHEET_NAME = "Roles";
const MEDICAL_FLAGS_SHEET_NAME = "MedicalFlags";
const WEIGHT_HISTORY_SHEET_NAME = "HistoriaWagi";
const MEDICAL_REPORTS_SHEET_NAME = "ZgłoszeniaMedyczne";
const TASKS_SHEET_NAME = "ZadaniaAmbulatorium";
const VALID_ROLES = ["volunteer", "staff", "ambulatorium", "admin"];
const POLAND_TIMEZONE = "Europe/Warsaw";
const SHARED_SECRET_PROPERTY_NAME = "SHARED_SECRET";
const ADMIN_EMAILS_PROPERTY_NAME = "ADMIN_EMAILS";
const REPORT_RESOLVED_STATUSES = ["W_PRACY", "ODRZUCONE", "ROZPATRZONE", "ZAAKCEPTOWANE"];

const H = {
  PAVILION: "PAWILON",
  KENNEL: "BOKS",
  NAME: "IMIĘ",
  ID: "ID",
  AGE: "WIEK",
  CHIP: "CHIP",
  BREED: "RASA",
  LOOK: "WYGLAD",
  DIET: "DIETA / ŻYWIENIE",
  CHARACTER: "ZACHOWANIE / CHARAKTER",
  CAUTION: "NA CO UWAŻAĆ!",
  EXTRA: "UWAGI DODATKOWE",
  PHOTO: "Zdjęcie",
  LAST_WALK: "Ostatni spacer",
  ARCHIVE: "Archiwum",
  WEIGHT: "WAGA",
  STATUS: "STATUS",
  NIE_WYDAWAC: "NIE WYDAWAĆ WŁAŚCICIELOWI",
  KASTRACJA: "KASTRACJA",
  KASTRACJA_DATA: "KASTRACJA DATA",
  KASTRACJA_POWOD: "KASTRACJA POWÓD",
};

// ===============================
// WEB APP
// ===============================
function doOptions() {
  return json({ ok: true, data: { success: true } });
}

function doGet(e) {
  const action = safeStr(e?.parameter?.action);

  try {
    validateSharedSecretParam_(e);

    if (action === "getDogs") {
      const includeArchived = String(e?.parameter?.includeArchived || "false") === "true";
      return json({ ok: true, data: getDogs(includeArchived) });
    }

    if (action === "getOpiekunowie") {
      const dogId = safeStr(e?.parameter?.dogId);
      return json({ ok: true, data: getOpiekunowie(dogId) });
    }

    if (action === "getDogHistory") {
      return json({ ok: true, data: getDogHistory(safeStr(e?.parameter?.dogId)) });
    }

    if (action === "getLastWalkInfo") {
      return json({ ok: true, data: getLastWalkInfo(safeStr(e?.parameter?.dogId)) });
    }

    if (action === "getDogWalkHistory") {
      return json({ ok: true, data: getDogWalkHistory_(safeStr(e?.parameter?.dogId)) });
    }

    if (action === "getMedicalFlags") {
      return json({ ok: true, data: getMedicalFlags_(safeStr(e?.parameter?.dogId)) });
    }

    if (action === "getWeightHistory") {
      return json({ ok: true, data: getWeightHistory_(safeStr(e?.parameter?.dogId)) });
    }

    if (action === "getSectorDogs") {
      return json({ ok: true, data: getSectorDogs_() });
    }

    if (action === "getDogTasks") {
      return json({ ok: true, data: getDogTasks_(safeStr(e?.parameter?.dogId)) });
    }

    if (action === "getAllDogTasks") {
      return json({ ok: true, data: getAllDogTasks_() });
    }

    if (action === "getWalksByDateRange") {
      const startDate = safeStr(e?.parameter?.startDate);
      const endDate = safeStr(e?.parameter?.endDate);
      return json({ ok: true, data: getWalksByDateRange_(startDate, endDate) });
    }

    if (action === "getAllOpiekunowie") {
      return json({ ok: true, data: getAllOpiekunowie_() });
    }

    return json({ ok: false, error: "Unknown action" });
  } catch (error) {
    return json({ ok: false, error: String(error) });
  }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) {
    return json({ ok: false, error: "Serwer zajęty — spróbuj ponownie za chwilę" });
  }

  try {
    const payload = JSON.parse(e?.postData?.contents || "{}");
    validateSharedSecret(payload);
    const action = safeStr(payload?.action);

    if (action === "recordWalk") {
      recordWalk(payload);
      return json({ ok: true, data: { success: true } });
    }

    if (action === "deleteWalk") {
      return json({ ok: true, data: deleteWalk(payload) });
    }

    if (action === "reportBehavior") {
      reportBehavior(payload);
      return json({ ok: true, data: { success: true } });
    }

    if (action === "bulkUpdateDogs") {
      return json({ ok: true, data: bulkUpdateDogs_(payload) });
    }

    if (action === "bulkImportWalks") {
      return json({ ok: true, data: bulkImportWalks_(payload) });
    }

    if (action === "recomputeLastWalks") {
      return json({ ok: true, data: recomputeLastWalks_(payload) });
    }

    if (action === "setArchive") {
      const result = setArchive(payload);
      return json({ ok: true, data: result });
    }

    if (action === "toggleFavorite") {
      return json({ ok: true, data: toggleFavorite(payload) });
    }

    if (action === "getMyDogs") {
      return json({ ok: true, data: getMyDogs(payload) });
    }

    if (action === "toggleBehaviorystDog") {
      return json({ ok: true, data: toggleBehaviorystDog(payload) });
    }

    if (action === "getBehaviorystDogs") {
      return json({ ok: true, data: getBehaviorystDogs(payload) });
    }

    if (action === "adminGetBehaviorReports") {
      requireAdmin(payload);
      return json({ ok: true, data: adminGetBehaviorReports() });
    }

    if (action === "adminUpdateBehaviorReport") {
      requireAdmin(payload);
      return json({ ok: true, data: adminUpdateBehaviorReport(payload) });
    }

    if (action === "toggleOpiekun") {
      return json({ ok: true, data: toggleOpiekun(payload) });
    }

    if (action === "addDogHistory") {
      addDogHistory(payload);
      return json({ ok: true, data: { success: true } });
    }

    if (action === "getUserRole") {
      const email = safeStr(payload?.user?.email);
      return json({ ok: true, data: { role: getUserRole_(email) } });
    }

    if (action === "setUserRole") {
      requireAdmin(payload);
      setUserRole_(safeStr(payload?.email), safeStr(payload?.role));
      return json({ ok: true, data: { success: true } });
    }

    if (action === "listUsersForAdmin") {
      requireAdmin(payload);
      return json({ ok: true, data: listUsersForAdmin_() });
    }

    if (action === "setMedicalFlag") {
      setMedicalFlag_(payload);
      return json({ ok: true, data: { success: true } });
    }

    if (action === "deactivateMedicalFlag") {
      deactivateMedicalFlag_(payload);
      return json({ ok: true, data: { success: true } });
    }

    if (action === "updateDogLocation") {
      return json({ ok: true, data: updateDogLocation_(payload) });
    }

    if (action === "updateDogDiet") {
      return json({ ok: true, data: updateDogDiet_(payload) });
    }

    if (action === "addWeightEntry") {
      return json({ ok: true, data: addWeightEntry_(payload) });
    }

    if (action === "submitMedicalReport") {
      return json({ ok: true, data: submitMedicalReport_(payload) });
    }

    if (action === "getMedicalReports") {
      return json({ ok: true, data: getMedicalReports_(payload) });
    }

    if (action === "getWalksReport") {
      return json({ ok: true, data: getWalksReport_(payload) });
    }

    if (action === "updateMedicalReportStatus") {
      return json({ ok: true, data: updateMedicalReportStatus_(payload) });
    }

    if (action === "addDogTask") {
      return json({ ok: true, data: addDogTask_(payload) });
    }

    if (action === "completeDogTask") {
      return json({ ok: true, data: completeDogTask_(payload) });
    }

    if (action === "setDogStatus") {
      return json({ ok: true, data: setDogStatus_(payload) });
    }

    if (action === "setCastration") {
      return json({ ok: true, data: setCastration_(payload) });
    }

    return json({ ok: false, error: "Unknown action" });
  } catch (error) {
    return json({ ok: false, error: String(error) });
  } finally {
    try {
      lock.releaseLock();
    } catch (_) {}
  }
}


function nowInPoland() {
  const formatted = Utilities.formatDate(new Date(), POLAND_TIMEZONE, "yyyy-MM-dd'T'HH:mm:ssZ");
  const isoOffset = formatted.replace(/([+-]\d{2})(\d{2})$/, "$1:$2");
  return new Date(isoOffset);
}

function nowInPolandText() {
  return Utilities.formatDate(new Date(), POLAND_TIMEZONE, "yyyy-MM-dd HH:mm:ss");
}

// ===============================
// CORE – DOGS
// ===============================
function getDogs(includeArchived) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sh = ss.getSheetByName(DOGS_SHEET_NAME);
  if (!sh) throw new Error("Brak zakładki: " + DOGS_SHEET_NAME);

  const dataRange = sh.getDataRange();
  const values = dataRange.getValues();
  const displayValues = dataRange.getDisplayValues();
  if (values.length < 2) return [];

  const map = headerMap(values[0]);
  requireHeaders(map, [H.ID, H.NAME, H.ARCHIVE]);

  const lastWalkMeta = buildLastWalkMeta_(ss);

  const out = [];
  for (let r = 1; r < values.length; r++) {
    const row = values[r];
    const dogId = safeStr(row[map[H.ID]]);
    if (!dogId) continue;

    const archived = Boolean(row[map[H.ARCHIVE]]);
    if (!includeArchived && archived) continue;

    out.push({
      id: dogId,
      name: safeStr(row[map[H.NAME]]),
      pavilion: safeStr(row[map[H.PAVILION]]),
      kennel: safeStr(row[map[H.KENNEL]]),
      age: safeStr(row[map[H.AGE]]),
      chip: safeStr(row[map[H.CHIP]]),
      breed: safeStr(row[map[H.BREED]]),
      look: safeStr(row[map[H.LOOK]]),
      diet: safeStr(row[map[H.DIET]]),
      character: safeStr(row[map[H.CHARACTER]]),
      caution: safeStr(row[map[H.CAUTION]]),
      extra: safeStr(row[map[H.EXTRA]]),
      photo: safeStr(row[map[H.PHOTO]]),
      lastWalk: safeStr(displayValues[r][map[H.LAST_WALK]]),
      lastVolunteer: lastWalkMeta[dogId]?.volunteer || "",
      lastWalkType: lastWalkMeta[dogId]?.typ || "spacer",
      weight: safeStr(row[map[H.WEIGHT]]),
      status: safeStr(row[map[H.STATUS]]) || "dostępny",
      nieWydawacWlascicielowi: Boolean(row[map[H.NIE_WYDAWAC]]),
      kastracja: safeStr(row[map[H.KASTRACJA]]) || "nie_kastrowany",
      kastracjaData: safeStr(row[map[H.KASTRACJA_DATA]]),
      kastracyjaPowod: safeStr(row[map[H.KASTRACJA_POWOD]]),
      archived,
    });
  }

  return out;
}

// Jeden przebieg po arkuszu Spacery zamiast dwóch pełnych odczytów —
// getDogs to najczęstsze zapytanie i rośnie z każdym zapisanym spacerem.
// "Ostatni" wpis wybierany po dacie, nie po kolejności wierszy.
function buildLastWalkMeta_(ss) {
  const sh = ss.getSheetByName(WALKS_SHEET_NAME);
  if (!sh) return {};
  const values = sh.getDataRange().getValues();
  if (values.length < 2) return {};
  const wMap = headerMap(values[0]);
  const result = {};
  for (let i = 1; i < values.length; i++) {
    const dogId = safeStr(values[i][wMap["DogId"]]);
    if (!dogId) continue;
    const dateStr = safeStr(values[i][wMap["Data spaceru"]]);
    const existing = result[dogId];
    if (existing && existing.date > dateStr) continue;
    result[dogId] = {
      date: dateStr,
      volunteer: safeStr(values[i][wMap["Wolontariusz"]]),
      typ: safeStr(values[i][wMap["Typ"]]) || "spacer",
    };
  }
  return result;
}

function setArchive(payload) {
  requireRole_(payload, ["staff", "admin"]);

  const dogId = safeStr(payload?.dogId);
  const archived = Boolean(payload?.archived);

  if (!dogId) throw new Error("Brak dogId");

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sh = ss.getSheetByName(DOGS_SHEET_NAME);
  if (!sh) throw new Error("Brak zakładki: " + DOGS_SHEET_NAME);

  const values = sh.getDataRange().getValues();
  const map = headerMap(values[0]);
  requireHeaders(map, [H.ID, H.ARCHIVE]);

  const rowIndex = findDogRow(values, map, dogId);
  if (rowIndex === -1) throw new Error("Nie znaleziono psa o ID: " + dogId);

  if (archived) {
    const headerRow = values[0];
    const dogRow = values[rowIndex];

    const archiveSheet = getOrCreateSheet(ss, ARCHIVE_SHEET_NAME);
    if (archiveSheet.getLastRow() === 0) {
      archiveSheet.getRange(1, 1, 1, headerRow.length).setValues([headerRow]);
      archiveSheet.setFrozenRows(1);
    }

    const dataRow = dogRow.map((cell) => {
      if (cell instanceof Date) return Utilities.formatDate(cell, POLAND_TIMEZONE, "yyyy-MM-dd HH:mm:ss");
      return cell;
    });
    archiveSheet.appendRow(dataRow);
    sh.deleteRow(rowIndex + 1);
  } else {
    sh.getRange(rowIndex + 1, map[H.ARCHIVE] + 1).setValue(false);
  }

  return { success: true, dogId, archived };
}

// Zbiorcza aktualizacja bazy psów na podstawie rejestru (PDF w aplikacji):
// - add: nowe psy (id, name, pavilion, box)
// - relocate: zmiana pawilonu/boksu istniejących psów
// - archive: psy nieobecne w rejestrze -> przeniesienie do Archiwum
// Tylko admin; wszystko w jednym wywołaniu (jeden lock, mniejsze quoty).
function bulkUpdateDogs_(payload) {
  requireAdmin(payload);

  const add = Array.isArray(payload?.add) ? payload.add : [];
  const relocate = Array.isArray(payload?.relocate) ? payload.relocate : [];
  const archive = Array.isArray(payload?.archive) ? payload.archive : [];

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sh = ss.getSheetByName(DOGS_SHEET_NAME);
  if (!sh) throw new Error("Brak zakładki: " + DOGS_SHEET_NAME);

  let values = sh.getDataRange().getValues();
  const map = headerMap(values[0]);
  requireHeaders(map, [H.ID, H.NAME, H.PAVILION, H.KENNEL, H.ARCHIVE]);
  const headerRow = values[0];

  const errors = [];
  let relocated = 0, added = 0, archivedCount = 0, filled = 0;

  // 1. Przenosiny
  for (const r of relocate) {
    const dogId = safeStr(r?.dogId);
    const rowIndex = findDogRow(values, map, dogId);
    if (rowIndex === -1) { errors.push("relokacja: nie znaleziono " + dogId); continue; }
    sh.getRange(rowIndex + 1, map[H.PAVILION] + 1).setValue(sanitizeText_(r?.pavilion, 20));
    sh.getRange(rowIndex + 1, map[H.KENNEL] + 1).setValue(sanitizeText_(String(r?.box ?? ""), 20));
    relocated++;
  }

  // 2. Nowe psy
  for (const a of add) {
    const id = sanitizeText_(a?.id, 50);
    const name = sanitizeText_(a?.name, 100);
    if (!id || !name) { errors.push("dodawanie: brak id lub imienia"); continue; }
    if (findDogRow(values, map, id) !== -1) { errors.push("dodawanie: " + id + " już istnieje"); continue; }
    const row = new Array(headerRow.length).fill("");
    row[map[H.ID]] = id;
    row[map[H.NAME]] = name;
    row[map[H.PAVILION]] = sanitizeText_(a?.pavilion, 20);
    row[map[H.KENNEL]] = sanitizeText_(String(a?.box ?? ""), 20);
    if (map[H.AGE] !== undefined) row[map[H.AGE]] = sanitizeText_(a?.age, 50);
    if (map[H.CHIP] !== undefined) row[map[H.CHIP]] = sanitizeText_(a?.chip, 50);
    if (map[H.BREED] !== undefined) row[map[H.BREED]] = sanitizeText_(a?.breed, 100);
    row[map[H.ARCHIVE]] = false;
    sh.appendRow(row);
    added++;
  }

  // 2b. Uzupełnienia — wpisujemy TYLKO w puste komórki (ochrona
  //     ręcznie wprowadzonych danych przed nadpisaniem)
  const fill = Array.isArray(payload?.fill) ? payload.fill : [];
  if (fill.length > 0) {
    values = sh.getDataRange().getValues();
    const fillCols = [
      { key: "age", col: map[H.AGE], max: 50 },
      { key: "chip", col: map[H.CHIP], max: 50 },
      { key: "breed", col: map[H.BREED], max: 100 },
    ];
    for (const f of fill) {
      const dogId = safeStr(f?.dogId);
      const rowIndex = findDogRow(values, map, dogId);
      if (rowIndex === -1) { errors.push("uzupełnienie: nie znaleziono " + dogId); continue; }
      let any = false;
      for (const fc of fillCols) {
        if (fc.col === undefined) continue;
        const incoming = sanitizeText_(f?.[fc.key], fc.max);
        if (!incoming) continue;
        if (safeStr(values[rowIndex][fc.col])) continue; // komórka już wypełniona
        sh.getRange(rowIndex + 1, fc.col + 1).setValue(incoming);
        any = true;
      }
      if (any) filled++;
    }
  }

  // 3. Archiwizacja — świeży odczyt (dodawanie/relokacje zmieniły arkusz),
  //    usuwanie od dołu, żeby indeksy się nie przesuwały
  if (archive.length > 0) {
    values = sh.getDataRange().getValues();
    const archiveSheet = getOrCreateSheet(ss, ARCHIVE_SHEET_NAME);
    if (archiveSheet.getLastRow() === 0) {
      archiveSheet.getRange(1, 1, 1, headerRow.length).setValues([headerRow]);
      archiveSheet.setFrozenRows(1);
    }
    const wanted = archive.map((x) => safeStr(x?.dogId)).filter(Boolean);
    const rowsToArchive = [];
    for (let i = 1; i < values.length; i++) {
      const id = safeStr(values[i][map[H.ID]]);
      if (wanted.indexOf(id) !== -1) rowsToArchive.push(i);
    }
    rowsToArchive.sort((a, b) => b - a);
    for (const i of rowsToArchive) {
      const dataRow = values[i].map((cell) => {
        if (cell instanceof Date) return Utilities.formatDate(cell, POLAND_TIMEZONE, "yyyy-MM-dd HH:mm:ss");
        return cell;
      });
      archiveSheet.appendRow(dataRow);
      sh.deleteRow(i + 1);
      archivedCount++;
    }
    const foundIds = rowsToArchive.map((i) => safeStr(values[i][map[H.ID]]));
    for (const w of wanted) {
      if (foundIds.indexOf(w) === -1) errors.push("archiwum: nie znaleziono " + w);
    }
  }

  return { success: true, added: added, relocated: relocated, filled: filled, archived: archivedCount, errors: errors };
}

// Import historii spacerów z harmonogramu wolontariuszy (jednorazowa
// migracja, tylko admin): dopisuje brakujące wiersze do arkusza Spacery
// w JEDNYM wsadzie i aktualizuje "Ostatni spacer" jeśli nowszy.
function bulkImportWalks_(payload) {
  requireAdmin(payload);

  const walks = Array.isArray(payload?.walks) ? payload.walks : [];
  if (walks.length === 0) return { success: true, imported: 0, skipped: 0 };
  if (walks.length > 2000) throw new Error("Za dużo wpisów na raz (max 2000)");

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const dogsSheet = ss.getSheetByName(DOGS_SHEET_NAME);
  if (!dogsSheet) throw new Error("Brak zakładki: " + DOGS_SHEET_NAME);
  const dogsValues = dogsSheet.getDataRange().getValues();
  const dMap = headerMap(dogsValues[0]);
  requireHeaders(dMap, [H.ID, H.NAME, H.LAST_WALK, H.PAVILION, H.KENNEL]);

  const dogRowById = {};
  for (let i = 1; i < dogsValues.length; i++) {
    const id = safeStr(dogsValues[i][dMap[H.ID]]);
    if (id) dogRowById[id] = i;
  }

  const walksSheet = getOrCreateSheet(ss, WALKS_SHEET_NAME);
  ensureHeaders(walksSheet, [
    "Data spaceru", "DogId", "Imię psa", "Pawilon", "Boks", "Wolontariusz", "Uwagi", "Typ",
  ]);
  // Istniejące wpisy dogId+dzień — nie duplikujemy
  const existing = {};
  const wValues = walksSheet.getDataRange().getValues();
  const wMap = headerMap(wValues[0]);
  for (let i = 1; i < wValues.length; i++) {
    const id = safeStr(wValues[i][wMap["DogId"]]);
    const key = walkDateKey_(wValues[i][wMap["Data spaceru"]]);
    if (id && key) existing[id + "|" + key] = true;
  }

  const newRows = [];
  const newestPerDog = {};
  let skipped = 0;
  const errors = [];

  for (const w of walks) {
    const dogId = safeStr(w?.dogId);
    const date = safeStr(w?.date);
    if (!dogId || !/^\d{4}-\d{2}-\d{2}$/.test(date)) { skipped++; continue; }
    if (existing[dogId + "|" + date]) { skipped++; continue; }
    const rowIdx = dogRowById[dogId];
    if (rowIdx === undefined) { errors.push("nie znaleziono psa " + dogId); skipped++; continue; }
    existing[dogId + "|" + date] = true;

    const dogRow = dogsValues[rowIdx];
    const when = date + " 12:00:00";
    newRows.push([
      when,
      dogId,
      safeStr(dogRow[dMap[H.NAME]]),
      safeStr(dogRow[dMap[H.PAVILION]]),
      safeStr(dogRow[dMap[H.KENNEL]]),
      "Harmonogram (import)",
      "",
      "spacer",
    ]);
    if (!newestPerDog[dogId] || when > newestPerDog[dogId]) newestPerDog[dogId] = when;
  }

  if (newRows.length > 0) {
    walksSheet
      .getRange(walksSheet.getLastRow() + 1, 1, newRows.length, newRows[0].length)
      .setValues(newRows);
  }

  // "Ostatni spacer" — tylko jeśli import jest nowszy niż obecna wartość
  let lastWalkUpdated = 0;
  for (const dogId in newestPerDog) {
    const rowIdx = dogRowById[dogId];
    const current = walkStamp_(dogsValues[rowIdx][dMap[H.LAST_WALK]]);
    // brak wartości, nieporównywalny format lub starsza data -> aktualizuj
    if (!current || !/^\d{4}-/.test(current) || newestPerDog[dogId] > current) {
      dogsSheet.getRange(rowIdx + 1, dMap[H.LAST_WALK] + 1).setValue(newestPerDog[dogId]);
      lastWalkUpdated++;
    }
  }

  return {
    success: true,
    imported: newRows.length,
    skipped: skipped,
    lastWalkUpdated: lastWalkUpdated,
    errors: errors.slice(0, 20),
  };
}

// Przelicza "Ostatni spacer" WSZYSTKICH psów z pełnej historii arkusza
// Spacery (naprawa danych po imporcie wykonanym przed poprawką dat).
// Tylko admin.
function recomputeLastWalks_(payload) {
  requireAdmin(payload);

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const walksSheet = ss.getSheetByName(WALKS_SHEET_NAME);
  if (!walksSheet || walksSheet.getLastRow() < 2) {
    return { success: true, updated: 0, dogs: 0 };
  }

  // Najnowszy spacer per pies (porównanie po znormalizowanym znaczniku)
  const wValues = walksSheet.getDataRange().getValues();
  const wMap = headerMap(wValues[0]);
  requireHeaders(wMap, ["Data spaceru", "DogId"]);
  const newest = {};
  for (let i = 1; i < wValues.length; i++) {
    const dogId = safeStr(wValues[i][wMap["DogId"]]);
    if (!dogId) continue;
    const stamp = walkStamp_(wValues[i][wMap["Data spaceru"]]);
    if (!/^\d{4}-/.test(stamp)) continue;
    if (!newest[dogId] || stamp > newest[dogId]) newest[dogId] = stamp;
  }

  const dogsSheet = ss.getSheetByName(DOGS_SHEET_NAME);
  if (!dogsSheet) throw new Error("Brak zakładki: " + DOGS_SHEET_NAME);
  const dValues = dogsSheet.getDataRange().getValues();
  const dMap = headerMap(dValues[0]);
  requireHeaders(dMap, [H.ID, H.LAST_WALK]);

  let updated = 0;
  let dogsSeen = 0;
  for (let i = 1; i < dValues.length; i++) {
    const dogId = safeStr(dValues[i][dMap[H.ID]]);
    if (!dogId || !newest[dogId]) continue;
    dogsSeen++;
    const current = walkStamp_(dValues[i][dMap[H.LAST_WALK]]);
    if (current === newest[dogId]) continue;
    dogsSheet.getRange(i + 1, dMap[H.LAST_WALK] + 1).setValue(newest[dogId]);
    updated++;
  }

  return { success: true, updated: updated, dogs: dogsSeen };
}

// ===============================
// CORE – WALKS
// ===============================
function recordWalk(payload) {
  const dogId = safeStr(payload?.dogId);
  if (!dogId) throw new Error("Brak dogId");

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const dogsSheet = ss.getSheetByName(DOGS_SHEET_NAME);
  if (!dogsSheet) throw new Error("Brak zakładki: " + DOGS_SHEET_NAME);

  const dogsValues = dogsSheet.getDataRange().getValues();
  const map = headerMap(dogsValues[0]);
  requireHeaders(map, [H.ID, H.NAME, H.LAST_WALK, H.PAVILION, H.KENNEL]);

  const rowIndex = findDogRow(dogsValues, map, dogId);
  if (rowIndex === -1) throw new Error("Nie znaleziono psa o ID: " + dogId);

  const dogRow = dogsValues[rowIndex];

  // Opcjonalny walkAt — dla zapisów z kolejki offline (max 7 dni wstecz)
  let now = nowInPolandText();
  const walkAt = safeStr(payload?.walkAt);
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(walkAt)) {
    const parsed = new Date(walkAt.replace(" ", "T"));
    const ageDays = (Date.now() - parsed.getTime()) / 86400000;
    if (!isNaN(parsed) && ageDays >= 0 && ageDays <= 7) {
      now = walkAt;
    }
  }

  const typ = safeStr(payload?.typ) === "wybieg" ? "wybieg" : "spacer";

  const walksSheet = getOrCreateSheet(ss, WALKS_SHEET_NAME);
  ensureHeaders(walksSheet, [
    "Data spaceru",
    "DogId",
    "Imię psa",
    "Pawilon",
    "Boks",
    "Wolontariusz",
    "Uwagi",
    "Typ",
  ]);

  walksSheet.appendRow([
    now,
    dogId,
    safeStr(dogRow[map[H.NAME]]),
    safeStr(dogRow[map[H.PAVILION]]),
    safeStr(dogRow[map[H.KENNEL]]),
    safeStr(payload?.user?.displayName) || "Wolontariusz",
    sanitizeText_(payload?.notes, 2000),
    typ,
  ]);

  // Aktualizuj "Ostatni spacer" tylko jeśli nowy wpis jest nowszy
  // (zapis z kolejki offline nie może cofnąć świeższego spaceru)
  const currentLast = walkStamp_(dogRow[map[H.LAST_WALK]]);
  if (!currentLast || !/^\d{4}-/.test(currentLast) || now >= currentLast) {
    dogsSheet.getRange(rowIndex + 1, map[H.LAST_WALK] + 1).setValue(now);
  }
}

// Cofnięcie spaceru — usuwa wpisy psa z danego dnia (tylko dzisiejszego,
// żeby wolontariusz mógł poprawić pomyłkowe tapnięcie) i odtwarza
// poprzednią wartość "Ostatni spacer".
function deleteWalk(payload) {
  const dogId = safeStr(payload?.dogId);
  const date = safeStr(payload?.date);
  if (!dogId) throw new Error("Brak dogId");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Nieprawidłowa data");

  const todayPoland = Utilities.formatDate(new Date(), POLAND_TIMEZONE, "yyyy-MM-dd");
  if (date !== todayPoland && !isAdminEmail_(payload?.user?.email)) {
    throw new Error("Można cofnąć tylko dzisiejszy spacer");
  }

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const walksSheet = ss.getSheetByName(WALKS_SHEET_NAME);
  if (!walksSheet || walksSheet.getLastRow() < 2) return { success: true, deleted: 0 };

  const values = walksSheet.getDataRange().getValues();
  const map = headerMap(values[0]);
  requireHeaders(map, ["Data spaceru", "DogId"]);

  let deleted = 0;
  let latestRemaining = "";
  // Od dołu, żeby usuwanie nie przesuwało indeksów
  for (let i = values.length - 1; i >= 1; i--) {
    const row = values[i];
    if (safeStr(row[map["DogId"]]) !== dogId) continue;
    const dateKey = walkDateKey_(row[map["Data spaceru"]]);
    if (dateKey === date) {
      walksSheet.deleteRow(i + 1);
      deleted++;
    } else if (walkStamp_(row[map["Data spaceru"]]) > latestRemaining) {
      latestRemaining = walkStamp_(row[map["Data spaceru"]]);
    }
  }

  // Odtwórz "Ostatni spacer" z pozostałych wpisów
  const dogsSheet = ss.getSheetByName(DOGS_SHEET_NAME);
  if (dogsSheet && deleted > 0) {
    const dogsValues = dogsSheet.getDataRange().getValues();
    const dogsMap = headerMap(dogsValues[0]);
    const rowIndex = findDogRow(dogsValues, dogsMap, dogId);
    if (rowIndex !== -1 && dogsMap[H.LAST_WALK] !== undefined) {
      dogsSheet.getRange(rowIndex + 1, dogsMap[H.LAST_WALK] + 1).setValue(latestRemaining);
    }
  }

  return { success: true, deleted: deleted };
}

// Pełny znacznik "yyyy-MM-dd HH:mm:ss" z komórki arkusza — komórki bywają
// obiektami Date (wtedy safeStr daje "Thu Jul 10 2026...", co psuje
// porównania tekstowe dat)
// Komórka "Data spaceru" bywa zwracana jako obiekt Date. Arkusze parsują
// zapisany przez nas tekst "yyyy-MM-dd HH:mm:ss" na wartość czasową
// interpretowaną w strefie ARKUSZA — nie w strefie polskiej. Formatowanie
// takiej wartości w Europe/Warsaw przesuwa godzinę o różnicę stref
// (poranny spacer wychodził w raporcie jako popołudniowy).
// Formatujemy w strefie arkusza, więc wynik zgadza się z tym, co widać
// w samym arkuszu. Gdy arkusz ma strefę polską, zachowanie się nie zmienia.
function sheetTz_(ss) {
  try {
    return ss.getSpreadsheetTimeZone() || POLAND_TIMEZONE;
  } catch (e) {
    return POLAND_TIMEZONE;
  }
}

function cellStamp_(raw, tz) {
  if (raw instanceof Date) {
    return Utilities.formatDate(raw, tz, "yyyy-MM-dd HH:mm:ss");
  }
  return safeStr(raw);
}

function walkStamp_(raw) {
  if (raw instanceof Date) {
    return Utilities.formatDate(raw, POLAND_TIMEZONE, "yyyy-MM-dd HH:mm:ss");
  }
  return safeStr(raw);
}

// Klucz dnia (yyyy-MM-dd) z komórki "Data spaceru" — bez przechodzenia
// przez new Date(string), które parsuje w strefie serwera, nie polskiej
function walkDateKey_(rawDate) {
  if (rawDate instanceof Date) {
    return Utilities.formatDate(rawDate, POLAND_TIMEZONE, "yyyy-MM-dd");
  }
  const s = safeStr(rawDate);
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : "";
}

// ===============================
// CORE – REPORTS
// ===============================
function reportBehavior(payload) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const reportsSheet = getOrCreateSheet(ss, REPORTS_SHEET_NAME);

  ensureHeaders(reportsSheet, [
    "timestamp",
    "dogName",
    "dogId",
    "volunteerName",
    "opis",
    "status",
    "resolved",
    "reviewedAt",
    "reviewedBy",
  ]);

  reportsSheet.appendRow([
    nowInPolandText(),
    safeStr(payload?.dogName),
    safeStr(payload?.dogId),
    safeStr(payload?.user?.displayName) || "Wolontariusz",
    sanitizeText_(payload?.opis, 5000),
    "NOWE",
    false,
    "",
    "",
  ]);
}

function adminGetBehaviorReports() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const reportsSheet = getOrCreateSheet(ss, REPORTS_SHEET_NAME);

  ensureHeaders(reportsSheet, [
    "timestamp",
    "dogName",
    "dogId",
    "volunteerName",
    "opis",
    "status",
    "resolved",
    "reviewedAt",
    "reviewedBy",
  ]);

  const data = reportsSheet.getDataRange().getValues();
  if (data.length < 2) return [];

  const headers = data[0];

  return data
    .slice(1)
    .map((row, index) => {
      const item = { id: String(index + 2) };
      headers.forEach((header, colIndex) => {
        const key = safeStr(header);
        if (key) item[key] = row[colIndex];
      });

      item.idZgloszenia = item.id;
      item.reportId = item.id;
      item.status = safeStr(item.status);
      item.resolved = toBoolean_(item.resolved);
      item.dogId = safeStr(item.dogId);
      item.dogName = safeStr(item.dogName);
      item.reason = safeStr(item.opis);
      item.volunteerName = safeStr(item.volunteerName);

      return item;
    })
    .filter((item) => item.dogId || item.dogName || item.reason)
    .reverse();
}

function adminUpdateBehaviorReport(payload) {
  const reportId = Number(safeStr(payload?.idZgloszenia || payload?.idZgłoszenia || payload?.reportId || payload?.id));
  const status = safeStr(payload?.status || payload?.decision);
  if (!reportId || reportId < 2) throw new Error("Brak poprawnego id zgłoszenia");

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const reportsSheet = getOrCreateSheet(ss, REPORTS_SHEET_NAME);

  ensureHeaders(reportsSheet, [
    "timestamp",
    "dogName",
    "dogId",
    "volunteerName",
    "opis",
    "status",
    "resolved",
    "reviewedAt",
    "reviewedBy",
  ]);

  if (reportId > reportsSheet.getLastRow()) {
    throw new Error("Nie znaleziono zgłoszenia o ID: " + reportId);
  }

  const headers = reportsSheet.getRange(1, 1, 1, reportsSheet.getLastColumn()).getValues()[0];
  const map = headerMap(headers);

  if (map.status !== undefined && status) {
    reportsSheet.getRange(reportId, map.status + 1).setValue(status);
  }

  const resolved = status ? REPORT_RESOLVED_STATUSES.indexOf(status) > -1 : toBoolean_(payload?.resolved);

  if (map.resolved !== undefined) {
    reportsSheet.getRange(reportId, map.resolved + 1).setValue(Boolean(resolved));
  }

  if (map.reviewedAt !== undefined) {
    reportsSheet.getRange(reportId, map.reviewedAt + 1).setValue(nowInPolandText());
  }

  if (map.reviewedBy !== undefined) {
    reportsSheet.getRange(reportId, map.reviewedBy + 1).setValue(
      safeStr(payload?.user?.displayName) || "Nieznany"
    );
  }

  return { success: true, id: String(reportId), status: status || "", resolved: Boolean(resolved) };
}

// ===============================
// CORE – FAVORITES
// ===============================
function toggleFavorite(payload) {
  const uid = safeStr(payload?.user?.uid);
  const dogId = safeStr(payload?.dogId);
  if (!uid) throw new Error("Brak uid użytkownika");
  if (!dogId) throw new Error("Brak dogId");

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sh = getOrCreateSheet(ss, FAVORITES_SHEET_NAME);
  ensureHeaders(sh, ["uid", "dogId", "addedAt"]);

  const values = sh.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (safeStr(values[i][0]) === uid && safeStr(values[i][1]) === dogId) {
      sh.deleteRow(i + 1);
      return { success: true, favorite: false, dogId };
    }
  }

  sh.appendRow([uid, dogId, nowInPolandText()]);
  return { success: true, favorite: true, dogId };
}

function getMyDogs(payload) {
  const uid = safeStr(payload?.user?.uid);
  if (!uid) throw new Error("Brak uid użytkownika");

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const favSheet = getOrCreateSheet(ss, FAVORITES_SHEET_NAME);
  ensureHeaders(favSheet, ["uid", "dogId", "addedAt"]);

  const favoriteRows = favSheet.getDataRange().getValues().slice(1);
  const dogIds = favoriteRows
    .filter((row) => safeStr(row[0]) === uid)
    .map((row) => safeStr(row[1]))
    .filter(Boolean);

  if (!dogIds.length) return [];

  const dogs = getDogs(false);
  const byId = {};
  dogs.forEach((dog) => {
    byId[safeStr(dog.id)] = dog;
  });

  return dogIds.map((dogId) => byId[dogId]).filter(Boolean);
}


function toggleBehaviorystDog(payload) {
  const uid = safeStr(payload?.user?.uid);
  const dogId = safeStr(payload?.dogId);
  if (!uid) throw new Error("Brak uid użytkownika");
  if (!dogId) throw new Error("Brak dogId");

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sh = getOrCreateSheet(ss, BEHAVIORYST_DOGS_SHEET_NAME);
  ensureHeaders(sh, ["uid", "dogId", "addedAt"]);

  const values = sh.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (safeStr(values[i][0]) === uid && safeStr(values[i][1]) === dogId) {
      sh.deleteRow(i + 1);
      return { success: true, assigned: false, dogId };
    }
  }

  sh.appendRow([uid, dogId, nowInPolandText()]);
  return { success: true, assigned: true, dogId };
}

function getBehaviorystDogs(payload) {
  const uid = safeStr(payload?.user?.uid);
  if (!uid) throw new Error("Brak uid użytkownika");

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const workSheet = getOrCreateSheet(ss, BEHAVIORYST_DOGS_SHEET_NAME);
  ensureHeaders(workSheet, ["uid", "dogId", "addedAt"]);

  const workRows = workSheet.getDataRange().getValues().slice(1);
  const dogIds = workRows
    .filter((row) => safeStr(row[0]) === uid)
    .map((row) => safeStr(row[1]))
    .filter(Boolean);

  if (!dogIds.length) return [];

  const dogs = getDogs(false);
  const byId = {};
  dogs.forEach((dog) => {
    byId[safeStr(dog.id)] = dog;
  });

  return dogIds.map((dogId) => byId[dogId]).filter(Boolean);
}

// ===============================
// CORE – OPIEKUNOWIE
// ===============================
function getOpiekunowie(dogId) {
  if (!dogId) return [];

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sh = getOrCreateSheet(ss, OPIEKUNOWIE_SHEET_NAME);
  ensureHeaders(sh, ["uid", "dogId", "displayName", "email", "addedAt"]);

  const values = sh.getDataRange().getValues().slice(1);
  return values
    .filter((row) => safeStr(row[1]) === safeStr(dogId))
    .map((row) => ({
      uid: safeStr(row[0]),
      dogId: safeStr(row[1]),
      displayName: safeStr(row[2]),
      addedAt: safeStr(row[4]),
    }));
}

function toggleOpiekun(payload) {
  const uid = safeStr(payload?.user?.uid);
  const dogId = safeStr(payload?.dogId);
  const displayName = safeStr(payload?.user?.displayName) || "Nieznany";
  const email = safeStr(payload?.user?.email);

  if (!uid) throw new Error("Brak uid użytkownika");
  if (!dogId) throw new Error("Brak dogId");

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sh = getOrCreateSheet(ss, OPIEKUNOWIE_SHEET_NAME);
  ensureHeaders(sh, ["uid", "dogId", "displayName", "email", "addedAt"]);

  const values = sh.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (safeStr(values[i][0]) === uid && safeStr(values[i][1]) === dogId) {
      sh.deleteRow(i + 1);
      return { success: true, isOpiekun: false, dogId };
    }
  }

  sh.appendRow([uid, dogId, displayName, email, nowInPolandText()]);
  return { success: true, isOpiekun: true, dogId };
}

function validateSharedSecret(payload) {
  const expected = PropertiesService.getScriptProperties().getProperty(SHARED_SECRET_PROPERTY_NAME);
  if (!expected) throw new Error("SHARED_SECRET nie jest skonfigurowany w Script Properties");

  if (safeStr(payload?.__secret) !== safeStr(expected)) {
    throw new Error("Unauthorized");
  }
}

// Walidacja sekretu dla żądań GET — proxy (api/gs.js) dokleja go do parametrów.
// Bez sekretu bezpośrednie wywołania /exec zwracają błąd.
function validateSharedSecretParam_(e) {
  const expected = PropertiesService.getScriptProperties().getProperty(SHARED_SECRET_PROPERTY_NAME);
  if (!expected) throw new Error("SHARED_SECRET nie jest skonfigurowany w Script Properties");

  if (safeStr(e?.parameter?.__secret) !== safeStr(expected)) {
    throw new Error("Unauthorized");
  }
}

function isAdminEmail_(email) {
  const userEmail = safeStr(email).toLowerCase();
  if (!userEmail) return false;
  const raw = PropertiesService.getScriptProperties().getProperty(ADMIN_EMAILS_PROPERTY_NAME) || "";
  const adminEmails = raw.split(",").map(e => e.trim().toLowerCase()).filter(Boolean);
  return adminEmails.includes(userEmail);
}

function requireAdmin(payload) {
  const userEmail = safeStr(payload?.user?.email).toLowerCase();
  if (!userEmail) throw new Error("Brak emaila użytkownika");

  // Admin = e-mail na liście ADMIN_EMAILS lub rola "admin" w arkuszu Roles
  if (!isAdminEmail_(userEmail) && getUserRole_(userEmail) !== "admin") {
    throw new Error("Brak uprawnień administratora");
  }
}

// Wymaga jednej z podanych ról (albo admina z listy e-maili)
function requireRole_(payload, roles) {
  const userEmail = safeStr(payload?.user?.email);
  if (!userEmail) throw new Error("Brak emaila użytkownika");
  if (isAdminEmail_(userEmail)) return;
  const role = getUserRole_(userEmail);
  if (!roles.includes(role)) {
    throw new Error("Brak uprawnień do tej operacji");
  }
}

// Ochrona przed wstrzyknięciem formuł do arkusza + limit długości pól tekstowych
function sanitizeText_(value, maxLen) {
  let s = safeStr(value);
  if (maxLen && s.length > maxLen) s = s.slice(0, maxLen);
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return s;
}

// ===============================
// ARCHIWUM – onEdit checkbox (dwukierunkowo)
// ===============================
function onEdit(e) {
  if (!e || !e.range) return;
  handleArchiveCheckboxEdit(e.range, e.value);
}

function handleArchiveCheckboxEdit(range, rawValue) {
  const sheet = range.getSheet();
  const row = range.getRow();
  if (row <= 1) return;

  const sheetName = sheet.getName();
  if (sheetName !== DOGS_SHEET_NAME && sheetName !== ARCHIVE_SHEET_NAME) return;

  const headerRow = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const archiveCol = headerRow.findIndex((h) => safeStr(h) === ARCHIVE_HEADER_NAME) + 1;
  if (!archiveCol || range.getColumn() !== archiveCol) return;

  const checked = String(rawValue ?? range.getValue()).toLowerCase() === "true";

  if (sheetName === DOGS_SHEET_NAME && checked) {
    moveRowBetweenSheets_(sheet, row, ARCHIVE_SHEET_NAME, archiveCol, true);
  } else if (sheetName === ARCHIVE_SHEET_NAME && !checked) {
    moveRowBetweenSheets_(sheet, row, DOGS_SHEET_NAME, archiveCol, false);
  }
}

function moveRowBetweenSheets_(sourceSheet, sourceRow, targetSheetName, archiveCol, archiveChecked) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const targetSheet = getOrCreateSheet(ss, targetSheetName);

  const values = sourceSheet.getRange(sourceRow, 1, 1, sourceSheet.getLastColumn()).getValues();
  values[0][archiveCol - 1] = archiveChecked;

  if (targetSheet.getLastRow() === 0) {
    const headers = sourceSheet.getRange(1, 1, 1, sourceSheet.getLastColumn()).getValues();
    targetSheet.getRange(1, 1, 1, headers[0].length).setValues(headers);
  }

  targetSheet.appendRow(values[0]);
  const targetRow = targetSheet.getLastRow();

  sourceSheet.getRange(sourceRow, 1, 1, sourceSheet.getLastColumn()).clearDataValidations();
  targetSheet.getRange(targetRow, archiveCol).insertCheckboxes();
  targetSheet.getRange(targetRow, archiveCol).setValue(archiveChecked);

  sourceSheet.deleteRow(sourceRow);
}

// ===============================
// CORE – HISTORIA PSA
// ===============================
function addDogHistory(payload) {
  const dogId = safeStr(payload?.dogId);
  const kategoria = safeStr(payload?.kategoria);
  if (!dogId) throw new Error("Brak dogId");
  if (!kategoria) throw new Error("Brak kategorii");
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sh = getOrCreateSheet(ss, HISTORY_SHEET_NAME);
  ensureHeaders(sh, ["timestamp","dogId","dogName","kategoria","wartość","uwagi","autor"]);
  sh.appendRow([
    nowInPolandText(), dogId, safeStr(payload?.dogName),
    kategoria, sanitizeText_(payload?.wartosc, 2000), sanitizeText_(payload?.uwagi, 2000),
    safeStr(payload?.user?.displayName) || "Nieznany",
  ]);
}

function getDogHistory(dogId) {
  if (!dogId) return [];
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sh = ss.getSheetByName(HISTORY_SHEET_NAME);
  if (!sh) return [];
  const values = sh.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0];
  return values.slice(1)
    .filter(row => safeStr(row[1]) === safeStr(dogId))
    .map(row => {
      const item = {};
      headers.forEach((h, i) => { if (safeStr(h)) item[safeStr(h)] = row[i]; });
      return item;
    }).reverse();
}

// ===============================
// CORE – LAST WALK INFO
// ===============================
function getLastWalkInfo(dogId) {
  if (!dogId) return null;
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sh = ss.getSheetByName(WALKS_SHEET_NAME);
  if (!sh) return null;
  const values = sh.getDataRange().getValues();
  if (values.length < 2) return null;
  const map = headerMap(values[0]);
  let lastWalk = null;
  for (let i = 1; i < values.length; i++) {
    if (safeStr(values[i][map["DogId"]]) === safeStr(dogId)) {
      lastWalk = {
        date: safeStr(values[i][map["Data spaceru"]]),
        volunteer: safeStr(values[i][map["Wolontariusz"]]),
      };
    }
  }
  return lastWalk;
}

function getDogWalkHistory_(dogId) {
  if (!dogId) return [];
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sh = ss.getSheetByName(WALKS_SHEET_NAME);
  if (!sh || sh.getLastRow() < 2) return [];

  const tz = sheetTz_(ss);
  const values = sh.getDataRange().getValues();
  const map = headerMap(values[0]);
  const entries = [];
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    if (safeStr(row[map["DogId"]]) !== safeStr(dogId)) continue;
    const dateStr = cellStamp_(row[map["Data spaceru"]], tz);
    entries.push({
      date: dateStr,
      volunteer: safeStr(row[map["Wolontariusz"]]),
      notes: safeStr(row[map["Uwagi"]]),
      typ: safeStr(row[map["Typ"]]) || "spacer",
    });
  }
  return entries.reverse();
}

// Miesięczny raport spacerów — wszystkie wpisy z danego miesiąca.
// Czytamy wyłącznie arkusz "Spacery": imię psa, pawilon, boks i wolontariusz
// są w nim zapisane w chwili spaceru, więc raport obejmuje także psy, które
// od tego czasu opuściły schronisko i nie ma ich już w "Bazie psów".
function getWalksReport_(payload) {
  const userEmail = safeStr(payload?.user?.email);
  const role = getUserRole_(userEmail);
  if (!["staff", "ambulatorium", "admin"].includes(role)) {
    throw new Error("Brak uprawnień do raportu spacerów");
  }

  const month = safeStr(payload?.month);
  if (!/^\d{4}-\d{2}$/.test(month)) throw new Error("Nieprawidłowy miesiąc (oczekiwano RRRR-MM)");

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sh = ss.getSheetByName(WALKS_SHEET_NAME);
  if (!sh || sh.getLastRow() < 2) return { month: month, entries: [] };

  const tz = sheetTz_(ss);
  const values = sh.getDataRange().getValues();
  const map = headerMap(values[0]);
  const entries = [];

  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const dateStr = cellStamp_(row[map["Data spaceru"]], tz);
    if (dateStr.slice(0, 7) !== month) continue;

    entries.push({
      date: dateStr,
      dogId: safeStr(row[map["DogId"]]),
      dogName: safeStr(row[map["Imię psa"]]),
      pavilion: safeStr(row[map["Pawilon"]]),
      box: safeStr(row[map["Boks"]]),
      volunteer: safeStr(row[map["Wolontariusz"]]),
      typ: safeStr(row[map["Typ"]]) || "spacer",
    });
  }

  entries.sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
  return { month: month, entries: entries };
}

// ===============================
// ROLES
// ===============================
function getUserRole_(email) {
  if (!email) return "volunteer";
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sh = getOrCreateSheet(ss, ROLES_SHEET_NAME);
  ensureHeaders(sh, ["Email", "Role", "UpdatedAt"]);
  const values = sh.getDataRange().getValues();
  if (values.length < 2) return "volunteer";
  const map = headerMap(values[0]);
  for (let i = 1; i < values.length; i++) {
    if (safeStr(values[i][map["Email"]]).toLowerCase() === email.toLowerCase()) {
      return safeStr(values[i][map["Role"]]) || "volunteer";
    }
  }
  return "volunteer";
}

function setUserRole_(email, role) {
  if (!email) throw new Error("Brak email");
  if (!VALID_ROLES.includes(role)) throw new Error("Nieprawidłowa rola: " + role);
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sh = getOrCreateSheet(ss, ROLES_SHEET_NAME);
  ensureHeaders(sh, ["Email", "Role", "UpdatedAt"]);
  const values = sh.getDataRange().getValues();
  const map = headerMap(values[0]);
  const now = nowInPolandText();
  for (let i = 1; i < values.length; i++) {
    if (safeStr(values[i][map["Email"]]).toLowerCase() === email.toLowerCase()) {
      sh.getRange(i + 1, map["Role"] + 1).setValue(role);
      sh.getRange(i + 1, map["UpdatedAt"] + 1).setValue(now);
      return;
    }
  }
  sh.appendRow([email, role, now]);
}

function listUsersForAdmin_() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sh = getOrCreateSheet(ss, ROLES_SHEET_NAME);
  ensureHeaders(sh, ["Email", "Role", "UpdatedAt"]);
  const values = sh.getDataRange().getValues();
  if (values.length < 2) return [];
  const map = headerMap(values[0]);
  return values.slice(1)
    .map(row => ({
      email: safeStr(row[map["Email"]]),
      role: safeStr(row[map["Role"]]) || "volunteer",
      updatedAt: safeStr(row[map["UpdatedAt"]]),
    }))
    .filter(u => u.email);
}

// ===============================
// HELPERS
// ===============================
function json(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(
    ContentService.MimeType.JSON
  );
}

function safeStr(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function toBoolean_(value) {
  if (value === true || value === false) return value;
  const normalized = safeStr(value).toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "tak" || normalized === "yes";
}

function headerMap(headerRow) {
  const map = {};
  for (let c = 0; c < headerRow.length; c++) {
    const name = safeStr(headerRow[c]);
    if (name) map[name] = c;
  }
  return map;
}

function requireHeaders(map, headers) {
  const missing = headers.filter((h) => map[h] === undefined);
  if (missing.length > 0) {
    throw new Error("Brak wymaganych nagłówków w '" + DOGS_SHEET_NAME + "': " + missing.join(", "));
  }
}

function findDogRow(values, map, dogId) {
  for (let r = 1; r < values.length; r++) {
    const rowDogId = safeStr(values[r][map[H.ID]]);
    if (rowDogId && rowDogId === safeStr(dogId)) return r;
  }
  return -1;
}

function getOrCreateSheet(ss, sheetName) {
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) sheet = ss.insertSheet(sheetName);
  return sheet;
}

function ensureHeaders(sheet, headers) {
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
    return;
  }

  const current = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  const matches = headers.every((header, idx) => String(current[idx] || "") === header);

  if (!matches) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
  }
}

// ===============================
// MEDICAL FLAGS
// ===============================
const MEDICAL_FLAGS_HEADERS = ["id", "dog_id", "flag_type", "is_active", "note", "valid_from", "valid_until", "created_by", "created_at"];

function getMedicalFlags_(dogId) {
  if (!dogId) return { noFood: null, walkBlocked: null };
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sh = getOrCreateSheet(ss, MEDICAL_FLAGS_SHEET_NAME);
  ensureHeaders(sh, MEDICAL_FLAGS_HEADERS);

  const values = sh.getDataRange().getValues();
  if (values.length < 2) return { noFood: null, walkBlocked: null };

  const map = headerMap(values[0]);
  const now = new Date();
  const best = {};

  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    if (safeStr(row[map["dog_id"]]) !== safeStr(dogId)) continue;
    if (!toBoolean_(row[map["is_active"]])) continue;

    const validUntilStr = safeStr(row[map["valid_until"]]);
    if (validUntilStr && new Date(validUntilStr) <= now) continue;

    const validFromStr = safeStr(row[map["valid_from"]]);
    const flagType = safeStr(row[map["flag_type"]]);
    const candidate = {
      id: safeStr(row[map["id"]]),
      note: safeStr(row[map["note"]]),
      validFrom: validFromStr || null,
      validUntil: validUntilStr || null,
      createdBy: safeStr(row[map["created_by"]]),
    };

    const candidateStarted = !validFromStr || new Date(validFromStr) <= now;

    if (!best[flagType]) {
      best[flagType] = candidate;
    } else {
      const currentStarted = !best[flagType].validFrom || new Date(best[flagType].validFrom) <= now;
      if (!currentStarted && candidateStarted) {
        best[flagType] = candidate;
      } else if (!currentStarted && !candidateStarted) {
        const currentFrom = new Date(best[flagType].validFrom);
        const candidateFrom = new Date(validFromStr);
        if (candidateFrom < currentFrom) best[flagType] = candidate;
      }
    }
  }

  return {
    noFood: best["no_food"] || null,
    walkBlocked: best["walk_blocked"] || null,
    próbkaKału: best["próbka_kału"] || null,
    pobranieKrwi: best["pobranie_krwi"] || null,
    zakropienieOczu: best["zakropienie_oczu"] || null,
    inne: best["inne"] || null,
  };
}

function setMedicalFlag_(payload) {
  const userEmail = safeStr(payload?.user?.email);
  const role = getUserRole_(userEmail);
  if (role !== "ambulatorium" && role !== "admin") {
    throw new Error("Brak uprawnien: wymagana rola ambulatorium lub admin");
  }

  const dogId = safeStr(payload?.dogId);
  const flagType = safeStr(payload?.flagType);
  if (!dogId || !flagType) throw new Error("Brakuje dogId lub flagType");

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sh = getOrCreateSheet(ss, MEDICAL_FLAGS_SHEET_NAME);
  ensureHeaders(sh, MEDICAL_FLAGS_HEADERS);

  const values = sh.getDataRange().getValues();
  if (values.length > 1) {
    const map = headerMap(values[0]);
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      if (safeStr(row[map["dog_id"]]) === dogId && safeStr(row[map["flag_type"]]) === flagType && toBoolean_(row[map["is_active"]])) {
        sh.getRange(i + 1, map["is_active"] + 1).setValue(false);
      }
    }
  }

  const id = "mf_" + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36);
  const validFrom = safeStr(payload?.validFrom) || new Date().toISOString();
  const validUntil = safeStr(payload?.validUntil) || "";
  const note = sanitizeText_(payload?.note, 2000) || "";
  const createdBy = safeStr(payload?.createdBy) || safeStr(payload?.user?.displayName) || "Nieznany";
  const createdAt = nowInPolandText();

  sh.appendRow([id, dogId, flagType, true, note, validFrom, validUntil, createdBy, createdAt]);
}

function deactivateMedicalFlag_(payload) {
  const userEmail = safeStr(payload?.user?.email);
  const role = getUserRole_(userEmail);
  const flagType = safeStr(payload?.flagType);

  const TASK_TYPES = ["próbka_kału", "pobranie_krwi", "zakropienie_oczu", "inne"];
  const isTask = TASK_TYPES.includes(flagType);

  if (role === "ambulatorium" || role === "admin") {
    // ambulatorium i admin mogą odwoływać wszystko
  } else if (role === "staff" && isTask) {
    // pracownicy mogą odwoływać tylko zadania medyczne (nie flagi nie_karmić/zakaz_spaceru)
  } else {
    throw new Error("Brak uprawnień do odwołania tej flagi");
  }

  const dogId = safeStr(payload?.dogId);
  if (!dogId || !flagType) throw new Error("Brakuje dogId lub flagType");

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sh = ss.getSheetByName(MEDICAL_FLAGS_SHEET_NAME);
  if (!sh) return;

  const values = sh.getDataRange().getValues();
  if (values.length < 2) return;

  const map = headerMap(values[0]);
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    if (safeStr(row[map["dog_id"]]) === dogId && safeStr(row[map["flag_type"]]) === flagType && toBoolean_(row[map["is_active"]])) {
      sh.getRange(i + 1, map["is_active"] + 1).setValue(false);
    }
  }
}

// ===============================
// LOKALIZACJA PSA
// ===============================
function updateDogLocation_(payload) {
  const userEmail = safeStr(payload?.user?.email);
  const role = getUserRole_(userEmail);
  if (!["staff", "ambulatorium", "admin"].includes(role)) {
    throw new Error("Brak uprawnien do zmiany lokalizacji psa");
  }

  const dogId = safeStr(payload?.dogId);
  const pavilion = safeStr(payload?.pavilion);
  const box = safeStr(payload?.box);
  if (!dogId || !pavilion || !box) throw new Error("Brakuje dogId, pavilion lub box");

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sh = ss.getSheetByName(DOGS_SHEET_NAME);
  if (!sh) throw new Error("Nie znaleziono arkusza psów");

  const values = sh.getDataRange().getValues();
  const map = headerMap(values[0]);
  const rowIdx = findDogRow(values, map, dogId);
  if (rowIdx === -1) throw new Error("Nie znaleziono psa: " + dogId);

  sh.getRange(rowIdx + 1, map[H.PAVILION] + 1).setValue(pavilion);
  sh.getRange(rowIdx + 1, map[H.KENNEL] + 1).setValue(box);

  return { success: true, dogId, pavilion, box };
}

function updateDogDiet_(payload) {
  const userEmail = safeStr(payload?.user?.email);
  const role = getUserRole_(userEmail);
  if (!["staff", "ambulatorium", "admin"].includes(role)) {
    throw new Error("Brak uprawnień do zmiany diety psa");
  }

  const dogId = safeStr(payload?.dogId);
  if (!dogId) throw new Error("Brakuje dogId");

  const diet = sanitizeText_(payload?.diet, 2000);

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sh = ss.getSheetByName(DOGS_SHEET_NAME);
  if (!sh) throw new Error("Nie znaleziono arkusza psów");

  const values = sh.getDataRange().getValues();
  const map = headerMap(values[0]);
  requireHeaders(map, [H.ID, H.DIET]);
  const rowIdx = findDogRow(values, map, dogId);
  if (rowIdx === -1) throw new Error("Nie znaleziono psa: " + dogId);

  sh.getRange(rowIdx + 1, map[H.DIET] + 1).setValue(diet);

  return { success: true, dogId, diet };
}

// ===============================
// STATUS PSA
// ===============================
function setDogStatus_(payload) {
  const userEmail = safeStr(payload?.user?.email);
  const role = getUserRole_(userEmail);
  if (!["staff", "ambulatorium", "admin"].includes(role)) {
    throw new Error("Brak uprawnień do zmiany statusu psa");
  }

  const dogId = safeStr(payload?.dogId);
  if (!dogId) throw new Error("Brakuje dogId");

  const VALID_STATUSES = ["dostępny", "ankieta_w_systemie", "nie_do_adopcji"];
  const status = safeStr(payload?.status);
  if (!VALID_STATUSES.includes(status)) throw new Error("Nieprawidłowy status: " + status);

  const nieWydawac = Boolean(payload?.nieWydawacWlascicielowi);

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sh = ss.getSheetByName(DOGS_SHEET_NAME);
  if (!sh) throw new Error("Nie znaleziono arkusza psów");

  const values = sh.getDataRange().getValues();
  const map = headerMap(values[0]);
  requireHeaders(map, [H.ID, H.STATUS, H.NIE_WYDAWAC]);
  const rowIdx = findDogRow(values, map, dogId);
  if (rowIdx === -1) throw new Error("Nie znaleziono psa: " + dogId);

  sh.getRange(rowIdx + 1, map[H.STATUS] + 1).setValue(status);
  sh.getRange(rowIdx + 1, map[H.NIE_WYDAWAC] + 1).setValue(nieWydawac);

  return { success: true, dogId, status, nieWydawacWlascicielowi: nieWydawac };
}

// ===============================
// KASTRACJA
// ===============================
function setCastration_(payload) {
  const userEmail = safeStr(payload?.user?.email);
  const role = getUserRole_(userEmail);
  if (!["staff", "ambulatorium", "admin"].includes(role)) {
    throw new Error("Brak uprawnień do edycji informacji o kastracji");
  }

  const dogId = safeStr(payload?.dogId);
  if (!dogId) throw new Error("Brakuje dogId");

  const VALID = ["kastrowany", "nie_kastrowany", "odroczona"];
  const kastracja = safeStr(payload?.kastracja);
  if (!VALID.includes(kastracja)) throw new Error("Nieprawidłowa wartość kastracji: " + kastracja);

  const kastracjaData = safeStr(payload?.kastracjaData);
  const kastracyjaPowod = sanitizeText_(payload?.kastracyjaPowod, 1000);

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sh = ss.getSheetByName(DOGS_SHEET_NAME);
  if (!sh) throw new Error("Nie znaleziono arkusza psów");

  const values = sh.getDataRange().getValues();
  const map = headerMap(values[0]);
  requireHeaders(map, [H.ID, H.KASTRACJA, H.KASTRACJA_DATA, H.KASTRACJA_POWOD]);
  const rowIdx = findDogRow(values, map, dogId);
  if (rowIdx === -1) throw new Error("Nie znaleziono psa: " + dogId);

  sh.getRange(rowIdx + 1, map[H.KASTRACJA] + 1).setValue(kastracja);
  sh.getRange(rowIdx + 1, map[H.KASTRACJA_DATA] + 1).setValue(kastracjaData);
  sh.getRange(rowIdx + 1, map[H.KASTRACJA_POWOD] + 1).setValue(kastracyjaPowod);

  return { success: true, dogId, kastracja, kastracjaData, kastracyjaPowod };
}

// ===============================
// HISTORIA WAGI
// ===============================
function addWeightEntry_(payload) {
  requireRole_(payload, ["staff", "ambulatorium", "admin"]);

  const dogId = safeStr(payload?.dogId);
  const weight = safeStr(payload?.weight);
  const recordedByName = safeStr(payload?.user?.displayName) || "Nieznany";
  if (!dogId || !weight) throw new Error("Brakuje dogId lub wagi");

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  // Aktualizuj wagę w głównym arkuszu psów
  const dogsSh = ss.getSheetByName(DOGS_SHEET_NAME);
  if (dogsSh) {
    const vals = dogsSh.getDataRange().getValues();
    const map = headerMap(vals[0]);
    const rowIdx = findDogRow(vals, map, dogId);
    if (rowIdx !== -1 && map[H.WEIGHT] !== undefined) {
      dogsSh.getRange(rowIdx + 1, map[H.WEIGHT] + 1).setValue(weight);
    }
  }

  // Dodaj wpis do historii
  const histSh = getOrCreateSheet(ss, WEIGHT_HISTORY_SHEET_NAME);
  if (histSh.getLastRow() === 0) {
    histSh.appendRow(["dog_id", "weight", "date", "recorded_by_name"]);
  }
  histSh.appendRow([dogId, weight, nowInPolandText(), recordedByName]);

  return { success: true, dogId, weight };
}

function getWeightHistory_(dogId) {
  if (!dogId) return [];
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sh = ss.getSheetByName(WEIGHT_HISTORY_SHEET_NAME);
  if (!sh || sh.getLastRow() < 2) return [];

  const values = sh.getDataRange().getValues();
  const map = headerMap(values[0]);
  const entries = [];
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    if (safeStr(row[map["dog_id"]]) !== dogId) continue;
    entries.push({
      weight: safeStr(row[map["weight"]]),
      date: safeStr(row[map["date"]]),
      recordedByName: safeStr(row[map["recorded_by_name"]]),
    });
  }
  // Najnowsze pierwsze
  return entries.reverse();
}

// ===============================
// SEKTOR – psy z obostrzeniami
// ===============================
function getSectorDogs_() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  // 1. Aktywne flagi medyczne
  const flagsSh = ss.getSheetByName(MEDICAL_FLAGS_SHEET_NAME);
  const activeFlags = {}; // dogId -> { noFood, noFoodNote, noFoodUntil, walkBlocked, walkBlockedNote, walkBlockedUntil }
  if (flagsSh && flagsSh.getLastRow() >= 2) {
    const flagsValues = flagsSh.getDataRange().getValues();
    const fm = headerMap(flagsValues[0]);
    const now = new Date();
    for (let i = 1; i < flagsValues.length; i++) {
      const row = flagsValues[i];
      if (!toBoolean_(row[fm["is_active"]])) continue;
      const validFrom = row[fm["valid_from"]] ? new Date(row[fm["valid_from"]]) : null;
      const validUntil = row[fm["valid_until"]] ? new Date(row[fm["valid_until"]]) : null;
      if (validFrom && validFrom > now) continue;
      if (validUntil && validUntil <= now) continue;
      const dogId = safeStr(row[fm["dog_id"]]);
      const flagType = safeStr(row[fm["flag_type"]]);
      if (!dogId) continue;
      if (!activeFlags[dogId]) activeFlags[dogId] = {};
      const note = safeStr(row[fm["note"]]);
      const until = validUntil ? validUntil.toISOString() : null;
      if (flagType === "no_food") {
        activeFlags[dogId].noFood = true;
        activeFlags[dogId].noFoodNote = note;
        activeFlags[dogId].noFoodUntil = until;
      } else if (flagType === "walk_blocked") {
        activeFlags[dogId].walkBlocked = true;
        activeFlags[dogId].walkBlockedNote = note;
        activeFlags[dogId].walkBlockedUntil = until;
      } else if (flagType === "próbka_kału") {
        activeFlags[dogId].próbkaKału = true;
        activeFlags[dogId].próbkaKałuNote = note;
        activeFlags[dogId].próbkaKałuUntil = until;
      } else if (flagType === "pobranie_krwi") {
        activeFlags[dogId].pobranieKrwi = true;
        activeFlags[dogId].pobranieKrwiNote = note;
        activeFlags[dogId].pobranieKrwiUntil = until;
      } else if (flagType === "zakropienie_oczu") {
        activeFlags[dogId].zakropienieOczu = true;
        activeFlags[dogId].zakropienieOczuNote = note;
        activeFlags[dogId].zakropienieOczuUntil = until;
      } else if (flagType === "inne") {
        activeFlags[dogId].inne = true;
        activeFlags[dogId].inneNote = note;
        activeFlags[dogId].inneUntil = until;
      }
    }
  }

  // 2. Psy z bazy
  const dogsSh = ss.getSheetByName(DOGS_SHEET_NAME);
  if (!dogsSh) return [];
  const dogsValues = dogsSh.getDataRange().getValues();
  if (dogsValues.length < 2) return [];
  const dm = headerMap(dogsValues[0]);

  const result = [];
  for (let i = 1; i < dogsValues.length; i++) {
    const row = dogsValues[i];
    const dogId = safeStr(row[dm[H.ID]]);
    if (!dogId) continue;
    if (toBoolean_(row[dm[H.ARCHIVE]])) continue;

    const flags = activeFlags[dogId] || {};
    const diet = safeStr(row[dm[H.DIET]]);

    const hasFlag = !!(flags.noFood || flags.walkBlocked || flags.próbkaKału || flags.pobranieKrwi || flags.zakropienieOczu || flags.inne);
    const hasDiet = diet.length > 0 && diet.toLowerCase() !== "standardowa";

    if (!hasFlag && !hasDiet) continue;

    result.push({
      id: dogId,
      name: safeStr(row[dm[H.NAME]]),
      pavilion: safeStr(row[dm[H.PAVILION]]),
      box: safeStr(row[dm[H.KENNEL]]),
      noFood: !!flags.noFood,
      noFoodNote: flags.noFoodNote || "",
      noFoodUntil: flags.noFoodUntil || null,
      walkBlocked: !!flags.walkBlocked,
      walkBlockedNote: flags.walkBlockedNote || "",
      walkBlockedUntil: flags.walkBlockedUntil || null,
      próbkaKału: !!flags.próbkaKału,
      próbkaKałuNote: flags.próbkaKałuNote || "",
      próbkaKałuUntil: flags.próbkaKałuUntil || null,
      pobranieKrwi: !!flags.pobranieKrwi,
      pobranieKrwiNote: flags.pobranieKrwiNote || "",
      pobranieKrwiUntil: flags.pobranieKrwiUntil || null,
      zakropienieOczu: !!flags.zakropienieOczu,
      zakropienieOczuNote: flags.zakropienieOczuNote || "",
      zakropienieOczuUntil: flags.zakropienieOczuUntil || null,
      inne: !!flags.inne,
      inneNote: flags.inneNote || "",
      inneUntil: flags.inneUntil || null,
      diet: diet,
    });
  }

  return result;
}

// ===============================
// ZGŁOSZENIA MEDYCZNE
// ===============================

function submitMedicalReport_(payload) {
  const dogId = safeStr(payload?.dogId);
  const description = sanitizeText_(payload?.description, 5000);
  if (!dogId || !description) throw new Error("Brakuje dogId lub description");

  const id = Date.now() + "_" + Math.random().toString(36).substr(2, 4);

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sh = ss.getSheetByName(MEDICAL_REPORTS_SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(MEDICAL_REPORTS_SHEET_NAME);
    sh.appendRow([
      "id", "dog_id", "dog_name", "pawilon", "boks",
      "description", "reported_by", "reported_at",
      "status", "status_updated_by", "status_updated_at", "status_note"
    ]);
  }

  sh.appendRow([
    id,
    dogId,
    safeStr(payload?.dogName),
    safeStr(payload?.pawilon),
    safeStr(payload?.boks),
    description,
    safeStr(payload?.reportedBy),
    new Date().toISOString(),
    "nowe",
    "", "", ""
  ]);

  return { success: true, id: id };
}

function getMedicalReports_(payload) {
  const userEmail = safeStr(payload?.user?.email);
  const role = getUserRole_(userEmail);
  if (!["staff", "ambulatorium", "admin"].includes(role)) {
    throw new Error("Brak uprawnień do pobierania zgłoszeń medycznych");
  }

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sh = ss.getSheetByName(MEDICAL_REPORTS_SHEET_NAME);
  if (!sh || sh.getLastRow() < 2) return [];

  const values = sh.getDataRange().getValues();
  const hm = {};
  values[0].forEach(function(h, i) { hm[h] = i; });

  const statusFilter = safeStr(payload?.status);
  const statusOrder = { "nowe": 0, "w_trakcie": 1, "zamknięte": 2 };
  const rows = [];

  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var id = safeStr(row[hm["id"]]);
    if (!id) continue;
    var status = safeStr(row[hm["status"]]) || "nowe";
    if (statusFilter && status !== statusFilter) continue;
    rows.push({
      id: id,
      dogId: safeStr(row[hm["dog_id"]]),
      dogName: safeStr(row[hm["dog_name"]]),
      pawilon: safeStr(row[hm["pawilon"]]),
      boks: safeStr(row[hm["boks"]]),
      description: safeStr(row[hm["description"]]),
      reportedBy: safeStr(row[hm["reported_by"]]),
      reportedAt: safeStr(row[hm["reported_at"]]),
      status: status,
      statusUpdatedBy: safeStr(row[hm["status_updated_by"]]),
      statusUpdatedAt: safeStr(row[hm["status_updated_at"]]),
      statusNote: safeStr(row[hm["status_note"]])
    });
  }

  rows.sort(function(a, b) {
    var sa = statusOrder[a.status] !== undefined ? statusOrder[a.status] : 3;
    var sb = statusOrder[b.status] !== undefined ? statusOrder[b.status] : 3;
    if (sa !== sb) return sa - sb;
    return new Date(b.reportedAt) - new Date(a.reportedAt);
  });

  return rows;
}

function updateMedicalReportStatus_(payload) {
  const userEmail = safeStr(payload?.user?.email);
  const role = getUserRole_(userEmail);
  if (!["ambulatorium", "admin"].includes(role)) {
    throw new Error("Brak uprawnień do zmiany statusu zgłoszenia");
  }

  const id = safeStr(payload?.id);
  const status = safeStr(payload?.status);
  if (!id || !status) throw new Error("Brakuje id lub status");

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sh = ss.getSheetByName(MEDICAL_REPORTS_SHEET_NAME);
  if (!sh) throw new Error("Brak arkusza: " + MEDICAL_REPORTS_SHEET_NAME);

  const values = sh.getDataRange().getValues();
  const hm = {};
  values[0].forEach(function(h, i) { hm[h] = i; });

  var rowIdx = -1;
  for (var i = 1; i < values.length; i++) {
    if (safeStr(values[i][hm["id"]]) === id) { rowIdx = i; break; }
  }
  if (rowIdx === -1) throw new Error("Nie znaleziono zgłoszenia: " + id);

  sh.getRange(rowIdx + 1, hm["status"] + 1).setValue(status);
  sh.getRange(rowIdx + 1, hm["status_updated_by"] + 1).setValue(safeStr(payload?.updatedBy));
  sh.getRange(rowIdx + 1, hm["status_updated_at"] + 1).setValue(new Date().toISOString());
  sh.getRange(rowIdx + 1, hm["status_note"] + 1).setValue(sanitizeText_(payload?.note, 2000));

  return { success: true };
}

// ===============================
// ZADANIA AMBULATORIUM
// ===============================
function getAllDogTasks_() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sh = ss.getSheetByName(TASKS_SHEET_NAME);
  if (!sh || sh.getLastRow() < 2) return [];

  const values = sh.getDataRange().getValues();
  const map = headerMap(values[0]);
  const tasks = [];
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    if (safeStr(row[map["status"]]) !== "aktywne") continue;
    tasks.push({
      id: safeStr(row[map["id"]]),
      dogId: safeStr(row[map["dog_id"]]),
      dogName: safeStr(row[map["dog_name"]]),
      taskType: safeStr(row[map["task_type"]]),
      taskNote: safeStr(row[map["task_note"]]),
      createdAt: safeStr(row[map["created_at"]]),
      createdBy: safeStr(row[map["created_by"]]),
    });
  }
  return tasks;
}

function getDogTasks_(dogId) {
  if (!dogId) return [];
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sh = ss.getSheetByName(TASKS_SHEET_NAME);
  if (!sh || sh.getLastRow() < 2) return [];

  const values = sh.getDataRange().getValues();
  const map = headerMap(values[0]);
  const tasks = [];
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    if (safeStr(row[map["dog_id"]]) !== dogId) continue;
    if (safeStr(row[map["status"]]) !== "aktywne") continue;
    tasks.push({
      id: safeStr(row[map["id"]]),
      dogId: safeStr(row[map["dog_id"]]),
      dogName: safeStr(row[map["dog_name"]]),
      taskType: safeStr(row[map["task_type"]]),
      taskNote: safeStr(row[map["task_note"]]),
      createdAt: safeStr(row[map["created_at"]]),
      createdBy: safeStr(row[map["created_by"]]),
    });
  }
  return tasks;
}

function addDogTask_(payload) {
  const userEmail = safeStr(payload?.user?.email);
  const role = getUserRole_(userEmail);
  if (!["ambulatorium", "admin"].includes(role)) {
    throw new Error("Brak uprawnień: wymagana rola ambulatorium lub admin");
  }

  const dogId = safeStr(payload?.dogId);
  const dogName = safeStr(payload?.dogName);
  const taskType = safeStr(payload?.taskType);
  const taskNote = sanitizeText_(payload?.taskNote, 2000);
  const createdBy = safeStr(payload?.user?.displayName) || "Nieznany";

  if (!dogId || !taskType) throw new Error("Brakuje dogId lub taskType");

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sh = getOrCreateSheet(ss, TASKS_SHEET_NAME);
  if (sh.getLastRow() === 0) {
    sh.appendRow(["id", "dog_id", "dog_name", "task_type", "task_note", "status", "created_at", "created_by", "completed_at", "completed_by"]);
  }

  const id = Date.now() + "_" + Math.random().toString(36).substr(2, 4);
  sh.appendRow([id, dogId, dogName, taskType, taskNote, "aktywne", nowInPolandText(), createdBy, "", ""]);

  return { success: true, id };
}

function completeDogTask_(payload) {
  const userEmail = safeStr(payload?.user?.email);
  const role = getUserRole_(userEmail);
  if (!["staff", "ambulatorium", "admin"].includes(role)) {
    throw new Error("Brak uprawnień do wykonania zadania");
  }

  const taskId = safeStr(payload?.taskId);
  const completedBy = safeStr(payload?.user?.displayName) || "Nieznany";
  if (!taskId) throw new Error("Brakuje taskId");

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sh = ss.getSheetByName(TASKS_SHEET_NAME);
  if (!sh) throw new Error("Brak arkusza zadań");

  const values = sh.getDataRange().getValues();
  const map = headerMap(values[0]);
  for (let i = 1; i < values.length; i++) {
    if (safeStr(values[i][map["id"]]) !== taskId) continue;
    sh.getRange(i + 1, map["status"] + 1).setValue("wykonane");
    sh.getRange(i + 1, map["completed_at"] + 1).setValue(nowInPolandText());
    sh.getRange(i + 1, map["completed_by"] + 1).setValue(completedBy);
    return { success: true, taskId };
  }

  throw new Error("Nie znaleziono zadania: " + taskId);
}

// ===============================
// WIDOK TABELARYCZNY — SPACERY
// ===============================
function getWalksByDateRange_(startDate, endDate) {
  if (!startDate || !endDate) return {};
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sh = ss.getSheetByName(WALKS_SHEET_NAME);
  if (!sh || sh.getLastRow() < 2) return {};

  const values = sh.getDataRange().getValues();
  const map = headerMap(values[0]);
  const result = {};

  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    // Porównanie po kluczu dnia (string) — new Date(string) parsowałby
    // w strefie serwera i spacery koło północy lądowałyby w złym dniu
    const dateKey = walkDateKey_(row[map["Data spaceru"]]);
    if (!dateKey || dateKey < startDate || dateKey > endDate) continue;

    const dogId = safeStr(row[map["DogId"]]);
    if (!dogId) continue;
    if (!result[dogId]) result[dogId] = [];
    if (!result[dogId].includes(dateKey)) result[dogId].push(dateKey);
  }
  return result;
}

function getAllOpiekunowie_() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sh = ss.getSheetByName(OPIEKUNOWIE_SHEET_NAME);
  if (!sh || sh.getLastRow() < 2) return {};

  const values = sh.getDataRange().getValues();
  const map = headerMap(values[0]);
  const result = {};

  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const dogId = safeStr(row[map["dogId"]]);
    const name = safeStr(row[map["displayName"]]);
    if (!dogId || !name) continue;
    if (!result[dogId]) result[dogId] = [];
    result[dogId].push(name);
  }
  return result;
}
