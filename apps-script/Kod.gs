/**
 * Apps Script dla schroniska
 * - API (doPost/doGet) dla akcji: recordWalk, reportBehavior
 * - Archiwum onEdit z checkboxem dwukierunkowo (Główna <-> Archiwum)
 */

const SHEET_MAIN = "Arkusz1"; // <- ustaw nazwę głównej zakładki
const SHEET_WALKS = "Spacery";
const SHEET_REPORTS = "Zgłoszenia";
const SHEET_ARCHIVE = "Archiwum";
const MAIN_ARCHIVE_HEADER = "Archiwum";

function doOptions() {
  return createJsonOutput({ ok: true, data: { success: true } });
}

function doGet() {
  return createJsonOutput({ ok: true, data: { success: true } });
}

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData?.contents || "{}");
    const action = String(payload.action || "");

    if (action === "recordWalk") {
      appendWalk(payload);
      return createJsonOutput({ ok: true, data: { success: true } });
    }

    if (action === "reportBehavior") {
      appendBehaviorReport(payload);
      return createJsonOutput({ ok: true, data: { success: true } });
    }

    return createJsonOutput({ ok: false, error: "Unknown action" });
  } catch (error) {
    return createJsonOutput({ ok: false, error: String(error) });
  }
}

function createJsonOutput(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}

function appendWalk(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = getOrCreateSheet(ss, SHEET_WALKS);

  ensureHeaders(sheet, [
    "timestamp",
    "dogName",
    "dogId",
    "volunteerName",
    "walking",
    "dogs",
    "people",
    "traffic",
    "emotionalState",
    "notes",
  ]);

  sheet.appendRow([
    new Date(),
    payload.dogName || "",
    payload.dogId || "",
    payload.volunteerName || "",
    payload.walking || "",
    payload.dogs || "",
    payload.people || "",
    payload.traffic || "",
    payload.emotionalState || "",
    payload.notes || "",
  ]);
}

function appendBehaviorReport(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = getOrCreateSheet(ss, SHEET_REPORTS);

  ensureHeaders(sheet, [
    "timestamp",
    "dogName",
    "dogId",
    "volunteerName",
    "reason",
    "incident3P",
    "tagsEmotions",
    "tagsRelations",
    "tagsWelfare",
    "risk",
    "priority",
  ]);

  sheet.appendRow([
    new Date(),
    payload.dogName || "",
    payload.dogId || "",
    payload.volunteerName || "",
    payload.reason || "",
    payload.incident3P || "",
    payload.tagsEmotions || "",
    payload.tagsRelations || "",
    payload.tagsWelfare || "",
    payload.risk || "",
    payload.priority || "",
  ]);
}

function getOrCreateSheet(ss, sheetName) {
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) sheet = ss.insertSheet(sheetName);
  return sheet;
}

function ensureHeaders(sheet, headers) {
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    return;
  }
  const existing = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  const same = headers.every((h, i) => String(existing[i] || "") === h);
  if (!same) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
}

function onEdit(e) {
  if (!e || !e.range) {
    return;
  }
  handleArchiveCheckboxEdit(e.range, e.value);
}

function testOnEditArchiveFromCurrentCell() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getActiveSheet();
  const range = sheet.getActiveCell();
  const value = String(range.getValue());
  handleArchiveCheckboxEdit(range, value);
}

function handleArchiveCheckboxEdit(range, rawValue) {
  const sheet = range.getSheet();
  const row = range.getRow();
  if (row <= 1) return;

  const sheetName = sheet.getName();
  if (sheetName !== SHEET_MAIN && sheetName !== SHEET_ARCHIVE) return;

  const headerRow = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const archiveCol = headerRow.findIndex((h) => String(h).trim() === MAIN_ARCHIVE_HEADER) + 1;
  if (!archiveCol || range.getColumn() !== archiveCol) return;

  const checked = String(rawValue || range.getValue()).toLowerCase() === "true";
  if (sheetName === SHEET_MAIN && checked) {
    moveRowBetweenSheets_(sheet, row, SHEET_ARCHIVE, archiveCol, true);
  } else if (sheetName === SHEET_ARCHIVE && !checked) {
    moveRowBetweenSheets_(sheet, row, SHEET_MAIN, archiveCol, false);
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
