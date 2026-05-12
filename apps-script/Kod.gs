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
const VALID_ROLES = ["volunteer", "staff", "ambulatorium", "admin"];
const POLAND_TIMEZONE = "Europe/Warsaw";
const SHARED_SECRET_PROPERTY_NAME = "SHARED_SECRET";
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

    if (action === "getMedicalFlags") {
      return json({ ok: true, data: getMedicalFlags_(safeStr(e?.parameter?.dogId)) });
    }

    if (action === "getWeightHistory") {
      return json({ ok: true, data: getWeightHistory_(safeStr(e?.parameter?.dogId)) });
    }

    if (action === "getSectorDogs") {
      return json({ ok: true, data: getSectorDogs_() });
    }

    return json({ ok: false, error: "Unknown action" });
  } catch (error) {
    return json({ ok: false, error: String(error) });
  }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(30000);

  try {
    const payload = JSON.parse(e?.postData?.contents || "{}");
    validateSharedSecret(payload);
    const action = safeStr(payload?.action);

    if (action === "recordWalk") {
      recordWalk(payload);
      return json({ ok: true, data: { success: true } });
    }

    if (action === "reportBehavior") {
      reportBehavior(payload);
      return json({ ok: true, data: { success: true } });
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
      return json({ ok: true, data: adminGetBehaviorReports() });
    }

    if (action === "adminUpdateBehaviorReport") {
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
      setUserRole_(safeStr(payload?.email), safeStr(payload?.role));
      return json({ ok: true, data: { success: true } });
    }

    if (action === "listUsersForAdmin") {
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

  const lastVolunteerMap = buildLastVolunteerMap_(ss);

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
      lastVolunteer: lastVolunteerMap[dogId] || "",
      weight: safeStr(row[map[H.WEIGHT]]),
      archived,
    });
  }

  return out;
}

function buildLastVolunteerMap_(ss) {
  const sh = ss.getSheetByName(WALKS_SHEET_NAME);
  if (!sh) return {};
  const values = sh.getDataRange().getValues();
  if (values.length < 2) return {};
  const wMap = headerMap(values[0]);
  const result = {};
  for (let i = 1; i < values.length; i++) {
    const dogId = safeStr(values[i][wMap["DogId"]]);
    const vol = safeStr(values[i][wMap["Wolontariusz"]]);
    if (dogId && vol) result[dogId] = vol;
  }
  return result;
}

function setArchive(payload) {
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

  sh.getRange(rowIndex + 1, map[H.ARCHIVE] + 1).setValue(archived);

  return { success: true, dogId, archived };
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
  const now = nowInPolandText();

  const walksSheet = getOrCreateSheet(ss, WALKS_SHEET_NAME);
  ensureHeaders(walksSheet, [
    "Data spaceru",
    "DogId",
    "Imię psa",
    "Pawilon",
    "Boks",
    "Wolontariusz",
    "Uwagi",
  ]);

  walksSheet.appendRow([
    now,
    dogId,
    safeStr(dogRow[map[H.NAME]]),
    safeStr(dogRow[map[H.PAVILION]]),
    safeStr(dogRow[map[H.KENNEL]]),
    safeStr(payload?.user?.displayName) || safeStr(payload?.user?.email) || "Wolontariusz",
    safeStr(payload?.notes),
  ]);

  dogsSheet.getRange(rowIndex + 1, map[H.LAST_WALK] + 1).setValue(now);
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
    safeStr(payload?.user?.displayName) || safeStr(payload?.user?.email),
    safeStr(payload?.opis),
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
      safeStr(payload?.user?.email) || safeStr(payload?.user?.displayName)
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
      email: safeStr(row[3]),
      addedAt: safeStr(row[4]),
    }));
}

function toggleOpiekun(payload) {
  const uid = safeStr(payload?.user?.uid);
  const dogId = safeStr(payload?.dogId);
  const displayName = safeStr(payload?.user?.displayName) || safeStr(payload?.user?.email);
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
  if (!expected) return;

  if (safeStr(payload?.__secret) !== safeStr(expected)) {
    throw new Error("Unauthorized");
  }
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
    kategoria, safeStr(payload?.wartosc), safeStr(payload?.uwagi),
    safeStr(payload?.user?.displayName) || safeStr(payload?.user?.email),
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
  const note = safeStr(payload?.note) || "";
  const createdBy = safeStr(payload?.createdBy) || userEmail;
  const createdAt = nowInPolandText();

  sh.appendRow([id, dogId, flagType, true, note, validFrom, validUntil, createdBy, createdAt]);
}

function deactivateMedicalFlag_(payload) {
  const userEmail = safeStr(payload?.user?.email);
  const role = getUserRole_(userEmail);
  if (role !== "ambulatorium" && role !== "admin") {
    throw new Error("Brak uprawnien: wymagana rola ambulatorium lub admin");
  }

  const dogId = safeStr(payload?.dogId);
  const flagType = safeStr(payload?.flagType);
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
  if (!["ambulatorium", "admin"].includes(role)) {
    throw new Error("Brak uprawnień do zmiany diety psa");
  }

  const dogId = safeStr(payload?.dogId);
  if (!dogId) throw new Error("Brakuje dogId");

  const diet = safeStr(payload?.diet);

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
// HISTORIA WAGI
// ===============================
function addWeightEntry_(payload) {
  const dogId = safeStr(payload?.dogId);
  const weight = safeStr(payload?.weight);
  const recordedByEmail = safeStr(payload?.user?.email);
  const recordedByName = safeStr(payload?.user?.displayName || payload?.user?.email);
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
    histSh.appendRow(["dog_id", "weight", "date", "recorded_by_email", "recorded_by_name"]);
  }
  histSh.appendRow([dogId, weight, nowInPolandText(), recordedByEmail, recordedByName]);

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
      recordedByEmail: safeStr(row[map["recorded_by_email"]]),
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
      if (flagType === "no_food") {
        activeFlags[dogId].noFood = true;
        activeFlags[dogId].noFoodNote = safeStr(row[fm["note"]]);
        activeFlags[dogId].noFoodUntil = validUntil ? validUntil.toISOString() : null;
      } else if (flagType === "walk_blocked") {
        activeFlags[dogId].walkBlocked = true;
        activeFlags[dogId].walkBlockedNote = safeStr(row[fm["note"]]);
        activeFlags[dogId].walkBlockedUntil = validUntil ? validUntil.toISOString() : null;
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

    const hasFlag = !!(flags.noFood || flags.walkBlocked);
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
      diet: diet,
    });
  }

  return result;
}
