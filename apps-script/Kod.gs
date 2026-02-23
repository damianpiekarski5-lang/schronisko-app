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
const POLAND_TIMEZONE = "Europe/Warsaw";
const SHARED_SECRET_PROPERTY_NAME = "SHARED_SECRET";
const BEHAVIOR_PANEL_SPREADSHEET_PROPERTY = "BEHAVIOR_PANEL_SPREADSHEET_ID";

const BEHAVIOR_SHEETS = {
  BehaviorCases: ["id", "dogId", "title", "stage", "priority", "tags", "assignedTo", "createdAt", "updatedAt", "startedAt", "closedAt"],
  Diagnoses: ["id", "caseId", "version", "createdAt", "createdBy", "mainProblem", "coProblems", "baselineEmotion", "triggers", "functionHypothesis", "riskNotes", "notes"],
  Plans: ["id", "caseId", "version", "status", "createdAt", "activatedAt", "archivedAt", "summary"],
  PlanAreas: ["id", "planId", "name", "order", "description", "tags", "isActive"],
  ExerciseBank: ["id", "name", "areaHint", "goalCriteria", "setup", "steps", "progression", "commonMistakes", "safety", "defaultMetrics", "createdAt", "updatedAt", "isArchived"],
  PlanExercises: ["id", "planAreaId", "exerciseBankId", "customName", "status", "difficulty", "goalCriteria", "notes", "createdAt", "updatedAt"],
  Goals: ["id", "caseId", "planAreaId", "planExerciseId", "title", "metricType", "metricLabel", "metricTarget", "status", "dueDate", "createdAt", "updatedAt"],
  Sessions: ["id", "caseId", "dogId", "status", "plannedFor", "startedAt", "endedAt", "title", "location", "handler", "overallTrend", "arousalRating", "notes"],
  SessionEntries: ["id", "sessionId", "planAreaId", "planExerciseId", "trend", "difficultyUsed", "metrics", "whatWorked", "whatFailed", "nextStep", "createdAt"],
  ReportSnapshots: ["id", "caseId", "createdAt", "title", "contentMarkdown", "pdfDriveFileId"],
};

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
    if (String(action).indexOf(".") !== -1 || action === "behavior.init") {
      return json({ ok: false, error: "Moduł panelu behawiorysty jest wyłączony." });
    }

    if (action === "getDogs") {
      const includeArchived = String(e?.parameter?.includeArchived || "false") === "true";
      return json({ ok: true, data: getDogs(includeArchived) });
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

    if (String(action).indexOf(".") !== -1 || action === "behavior.init") {
      return json({ ok: false, error: "Moduł panelu behawiorysty jest wyłączony." });
    }

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

    return json({ ok: false, error: "Unknown action" });
  } catch (error) {
    return json({ ok: false, error: String(error) });
  } finally {
    try {
      lock.releaseLock();
    } catch (_) {}
  }
}

function handleBehaviorGetAction_(action, params) {
  initBehaviorPanelSheets_();

  if (action === "behavior.init") return { ok: true, data: { success: true } };
  if (action === "cases.list") return { ok: true, data: behaviorCasesList_(params) };
  if (action === "cases.get") return { ok: true, data: getById_("BehaviorCases", params.id) };
  if (action === "diagnosis.getLatest") return { ok: true, data: diagnosisGetLatest_(params.caseId) };
  if (action === "plan.getActive") return { ok: true, data: planGetActive_(params.caseId) };
  if (action === "areas.list") return { ok: true, data: queryByName_("PlanAreas", { planId: safeStr(params.planId) }, 500, 0) };
  if (action === "exbank.list") return { ok: true, data: exbankList_(params) };
  if (action === "pex.listByArea") return { ok: true, data: queryByName_("PlanExercises", { planAreaId: safeStr(params.planAreaId) }, 500, 0) };
  if (action === "goals.list") return { ok: true, data: queryByName_("Goals", { caseId: safeStr(params.caseId) }, 500, 0) };
  if (action === "sessions.list") return { ok: true, data: sessionsList_(params) };
  if (action === "sessions.listToday") return { ok: true, data: sessionsListToday_(params) };
  if (action === "sEntries.list") return { ok: true, data: queryByName_("SessionEntries", { sessionId: safeStr(params.sessionId) }, 500, 0) };
  if (action === "reports.list") return { ok: true, data: queryByName_("ReportSnapshots", { caseId: safeStr(params.caseId) }, 100, 0) };
  if (action === "reports.get") return { ok: true, data: getById_("ReportSnapshots", params.id) };

  return { ok: false, error: "Unknown action" };
}

function handleBehaviorPostAction_(action, payload) {
  initBehaviorPanelSheets_();
  const data = payload?.data || payload;

  if (action === "behavior.init") return { ok: true, data: { success: true } };
  if (action === "cases.create") return { ok: true, data: casesCreate_(data) };
  if (action === "cases.update") return { ok: true, data: patchById_("BehaviorCases", data.id, data.patch || {}) };
  if (action === "cases.setStage") return { ok: true, data: patchById_("BehaviorCases", data.id, { stage: data.stage, updatedAt: nowIso_() }) };
  if (action === "diagnosis.addVersion") return { ok: true, data: diagnosisAddVersion_(data) };
  if (action === "plan.createDraft") return { ok: true, data: planCreateDraft_(data) };
  if (action === "plan.activate") return { ok: true, data: planActivate_(data.planId) };
  if (action === "plan.archive") return { ok: true, data: patchById_("Plans", data.planId, { status: "ARCHIVED", archivedAt: nowIso_() }) };
  if (action === "areas.create") return { ok: true, data: areasCreate_(data) };
  if (action === "areas.update") return { ok: true, data: patchById_("PlanAreas", data.id, data.patch || {}) };
  if (action === "areas.reorder") return { ok: true, data: areasReorder_(data.planId, data.orderedAreaIds || []) };
  if (action === "areas.toggleActive") return { ok: true, data: patchById_("PlanAreas", data.id, { isActive: data.isActive ? "TRUE" : "FALSE" }) };
  if (action === "exbank.create") return { ok: true, data: exbankCreate_(data) };
  if (action === "exbank.update") return { ok: true, data: exbankUpdate_(data.id, data.patch || {}) };
  if (action === "exbank.archive") return { ok: true, data: patchById_("ExerciseBank", data.id, { isArchived: data.isArchived ? "TRUE" : "FALSE", updatedAt: nowIso_() }) };
  if (action === "pex.addFromBank") return { ok: true, data: pexAddFromBank_(data) };
  if (action === "pex.createCustom") return { ok: true, data: pexCreateCustom_(data) };
  if (action === "pex.update") return { ok: true, data: patchById_("PlanExercises", data.id, { ...(data.patch || {}), updatedAt: nowIso_() }) };
  if (action === "pex.setStatus") return { ok: true, data: patchById_("PlanExercises", data.id, { status: data.status, updatedAt: nowIso_() }) };
  if (action === "pex.setDifficulty") return { ok: true, data: patchById_("PlanExercises", data.id, { difficulty: data.difficulty, updatedAt: nowIso_() }) };
  if (action === "goals.create") return { ok: true, data: goalsCreate_(data) };
  if (action === "goals.update") return { ok: true, data: patchById_("Goals", data.id, { ...(data.patch || {}), updatedAt: nowIso_() }) };
  if (action === "goals.setStatus") return { ok: true, data: patchById_("Goals", data.id, { status: data.status, updatedAt: nowIso_() }) };
  if (action === "sessions.createPlanned") return { ok: true, data: sessionsCreatePlanned_(data) };
  if (action === "sessions.markDone") return { ok: true, data: patchById_("Sessions", data.sessionId, { status: "DONE", startedAt: data.startedAt || nowIso_(), endedAt: data.endedAt || nowIso_(), overallTrend: data.overallTrend || "SAME", arousalRating: data.arousalRating || "", notes: data.notes || "" }) };
  if (action === "sessions.cancel") return { ok: true, data: patchById_("Sessions", data.sessionId, { status: "CANCELED", notes: data.reason || "" }) };
  if (action === "sEntries.add") return { ok: true, data: sEntriesAdd_(data) };
  if (action === "sEntries.update") return { ok: true, data: patchById_("SessionEntries", data.id, data.patch || {}) };
  if (action === "sEntries.delete") return { ok: true, data: patchById_("SessionEntries", data.id, { trend: "ARCHIVED" }) };
  if (action === "reports.generateMarkdown") return { ok: true, data: generateReportMarkdown_(data) };

  return { ok: false, error: "Unknown action" };
}

function getBehaviorSpreadsheet_() {
  const customId = PropertiesService.getScriptProperties().getProperty(BEHAVIOR_PANEL_SPREADSHEET_PROPERTY);
  return customId ? SpreadsheetApp.openById(customId) : SpreadsheetApp.openById(SPREADSHEET_ID);
}

function initBehaviorPanelSheets_() {
  const ss = getBehaviorSpreadsheet_();
  Object.keys(BEHAVIOR_SHEETS).forEach((name) => {
    const sh = getOrCreateSheet(ss, name);
    ensureHeaders(sh, BEHAVIOR_SHEETS[name]);
    sh.setFrozenRows(1);
  });
}

function nowIso_() { return new Date().toISOString(); }
function uuid_() { return Utilities.getUuid(); }

function getSheet_(name) {
  const sh = getBehaviorSpreadsheet_().getSheetByName(name);
  if (!sh) throw new Error("Brak zakładki: " + name);
  return sh;
}

function sheetToObjects_(sheet) {
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0].map((h) => safeStr(h));
  return values.slice(1).map((row) => {
    const obj = {};
    headers.forEach((header, idx) => { obj[header] = row[idx] === undefined ? "" : row[idx]; });
    return obj;
  });
}

function findRowById_(sheet, id) {
  const values = sheet.getDataRange().getValues();
  for (let r = 1; r < values.length; r++) if (safeStr(values[r][0]) === safeStr(id)) return r + 1;
  return -1;
}

function upsertRow_(sheet, obj) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map((h) => safeStr(h));
  const row = headers.map((key) => (obj[key] === undefined ? "" : obj[key]));
  const rowNumber = safeStr(obj.id) ? findRowById_(sheet, obj.id) : -1;
  if (rowNumber > 0) sheet.getRange(rowNumber, 1, 1, row.length).setValues([row]);
  else sheet.appendRow(row);
  return obj;
}

function queryByName_(sheetName, filters, limit, offset) {
  const rows = sheetToObjects_(getSheet_(sheetName)).filter((row) => {
    return Object.keys(filters || {}).every((key) => {
      const val = safeStr(filters[key]);
      return !val || safeStr(row[key]) === val;
    });
  });
  const from = Number(offset) || 0;
  const to = from + (Number(limit) || rows.length);
  return { items: rows.slice(from, to), total: rows.length, offset: from, limit: Number(limit) || rows.length };
}

function getById_(sheetName, id) {
  return sheetToObjects_(getSheet_(sheetName)).find((row) => safeStr(row.id) === safeStr(id)) || null;
}

function patchById_(sheetName, id, patch) {
  const existing = getById_(sheetName, id);
  if (!existing) throw new Error("Nie znaleziono rekordu: " + id);
  const merged = { ...existing, ...(patch || {}) };
  upsertRow_(getSheet_(sheetName), merged);
  return merged;
}

function casesCreate_(data) {
  if (!safeStr(data?.dogId)) throw new Error("Brak dogId");
  if (!safeStr(data?.title)) throw new Error("Brak title");
  const now = nowIso_();
  const row = { id: uuid_(), dogId: safeStr(data.dogId), title: safeStr(data.title), stage: "NEW", priority: safeStr(data.priority) || "MEDIUM", tags: safeStr(data.tags), assignedTo: safeStr(data.assignedTo), createdAt: now, updatedAt: now, startedAt: "", closedAt: "" };
  upsertRow_(getSheet_("BehaviorCases"), row);
  return row;
}

function behaviorCasesList_(params) {
  const all = sheetToObjects_(getSheet_("BehaviorCases"));
  const search = safeStr(params.search).toLowerCase();
  const filtered = all.filter((c) => {
    if (safeStr(params.stage) && safeStr(c.stage) !== safeStr(params.stage)) return false;
    if (safeStr(params.dogId) && safeStr(c.dogId) !== safeStr(params.dogId)) return false;
    if (search) {
      const hay = [c.title, c.tags, c.dogId].join(" ").toLowerCase();
      if (hay.indexOf(search) === -1) return false;
    }
    return true;
  }).sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
  const from = Number(params.offset) || 0;
  const limit = Number(params.limit) || 20;
  return { items: filtered.slice(from, from + limit), total: filtered.length, offset: from, limit };
}

function diagnosisGetLatest_(caseId) {
  const list = queryByName_("Diagnoses", { caseId: safeStr(caseId) }, 999, 0).items;
  return list.sort((a, b) => Number(b.version || 0) - Number(a.version || 0))[0] || null;
}

function diagnosisAddVersion_(data) {
  if (!safeStr(data.caseId)) throw new Error("Brak caseId");
  const latest = diagnosisGetLatest_(data.caseId);
  const row = { id: uuid_(), caseId: safeStr(data.caseId), version: Number(latest?.version || 0) + 1, createdAt: nowIso_(), createdBy: safeStr(data.data?.createdBy || data.createdBy), mainProblem: safeStr(data.data?.mainProblem || data.mainProblem), coProblems: safeStr(data.data?.coProblems || data.coProblems), baselineEmotion: safeStr(data.data?.baselineEmotion || data.baselineEmotion), triggers: safeStr(data.data?.triggers || data.triggers), functionHypothesis: safeStr(data.data?.functionHypothesis || data.functionHypothesis), riskNotes: safeStr(data.data?.riskNotes || data.riskNotes), notes: safeStr(data.data?.notes || data.notes) };
  upsertRow_(getSheet_("Diagnoses"), row);
  return row;
}

function planGetActive_(caseId) {
  return queryByName_("Plans", { caseId: safeStr(caseId) }, 100, 0).items.find((p) => safeStr(p.status) === "ACTIVE") || null;
}
function planCreateDraft_(data) {
  const plans = queryByName_("Plans", { caseId: safeStr(data.caseId) }, 999, 0).items;
  const row = { id: uuid_(), caseId: safeStr(data.caseId), version: plans.length + 1, status: "DRAFT", createdAt: nowIso_(), activatedAt: "", archivedAt: "", summary: safeStr(data.summary) };
  upsertRow_(getSheet_("Plans"), row);
  return row;
}
function planActivate_(planId) {
  const target = getById_("Plans", planId);
  if (!target) throw new Error("Brak planu");
  const plans = queryByName_("Plans", { caseId: target.caseId }, 999, 0).items;
  plans.forEach((plan) => {
    if (safeStr(plan.id) === safeStr(planId)) upsertRow_(getSheet_("Plans"), { ...plan, status: "ACTIVE", activatedAt: nowIso_() });
    else if (safeStr(plan.status) === "ACTIVE") upsertRow_(getSheet_("Plans"), { ...plan, status: "ARCHIVED", archivedAt: nowIso_() });
  });
  return getById_("Plans", planId);
}
function areasCreate_(data) {
  const row = { id: uuid_(), planId: safeStr(data.planId), name: safeStr(data.name), order: Number(data.order || 0), description: safeStr(data.description), tags: safeStr(data.tags), isActive: "TRUE" };
  upsertRow_(getSheet_("PlanAreas"), row);
  return row;
}
function areasReorder_(planId, orderedIds) {
  const sheet = getSheet_("PlanAreas");
  orderedIds.forEach((id, idx) => { patchById_("PlanAreas", id, { order: idx + 1 }); });
  return queryByName_("PlanAreas", { planId: safeStr(planId) }, 500, 0);
}
function exbankList_(params) {
  const all = sheetToObjects_(getSheet_("ExerciseBank"));
  const search = safeStr(params.search).toLowerCase();
  const filtered = all.filter((row) => {
    if (safeStr(params.areaHint) && safeStr(row.areaHint) !== safeStr(params.areaHint)) return false;
    if (search && [row.name, row.areaHint, row.goalCriteria].join(" ").toLowerCase().indexOf(search) === -1) return false;
    return safeStr(row.isArchived) !== "TRUE";
  });
  const from = Number(params.offset) || 0;
  const limit = Number(params.limit) || 20;
  return { items: filtered.slice(from, from + limit), total: filtered.length, offset: from, limit };
}
function exbankCreate_(d) {
  const now = nowIso_();
  const row = { id: uuid_(), name: safeStr(d.name), areaHint: safeStr(d.areaHint), goalCriteria: safeStr(d.goalCriteria), setup: safeStr(d.setup), steps: JSON.stringify(d.steps || []), progression: JSON.stringify(d.progression || []), commonMistakes: JSON.stringify(d.commonMistakes || []), safety: safeStr(d.safety), defaultMetrics: JSON.stringify(d.defaultMetrics || []), createdAt: now, updatedAt: now, isArchived: "FALSE" };
  upsertRow_(getSheet_("ExerciseBank"), row);
  return row;
}
function exbankUpdate_(id, patch) {
  const transformed = { ...patch, updatedAt: nowIso_() };
  ["steps", "progression", "commonMistakes", "defaultMetrics"].forEach((k) => {
    if (Array.isArray(transformed[k])) transformed[k] = JSON.stringify(transformed[k]);
  });
  return patchById_("ExerciseBank", id, transformed);
}
function pexAddFromBank_(d) {
  const bank = getById_("ExerciseBank", d.exerciseBankId);
  if (!bank) throw new Error("Brak ćwiczenia w banku");
  const now = nowIso_();
  const row = { id: uuid_(), planAreaId: safeStr(d.planAreaId), exerciseBankId: safeStr(d.exerciseBankId), customName: safeStr(bank.name), status: "INTRODUCED", difficulty: 1, goalCriteria: safeStr(d.goalCriteriaOverride || bank.goalCriteria), notes: safeStr(d.notes), createdAt: now, updatedAt: now };
  upsertRow_(getSheet_("PlanExercises"), row);
  return row;
}
function pexCreateCustom_(d) {
  const now = nowIso_();
  const row = { id: uuid_(), planAreaId: safeStr(d.planAreaId), exerciseBankId: "", customName: safeStr(d.customName), status: "INTRODUCED", difficulty: 1, goalCriteria: safeStr(d.goalCriteria), notes: safeStr(d.notes), createdAt: now, updatedAt: now };
  upsertRow_(getSheet_("PlanExercises"), row);
  return row;
}
function goalsCreate_(d) {
  const now = nowIso_();
  const row = { id: uuid_(), caseId: safeStr(d.caseId), planAreaId: safeStr(d.planAreaId), planExerciseId: safeStr(d.planExerciseId), title: safeStr(d.title), metricType: safeStr(d.metricType), metricLabel: safeStr(d.metricLabel), metricTarget: safeStr(d.metricTarget), status: "ACTIVE", dueDate: safeStr(d.dueDate), createdAt: now, updatedAt: now };
  upsertRow_(getSheet_("Goals"), row);
  return row;
}
function sessionsList_(params) {
  const all = queryByName_("Sessions", { caseId: safeStr(params.caseId) }, 9999, 0).items.filter((s) => {
    if (safeStr(params.status) && safeStr(s.status) !== safeStr(params.status)) return false;
    if (safeStr(params.from) && safeStr(s.plannedFor) < safeStr(params.from)) return false;
    if (safeStr(params.to) && safeStr(s.plannedFor) > safeStr(params.to)) return false;
    return true;
  }).sort((a, b) => String(b.plannedFor).localeCompare(String(a.plannedFor)));
  const from = Number(params.offset) || 0;
  const limit = Number(params.limit) || 20;
  return { items: all.slice(from, from + limit), total: all.length, offset: from, limit };
}
function sessionsListToday_(params) {
  const today = Utilities.formatDate(new Date(), POLAND_TIMEZONE, "yyyy-MM-dd");
  const all = sheetToObjects_(getSheet_("Sessions")).filter((s) => {
    if (safeStr(s.status) !== "PLANNED") return false;
    if (safeStr(params.assignedTo) && safeStr(s.handler) !== safeStr(params.assignedTo)) return false;
    return safeStr(s.plannedFor).slice(0, 10) === today;
  });
  return { items: all, total: all.length };
}
function sessionsCreatePlanned_(d) {
  if (!safeStr(d.caseId) || !safeStr(d.dogId) || !safeStr(d.plannedFor)) throw new Error("Brak caseId/dogId/plannedFor");
  const row = { id: uuid_(), caseId: safeStr(d.caseId), dogId: safeStr(d.dogId), status: "PLANNED", plannedFor: safeStr(d.plannedFor), startedAt: "", endedAt: "", title: safeStr(d.title), location: safeStr(d.location), handler: safeStr(d.handler), overallTrend: "", arousalRating: "", notes: "" };
  upsertRow_(getSheet_("Sessions"), row);
  return row;
}
function sEntriesAdd_(d) {
  const row = { id: uuid_(), sessionId: safeStr(d.sessionId), planAreaId: safeStr(d.planAreaId), planExerciseId: safeStr(d.planExerciseId), trend: safeStr(d.trend), difficultyUsed: d.difficultyUsed || "", metrics: JSON.stringify(d.metrics || []), whatWorked: safeStr(d.whatWorked), whatFailed: safeStr(d.whatFailed), nextStep: safeStr(d.nextStep), createdAt: nowIso_() };
  upsertRow_(getSheet_("SessionEntries"), row);
  return row;
}
function generateReportMarkdown_(d) {
  const caseObj = getById_("BehaviorCases", d.caseId);
  if (!caseObj) throw new Error("Brak sprawy");
  const dogName = getDogNameById_(caseObj.dogId);
  const diagnosis = diagnosisGetLatest_(caseObj.id);
  const plan = planGetActive_(caseObj.id);
  const areas = plan ? queryByName_("PlanAreas", { planId: plan.id }, 500, 0).items.sort((a, b) => Number(a.order) - Number(b.order)) : [];
  const pexByArea = {};
  areas.forEach((area) => { pexByArea[area.id] = queryByName_("PlanExercises", { planAreaId: area.id }, 500, 0).items; });
  const sessions = sessionsList_({ caseId: caseObj.id, from: d.includeSessionsFrom, to: d.includeSessionsTo, limit: 10, offset: 0 }).items;
  const goals = queryByName_("Goals", { caseId: caseObj.id }, 200, 0).items;
  let md = `# Raport terapii — ${dogName} (${caseObj.dogId}) — ${nowIso_().slice(0, 10)}\n\n`;
  md += `## 1. Sprawa\n- Etap: ${caseObj.stage}\n- Priorytet: ${caseObj.priority}\n- Tagi: ${caseObj.tags || "-"}\n\n`;
  md += `## 2. Diagnoza\n- Problem główny: ${diagnosis?.mainProblem || "-"}\n- Problemy współwystępujące: ${diagnosis?.coProblems || "-"}\n- Triggery: ${diagnosis?.triggers || "-"}\n- Hipoteza funkcji: ${diagnosis?.functionHypothesis || "-"}\n- Ryzyka: ${diagnosis?.riskNotes || "-"}\n\n`;
  md += `## 3. Plan aktywny\n`;
  areas.forEach((area) => {
    md += `### ${area.name}\n`;
    (pexByArea[area.id] || []).forEach((ex) => { md += `- ${ex.customName || ex.exerciseBankId}: ${ex.status}, trudność ${ex.difficulty}, cel: ${ex.goalCriteria || "-"}\n`; });
  });
  md += `\n## 4. Sesje\n`;
  sessions.forEach((s) => {
    md += `- ${s.plannedFor} [${s.status}] trend:${s.overallTrend || "-"} pobudzenie:${s.arousalRating || "-"} notatka:${s.notes || "-"}\n`;
    const entries = queryByName_("SessionEntries", { sessionId: s.id }, 50, 0).items;
    entries.forEach((entry) => { md += `  - nextStep: ${entry.nextStep || "-"}\n`; });
  });
  md += `\n## 5. Cele\n`;
  goals.forEach((g) => { md += `- [${g.status}] ${g.title} (${g.metricLabel}: ${g.metricTarget})\n`; });

  const snapshot = { id: uuid_(), caseId: caseObj.id, createdAt: nowIso_(), title: `Raport terapii — ${dogName}`, contentMarkdown: md, pdfDriveFileId: "" };
  upsertRow_(getSheet_("ReportSnapshots"), snapshot);
  return snapshot;
}

function getDogNameById_(dogId) {
  const dogs = getDogs(true);
  const found = dogs.find((d) => safeStr(d.id) === safeStr(dogId));
  return found?.name || "Nieznany pies";
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
      archived,
    });
  }

  return out;
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
    "Kontakt",
    "Smycz",
    "Psy",
    "Ludzie",
    "Ruch",
    "Stan emocjonalny",
    "Uwagi",
  ]);

  const responses = payload?.responses || {};

  walksSheet.appendRow([
    now,
    dogId,
    safeStr(dogRow[map[H.NAME]]),
    safeStr(dogRow[map[H.PAVILION]]),
    safeStr(dogRow[map[H.KENNEL]]),
    safeStr(payload?.user?.displayName) || safeStr(payload?.user?.email) || "Wolontariusz",
    safeStr(responses.contact || payload?.contact),
    safeStr(responses.walking || payload?.walking),
    safeStr(responses.dogs || payload?.dogs),
    safeStr(responses.people || payload?.people),
    safeStr(responses.traffic || payload?.traffic),
    safeStr(responses.emotionalState || payload?.emotionalState),
    safeStr(responses.notes || payload?.notes),
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
    "reason",
    "incident3P",
    "tagsEmotions",
    "tagsRelations",
    "tagsWelfare",
    "risk",
    "priority",
  ]);

  reportsSheet.appendRow([
    nowInPolandText(),
    safeStr(payload?.dogName),
    safeStr(payload?.dogId),
    safeStr(payload?.user?.displayName) || safeStr(payload?.user?.email),
    safeStr(payload?.reason),
    safeStr(payload?.incident3P),
    safeStr(payload?.tagsEmotions),
    safeStr(payload?.tagsRelations),
    safeStr(payload?.tagsWelfare),
    safeStr(payload?.risk),
    safeStr(payload?.priority),
  ]);
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
    if (sheet.getName() === WALKS_SHEET_NAME) sheet.setFrozenRows(1);
    return;
  }

  const current = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  const matches = headers.every((header, idx) => String(current[idx] || "") === header);

  if (!matches) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    if (sheet.getName() === WALKS_SHEET_NAME) sheet.setFrozenRows(1);
  }
}
