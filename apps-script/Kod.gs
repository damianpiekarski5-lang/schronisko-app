// ===============================
// SCHRONISKO API v3 – Web App + Arkusz (pełny)
// Jedna baza psów + spacery + zgłoszenia + archiwizacja
// ===============================

const SPREADSHEET_ID = "1NTi42HMtaJB-xK6ZQvupHwCx2hNTR0cjFm6PtGM-mgQ";

const DOGS_SHEET_NAME = "Baza psów";
const WALKS_SHEET_NAME = "Spacery";
const REPORTS_SHEET_NAME = "Zgłoszenia";
const BEHAVIOR_WORK_PLANS_SHEET_NAME = "Plany pracy behawiorysty";
const BEHAVIOR_SESSIONS_SHEET_NAME = "Sesje behawiorysty";
const DOGS_THERAPY_SHEET_NAME = "DogsTherapy";
const THERAPY_SCHEDULE_SHEET_NAME = "Schedule";
const THERAPY_SESSION_LOG_SHEET_NAME = "SessionLog";
const ARCHIVE_SHEET_NAME = "Archiwum";
const ARCHIVE_HEADER_NAME = "Archiwum";
const FAVORITES_SHEET_NAME = "Favorites";
const POLAND_TIMEZONE = "Europe/Warsaw";
const SHARED_SECRET_PROPERTY_NAME = "SHARED_SECRET";
const BEHAVIOR_PANEL_SPREADSHEET_PROPERTY = "BEHAVIOR_PANEL_SPREADSHEET_ID";
const THERAPY_STATUSES = ["THERAPY", "WAIT", "HOLD", "ADOPTION_READY"];
const THERAPY_DECISIONS = ["THERAPY", "WAIT", "REJECTED"];
const SLOT_STATUS = ["PLANNED", "DONE", "CANCELED", "EMPTY"];

const BEHAWIORYSTA_SHEETS = {
  "Psy": ["ID psa", "Imię", "Boks", "Status terapii", "Priorytet", "Data ostatniej sesji", "Notatka ogólna", "Aktywny"],
  "Zgłoszenia behawioralne": ["ID zgłoszenia", "Data zgłoszenia", "Zgłaszający", "ID psa", "Boks", "Opis problemu", "Kategoria", "Priorytet", "Status zgłoszenia", "Przypisane do", "Data rozpoczęcia pracy", "Data zamknięcia", "Komentarz behawiorysty"],
  "Terapie": ["ID terapii", "ID psa", "Data rozpoczęcia", "Status terapii", "Priorytet", "Główne cele", "Główne problemy", "Uwagi", "Aktywna"],
  "Plan pracy": ["ID planu", "ID terapii", "Obszar pracy", "Cel", "Kryterium sukcesu", "Ćwiczenia powiązane (lista ID ćwiczeń, CSV)", "Status", "Data dodania", "Notatka"],
  "Sesje": ["ID sesji", "Data sesji", "ID psa", "ID terapii", "Typ sesji", "Czas trwania (min)", "Ćwiczenia", "Przebieg sesji", "Wynik (1–5)", "Co działało", "Co nie działało", "Następny krok", "Prowadzący"],
  "Planer sesji": ["ID planu sesji", "Data planowana", "Godzina (opcjonalnie)", "ID psa", "Typ sesji", "Cel sesji", "Ćwiczenia sugerowane (lista)", "Status", "ID sesji wykonanej", "Notatka"],
  "Baza ćwiczeń": ["ID ćwiczenia", "Nazwa ćwiczenia", "Kategoria", "Poziom trudności", "Opis", "Wskazówki", "Typowe błędy", "Aktywne"],
};

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

    if (action === "adminGetBehaviorReports") {
      return json({ ok: true, data: adminGetBehaviorReports_() });
    }

    if (action === "adminGetSessions") {
      return json({ ok: true, data: adminGetSessions_() });
    }

    if (action === "getBehavioristDashboard") {
      return json({ ok: true, data: getBehavioristDashboard_(e?.parameter?.date) });
    }

    if (action === "getWeekSchedule") {
      return json({ ok: true, data: getWeekSchedule_(e?.parameter?.startDate, e?.parameter?.days) });
    }

    if (action === "getTherapyInbox") {
      return json({ ok: true, data: getTherapyInbox_() });
    }

    if (action === "getTherapyDog") {
      return json({ ok: true, data: getTherapyDog_(e?.parameter?.dogId) });
    }

    if (action === "getToSchedule") {
      return json({ ok: true, data: getToSchedule_(e?.parameter?.date, e?.parameter?.windowDays) });
    }

    if (action === "panelStart") {
      return json({ ok: true, data: panelStart_() });
    }

    if (action === "getDogCard") {
      return json({ ok: true, data: getDogCard_(e?.parameter?.idPsa) });
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

    if (action === "adminUpdateBehaviorReport") {
      return json({ ok: true, data: adminUpdateBehaviorReport_(payload) });
    }

    if (action === "adminSaveWorkPlan") {
      return json({ ok: true, data: adminSaveWorkPlan_(payload) });
    }

    if (action === "adminSaveSession") {
      return json({ ok: true, data: adminSaveSession_(payload) });
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

    if (action === "setScheduleSlot") {
      return json({ ok: true, data: setScheduleSlot_(payload) });
    }

    if (action === "clearScheduleSlot") {
      return json({ ok: true, data: clearScheduleSlot_(payload) });
    }

    if (action === "completeSession") {
      return json({ ok: true, data: completeSession_(payload) });
    }

    if (action === "setTherapyDecision") {
      return json({ ok: true, data: setTherapyDecision_(payload) });
    }

    if (action === "updateTherapyDog") {
      return json({ ok: true, data: updateTherapyDog_(payload?.dogId, payload) });
    }

    if (action === "autoPlanWeek") {
      return json({ ok: true, data: autoPlanWeek_(payload) });
    }

    if (action === "startBehaviorReport") {
      return json({ ok: true, data: startBehaviorReport_(payload) });
    }

    if (action === "closeBehaviorReport") {
      return json({ ok: true, data: closeBehaviorReport_(payload) });
    }

    if (action === "saveBehaviorSession") {
      return json({ ok: true, data: saveBehaviorSession_(payload) });
    }

    if (action === "addPlannerSession") {
      return json({ ok: true, data: addPlannerSession_(payload) });
    }

    if (action === "addWorkPlan") {
      return json({ ok: true, data: addWorkPlan_(payload) });
    }

    if (action === "addExercise") {
      return json({ ok: true, data: addExercise_(payload) });
    }

    if (action === "addDogToTherapy") {
      return json({ ok: true, data: addDogToTherapy_(payload) });
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

function initBehawiorystaSheets_() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  Object.keys(BEHAWIORYSTA_SHEETS).forEach((sheetName) => {
    const sh = getOrCreateSheet(ss, sheetName);
    ensureHeaders(sh, BEHAWIORYSTA_SHEETS[sheetName]);
    sh.setFrozenRows(1);
  });
}

function readRowsByHeaders_(sheetName) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0].map((header) => safeStr(header));
  return values.slice(1).map((row) => {
    const out = {};
    headers.forEach((header, idx) => {
      out[header] = row[idx] === undefined ? "" : row[idx];
    });
    return out;
  });
}

function appendRowByHeaders_(sheetName, payload) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error("Brak zakładki: " + sheetName);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map((header) => safeStr(header));
  const row = headers.map((header) => (payload[header] === undefined ? "" : payload[header]));
  sheet.appendRow(row);
  return payload;
}

function updateRowById_(sheetName, idHeader, idValue, patch) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error("Brak zakładki: " + sheetName);
  const values = sheet.getDataRange().getValues();
  if (values.length === 0) throw new Error("Pusty arkusz: " + sheetName);
  const map = headerMap(values[0]);
  const idCol = map[idHeader];
  if (idCol === undefined) throw new Error("Brak kolumny identyfikatora: " + idHeader);
  const targetRow = values.findIndex((row, idx) => idx > 0 && safeStr(row[idCol]) === safeStr(idValue));
  if (targetRow < 1) throw new Error("Nie znaleziono rekordu: " + idValue);
  Object.keys(patch || {}).forEach((header) => {
    const col = map[header];
    if (col !== undefined) {
      sheet.getRange(targetRow + 1, col + 1).setValue(patch[header]);
    }
  });
}

function panelStart_() {
  initBehawiorystaSheets_();
  const psy = readRowsByHeaders_("Psy");
  const zgloszenia = readRowsByHeaders_("Zgłoszenia behawioralne")
    .sort((a, b) => String(b["Data zgłoszenia"] || "").localeCompare(String(a["Data zgłoszenia"] || "")))
    .slice(0, 100);
  const odDzis = Utilities.formatDate(new Date(), POLAND_TIMEZONE, "yyyy-MM-dd");
  const za14 = Utilities.formatDate(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), POLAND_TIMEZONE, "yyyy-MM-dd");
  const planer = readRowsByHeaders_("Planer sesji")
    .filter((row) => {
      const data = safeStr(row["Data planowana"]);
      if (!data) return false;
      return data >= odDzis && data <= za14;
    })
    .sort((a, b) => String(a["Data planowana"] || "").localeCompare(String(b["Data planowana"] || "")));
  const cwiczenia = readRowsByHeaders_("Baza ćwiczeń").filter((row) => safeStr(row["Aktywne"]).toUpperCase() !== "NIE");
  return { psy: psy, zgłoszenia: zgloszenia, planer: planer, ćwiczenia: cwiczenia };
}

function getDogCard_(idPsa) {
  initBehawiorystaSheets_();
  const pies = readRowsByHeaders_("Psy").find((row) => safeStr(row["ID psa"]) === safeStr(idPsa)) || null;
  const terapia = readRowsByHeaders_("Terapie").find((row) => safeStr(row["ID psa"]) === safeStr(idPsa) && safeStr(row["Aktywna"]).toUpperCase() === "TAK") || null;
  const planPracy = terapia ? readRowsByHeaders_("Plan pracy").filter((row) => safeStr(row["ID terapii"]) === safeStr(terapia["ID terapii"])) : [];
  const sesje = readRowsByHeaders_("Sesje")
    .filter((row) => safeStr(row["ID psa"]) === safeStr(idPsa))
    .sort((a, b) => String(b["Data sesji"] || "").localeCompare(String(a["Data sesji"] || "")))
    .slice(0, 50);
  const zgloszenia = readRowsByHeaders_("Zgłoszenia behawioralne")
    .filter((row) => safeStr(row["ID psa"]) === safeStr(idPsa))
    .sort((a, b) => String(b["Data zgłoszenia"] || "").localeCompare(String(a["Data zgłoszenia"] || "")));
  return { pies: pies, terapia: terapia, planPracy: planPracy, sesje: sesje, zgłoszenia: zgloszenia };
}

function startBehaviorReport_(payload) {
  initBehawiorystaSheets_();
  const idZ = safeStr(payload?.idZgłoszenia);
  if (!idZ) throw new Error("Brak idZgłoszenia");
  const wszystkie = readRowsByHeaders_("Zgłoszenia behawioralne");
  const zgl = wszystkie.find((row) => safeStr(row["ID zgłoszenia"]) === idZ);
  if (!zgl) throw new Error("Nie znaleziono zgłoszenia");
  const idPsa = safeStr(zgl["ID psa"]);
  const teraz = nowIso_();
  updateRowById_("Zgłoszenia behawioralne", "ID zgłoszenia", idZ, { "Status zgłoszenia": "W trakcie", "Data rozpoczęcia pracy": teraz });
  const terapie = readRowsByHeaders_("Terapie");
  let aktywna = terapie.find((row) => safeStr(row["ID psa"]) === idPsa && safeStr(row["Aktywna"]).toUpperCase() === "TAK");
  if (!aktywna) {
    aktywna = {
      "ID terapii": "T" + Utilities.getUuid().slice(0, 8).toUpperCase(),
      "ID psa": idPsa,
      "Data rozpoczęcia": teraz,
      "Status terapii": "W terapii",
      "Priorytet": safeStr(zgl["Priorytet"]) || "Średni",
      "Główne cele": "",
      "Główne problemy": safeStr(zgl["Opis problemu"]),
      "Uwagi": "",
      "Aktywna": "TAK",
    };
    appendRowByHeaders_("Terapie", aktywna);
  }
  updateRowById_("Psy", "ID psa", idPsa, { "Status terapii": "W terapii", "Priorytet": safeStr(zgl["Priorytet"]) || "Średni" });
  return { ok: true, idPsa: idPsa, idTerapia: aktywna["ID terapii"] };
}

function closeBehaviorReport_(payload) {
  initBehawiorystaSheets_();
  const idZ = safeStr(payload?.idZgłoszenia);
  if (!idZ) throw new Error("Brak idZgłoszenia");
  updateRowById_("Zgłoszenia behawioralne", "ID zgłoszenia", idZ, {
    "Status zgłoszenia": "Zamknięte",
    "Data zamknięcia": nowIso_(),
    "Komentarz behawiorysty": safeStr(payload?.komentarzBehawiorysty),
  });
  return { ok: true };
}

function saveBehaviorSession_(payload) {
  initBehawiorystaSheets_();
  const idSesji = "S" + Utilities.getUuid().slice(0, 8).toUpperCase();
  const record = {
    "ID sesji": idSesji,
    "Data sesji": nowIso_(),
    "ID psa": safeStr(payload?.idPsa),
    "ID terapii": safeStr(payload?.idTerapia),
    "Typ sesji": safeStr(payload?.typSesji),
    "Czas trwania (min)": Number(payload?.czasTrwaniaMin || 0),
    "Ćwiczenia": Array.isArray(payload?.ćwiczenia) ? payload.ćwiczenia.join(",") : safeStr(payload?.ćwiczenia),
    "Przebieg sesji": safeStr(payload?.przebiegSesji),
    "Wynik (1–5)": Number(payload?.wynik || 0),
    "Co działało": safeStr(payload?.coDziałało),
    "Co nie działało": safeStr(payload?.coNieDziałało),
    "Następny krok": safeStr(payload?.następnyKrok),
    "Prowadzący": safeStr(payload?.prowadzący),
  };
  appendRowByHeaders_("Sesje", record);
  updateRowById_("Psy", "ID psa", record["ID psa"], { "Data ostatniej sesji": record["Data sesji"] });
  if (safeStr(payload?.idPlanuSesji)) {
    updateRowById_("Planer sesji", "ID planu sesji", payload.idPlanuSesji, { "Status": "Wykonana", "ID sesji wykonanej": idSesji });
  }
  return { ok: true, idSesji: idSesji };
}

function addPlannerSession_(payload) {
  initBehawiorystaSheets_();
  const idPlanu = "PS" + Utilities.getUuid().slice(0, 8).toUpperCase();
  appendRowByHeaders_("Planer sesji", {
    "ID planu sesji": idPlanu,
    "Data planowana": safeStr(payload?.dataPlanowana),
    "Godzina (opcjonalnie)": safeStr(payload?.godzina),
    "ID psa": safeStr(payload?.idPsa),
    "Typ sesji": safeStr(payload?.typSesji),
    "Cel sesji": safeStr(payload?.celSesji),
    "Ćwiczenia sugerowane (lista)": Array.isArray(payload?.ćwiczeniaSugerowane) ? payload.ćwiczeniaSugerowane.join(",") : safeStr(payload?.ćwiczeniaSugerowane),
    "Status": "Zaplanowana",
    "ID sesji wykonanej": "",
    "Notatka": safeStr(payload?.notatka),
  });
  return { ok: true, idPlanuSesji: idPlanu };
}

function addWorkPlan_(payload) {
  initBehawiorystaSheets_();
  const idPlanu = "PP" + Utilities.getUuid().slice(0, 8).toUpperCase();
  appendRowByHeaders_("Plan pracy", {
    "ID planu": idPlanu,
    "ID terapii": safeStr(payload?.idTerapia),
    "Obszar pracy": safeStr(payload?.obszarPracy),
    "Cel": safeStr(payload?.cel),
    "Kryterium sukcesu": safeStr(payload?.kryteriumSukcesu),
    "Ćwiczenia powiązane (lista ID ćwiczeń, CSV)": Array.isArray(payload?.ćwiczeniaPowiązane) ? payload.ćwiczeniaPowiązane.join(",") : safeStr(payload?.ćwiczeniaPowiązane),
    "Status": "Aktywny",
    "Data dodania": nowIso_(),
    "Notatka": safeStr(payload?.notatka),
  });
  return { ok: true, idPlanu: idPlanu };
}

function addExercise_(payload) {
  initBehawiorystaSheets_();
  const id = "C" + Utilities.getUuid().slice(0, 6).toUpperCase();
  appendRowByHeaders_("Baza ćwiczeń", {
    "ID ćwiczenia": id,
    "Nazwa ćwiczenia": safeStr(payload?.nazwaĆwiczenia),
    "Kategoria": safeStr(payload?.kategoria),
    "Poziom trudności": Number(payload?.poziomTrudności || 1),
    "Opis": safeStr(payload?.opis),
    "Wskazówki": safeStr(payload?.wskazówki),
    "Typowe błędy": safeStr(payload?.typoweBłędy),
    "Aktywne": "TAK",
  });
  return { ok: true, idĆwiczenia: id };
}

function addDogToTherapy_(payload) {
  initBehawiorystaSheets_();
  const idPsa = safeStr(payload?.idPsa);
  if (!idPsa) throw new Error("Brak idPsa");

  const imie = safeStr(payload?.imie);
  const boks = safeStr(payload?.boks);
  const priorytet = safeStr(payload?.priorytet) || "Średni";
  const powod = safeStr(payload?.powod);

  const psy = readRowsByHeaders_("Psy");
  const istniejePies = psy.find((row) => safeStr(row["ID psa"]) === idPsa);

  if (!istniejePies) {
    appendRowByHeaders_("Psy", {
      "ID psa": idPsa,
      "Imię": imie,
      "Boks": boks,
      "Status terapii": "W terapii",
      "Priorytet": priorytet,
      "Data ostatniej sesji": "",
      "Notatka ogólna": "",
      "Aktywny": "TAK",
    });
  } else {
    updateRowById_("Psy", "ID psa", idPsa, {
      "Imię": imie || safeStr(istniejePies["Imię"]),
      "Boks": boks || safeStr(istniejePies["Boks"]),
      "Status terapii": "W terapii",
      "Priorytet": priorytet,
      "Aktywny": "TAK",
    });
  }

  const terapie = readRowsByHeaders_("Terapie");
  const aktywna = terapie.find((row) => safeStr(row["ID psa"]) === idPsa && safeStr(row["Aktywna"]).toUpperCase() === "TAK");
  if (!aktywna) {
    appendRowByHeaders_("Terapie", {
      "ID terapii": "T" + Utilities.getUuid().slice(0, 8).toUpperCase(),
      "ID psa": idPsa,
      "Data rozpoczęcia": nowIso_(),
      "Status terapii": "W terapii",
      "Priorytet": priorytet,
      "Główne cele": "",
      "Główne problemy": powod,
      "Uwagi": "",
      "Aktywna": "TAK",
    });
  }

  return { ok: true };
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
    "status",
    "resolvedAt",
    "workPlanGoals",
    "workPlanNotes",
    "assignedTo",
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
    "NEW",
    "",
    "",
    "",
    "",
  ]);
}

function adminGetBehaviorReports_() {
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
    "status",
    "resolvedAt",
    "workPlanGoals",
    "workPlanNotes",
    "assignedTo",
  ]);

  const values = reportsSheet.getDataRange().getValues();
  if (values.length <= 1) return [];

  return values.slice(1).map((row, idx) => ({
    id: `report-${idx + 2}`,
    timestamp: safeStr(row[0]),
    dogName: safeStr(row[1]),
    dogId: safeStr(row[2]),
    volunteerName: safeStr(row[3]),
    reason: safeStr(row[4]),
    incident3P: safeStr(row[5]),
    tagsEmotions: safeStr(row[6]),
    tagsRelations: safeStr(row[7]),
    tagsWelfare: safeStr(row[8]),
    risk: safeStr(row[9]),
    priority: safeStr(row[10]),
    status: safeStr(row[11]) || "NEW",
    resolvedAt: safeStr(row[12]),
    workPlanGoals: safeStr(row[13]),
    workPlanNotes: safeStr(row[14]),
    assignedTo: safeStr(row[15]),
  })).sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp)));
}

function adminUpdateBehaviorReport_(payload) {
  const reportId = safeStr(payload?.reportId || payload?.id);
  const status = safeStr(payload?.status).toUpperCase();
  if (!reportId) throw new Error("Brak reportId");
  if (!status) throw new Error("Brak statusu");

  const rowNumber = Number(reportId.replace("report-", ""));
  if (!rowNumber || rowNumber < 2) throw new Error("Nieprawidłowe reportId");

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const reportsSheet = getOrCreateSheet(ss, REPORTS_SHEET_NAME);
  ensureHeaders(reportsSheet, [
    "timestamp", "dogName", "dogId", "volunteerName", "reason", "incident3P", "tagsEmotions", "tagsRelations", "tagsWelfare", "risk", "priority", "status", "resolvedAt", "workPlanGoals", "workPlanNotes", "assignedTo",
  ]);

  if (rowNumber > reportsSheet.getLastRow()) throw new Error("Zgłoszenie nie istnieje");

  reportsSheet.getRange(rowNumber, 12).setValue(status);
  if (status === "DONE") reportsSheet.getRange(rowNumber, 13).setValue(nowInPolandText());
  return { success: true, reportId, status };
}

function adminSaveWorkPlan_(payload) {
  const reportId = safeStr(payload?.reportId);
  const dogId = safeStr(payload?.dogId);
  const goals = payload?.goals || [];
  const notes = safeStr(payload?.notes);

  if (!reportId) throw new Error("Brak reportId");

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const reportsSheet = getOrCreateSheet(ss, REPORTS_SHEET_NAME);
  ensureHeaders(reportsSheet, [
    "timestamp", "dogName", "dogId", "volunteerName", "reason", "incident3P", "tagsEmotions", "tagsRelations", "tagsWelfare", "risk", "priority", "status", "resolvedAt", "workPlanGoals", "workPlanNotes", "assignedTo",
  ]);

  const rowNumber = Number(reportId.replace("report-", ""));
  if (!rowNumber || rowNumber < 2 || rowNumber > reportsSheet.getLastRow()) throw new Error("Nieprawidłowe reportId");

  const goalText = Array.isArray(goals) ? goals.map((goal) => safeStr(goal)).filter(Boolean).join("\n") : safeStr(goals);
  reportsSheet.getRange(rowNumber, 14).setValue(goalText);
  reportsSheet.getRange(rowNumber, 15).setValue(notes);
  if (dogId) reportsSheet.getRange(rowNumber, 3).setValue(dogId);

  const plansSheet = getOrCreateSheet(ss, BEHAVIOR_WORK_PLANS_SHEET_NAME);
  ensureHeaders(plansSheet, ["id", "reportId", "dogId", "goals", "notes", "createdAt", "updatedAt"]);
  plansSheet.appendRow([`plan-${new Date().getTime()}`, reportId, dogId, goalText, notes, nowInPolandText(), nowInPolandText()]);

  return { success: true, reportId };
}

function adminGetSessions_() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sessionsSheet = getOrCreateSheet(ss, BEHAVIOR_SESSIONS_SHEET_NAME);
  ensureHeaders(sessionsSheet, ["id", "reportId", "dogId", "title", "plannedFor", "goals", "notes", "status", "createdAt", "updatedAt"]);

  const values = sessionsSheet.getDataRange().getValues();
  if (values.length <= 1) return [];

  return values.slice(1).map((row) => ({
    id: safeStr(row[0]),
    reportId: safeStr(row[1]),
    dogId: safeStr(row[2]),
    title: safeStr(row[3]),
    plannedFor: safeStr(row[4]),
    goals: safeStr(row[5]),
    notes: safeStr(row[6]),
    status: safeStr(row[7]) || "PLANNED",
    createdAt: safeStr(row[8]),
    updatedAt: safeStr(row[9]),
  })).sort((a, b) => String(a.plannedFor).localeCompare(String(b.plannedFor)));
}

function adminSaveSession_(payload) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sessionsSheet = getOrCreateSheet(ss, BEHAVIOR_SESSIONS_SHEET_NAME);
  ensureHeaders(sessionsSheet, ["id", "reportId", "dogId", "title", "plannedFor", "goals", "notes", "status", "createdAt", "updatedAt"]);

  const id = safeStr(payload?.id) || `session-${new Date().getTime()}`;
  const reportId = safeStr(payload?.reportId);
  const dogId = safeStr(payload?.dogId);
  const title = safeStr(payload?.title) || "Sesja behawioralna";
  const plannedFor = safeStr(payload?.plannedFor);
  const goals = safeStr(payload?.goals);
  const notes = safeStr(payload?.notes);
  const status = safeStr(payload?.status) || "PLANNED";

  if (!dogId) throw new Error("Brak dogId");

  const all = sessionsSheet.getDataRange().getValues();
  const now = nowInPolandText();
  let updated = false;

  for (let r = 1; r < all.length; r++) {
    if (safeStr(all[r][0]) === id) {
      sessionsSheet.getRange(r + 1, 1, 1, 10).setValues([[id, reportId, dogId, title, plannedFor, goals, notes, status, safeStr(all[r][8]) || now, now]]);
      updated = true;
      break;
    }
  }

  if (!updated) {
    sessionsSheet.appendRow([id, reportId, dogId, title, plannedFor, goals, notes, status, now, now]);
  }

  return { success: true, id };
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

function getTherapyHeaders_() {
  return ["DogID", "TherapyStatus", "Priority", "WalkFreqDays", "BoxFreqDays", "LastWalkDate", "LastBoxDate", "NextWalkDue", "NextBoxDue", "WorkAreas", "Exercises", "NotesShort"];
}

function getScheduleHeaders_() {
  return ["Date", "SessionType", "Slot", "DogID", "Status", "PlanArea", "TemplateID", "SessionNote"];
}

function getSessionLogHeaders_() {
  return ["Timestamp", "Date", "SessionType", "Slot", "DogID", "ExercisesDone", "Outcome", "Note"];
}

function initTherapySheets_() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  ensureHeadersAppend_(getOrCreateSheet(ss, DOGS_THERAPY_SHEET_NAME), getTherapyHeaders_());
  ensureHeadersAppend_(getOrCreateSheet(ss, THERAPY_SCHEDULE_SHEET_NAME), getScheduleHeaders_());
  ensureHeadersAppend_(getOrCreateSheet(ss, THERAPY_SESSION_LOG_SHEET_NAME), getSessionLogHeaders_());
}

function ensureHeadersAppend_(sheet, headers) {
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
    return;
  }
  const width = Math.max(sheet.getLastColumn(), headers.length);
  const current = sheet.getRange(1, 1, 1, width).getValues()[0].map((v) => safeStr(v));
  let changed = false;
  headers.forEach((header, idx) => {
    if (!current[idx]) {
      current[idx] = header;
      changed = true;
    }
  });
  if (changed) sheet.getRange(1, 1, 1, current.length).setValues([current]);
  sheet.setFrozenRows(1);
}

function formatDatePoland_(value) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return Utilities.formatDate(date, POLAND_TIMEZONE, "yyyy-MM-dd");
}

function toDatePoland_(value) {
  const normalized = formatDatePoland_(value);
  if (!normalized) return null;
  return new Date(normalized + "T00:00:00+01:00");
}

function validSessionType_(value) { return value === "WALK" || value === "BOX"; }
function getMaxSlot_(type) { return type === "WALK" ? 6 : 4; }

function assertDate_(value, fieldName) {
  const date = formatDatePoland_(value);
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Nieprawidłowa data: " + fieldName);
  return date;
}

function getDogsMap_() {
  const dogs = getDogs(true);
  const map = {};
  dogs.forEach((dog) => { map[safeStr(dog.id)] = dog; });
  return map;
}

function readTherapyRows_() {
  initTherapySheets_();
  const sh = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(DOGS_THERAPY_SHEET_NAME);
  const rows = sh.getDataRange().getValues();
  if (rows.length < 2) return [];
  const headers = rows[0].map((h) => safeStr(h));
  return rows.slice(1).map((row, idx) => {
    const item = { __row: idx + 2 };
    headers.forEach((h, i) => { item[h] = row[i]; });
    return item;
  }).filter((row) => safeStr(row.DogID));
}

function upsertTherapyDog_(dogId, patch) {
  const normalizedDogId = safeStr(dogId);
  if (!normalizedDogId) throw new Error("Brak dogId");
  initTherapySheets_();
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sh = ss.getSheetByName(DOGS_THERAPY_SHEET_NAME);
  const headers = getTherapyHeaders_();
  const rows = readTherapyRows_();
  const existing = rows.find((row) => safeStr(row.DogID) === normalizedDogId);
  const base = {
    DogID: normalizedDogId,
    TherapyStatus: "WAIT",
    Priority: 2,
    WalkFreqDays: "",
    BoxFreqDays: "",
    LastWalkDate: "",
    LastBoxDate: "",
    NextWalkDue: "",
    NextBoxDue: "",
    WorkAreas: "",
    Exercises: "",
    NotesShort: "",
  };
  const next = { ...base, ...(existing || {}), ...(patch || {}) };
  const values = headers.map((h) => (next[h] === undefined ? "" : next[h]));
  if (existing?.__row) sh.getRange(existing.__row, 1, 1, headers.length).setValues([values]);
  else sh.appendRow(values);
  return next;
}

function getScheduleRows_() {
  initTherapySheets_();
  const sh = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(THERAPY_SCHEDULE_SHEET_NAME);
  const rows = sh.getDataRange().getValues();
  if (rows.length < 2) return [];
  const headers = rows[0].map((h) => safeStr(h));
  return rows.slice(1).map((row, idx) => {
    const out = { __row: idx + 2 };
    headers.forEach((h, i) => { out[h] = row[i]; });
    return out;
  });
}

function getOrCreateScheduleSlot_(date, type, slot) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sh = ss.getSheetByName(THERAPY_SCHEDULE_SHEET_NAME);
  const headers = getScheduleHeaders_();
  const rows = getScheduleRows_();
  const found = rows.find((row) => safeStr(row.Date) === date && safeStr(row.SessionType) === type && Number(row.Slot) === Number(slot));
  if (found) return found;
  const rowObj = { Date: date, SessionType: type, Slot: Number(slot), DogID: "", Status: "EMPTY", PlanArea: "", TemplateID: "", SessionNote: "" };
  sh.appendRow(headers.map((h) => rowObj[h]));
  const rowNumber = sh.getLastRow();
  return { ...rowObj, __row: rowNumber };
}

function setScheduleRow_(rowNumber, data) {
  const sh = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(THERAPY_SCHEDULE_SHEET_NAME);
  const headers = getScheduleHeaders_();
  sh.getRange(rowNumber, 1, 1, headers.length).setValues([headers.map((h) => data[h] || "")]);
}

function setScheduleSlot_(payload) {
  initTherapySheets_();
  const date = assertDate_(payload?.date, "date");
  const type = safeStr(payload?.type).toUpperCase();
  const slot = Number(payload?.slot);
  const dogId = safeStr(payload?.dogId);
  if (!validSessionType_(type)) throw new Error("Nieprawidłowy type");
  if (!dogId) throw new Error("Brak dogId");
  if (!Number.isInteger(slot) || slot < 1 || slot > getMaxSlot_(type)) throw new Error("Nieprawidłowy slot");

  const row = getOrCreateScheduleSlot_(date, type, slot);
  const next = { ...row, Date: date, SessionType: type, Slot: slot, DogID: dogId, Status: "PLANNED", PlanArea: safeStr(payload?.planArea), TemplateID: safeStr(payload?.templateId), SessionNote: safeStr(payload?.sessionNote) };
  setScheduleRow_(row.__row, next);
  return { success: true };
}

function clearScheduleSlot_(payload) {
  const date = assertDate_(payload?.date, "date");
  const type = safeStr(payload?.type).toUpperCase();
  const slot = Number(payload?.slot);
  if (!validSessionType_(type)) throw new Error("Nieprawidłowy type");
  if (!Number.isInteger(slot) || slot < 1 || slot > getMaxSlot_(type)) throw new Error("Nieprawidłowy slot");
  const row = getOrCreateScheduleSlot_(date, type, slot);
  setScheduleRow_(row.__row, { ...row, Date: date, SessionType: type, Slot: slot, DogID: "", Status: "EMPTY", PlanArea: "", TemplateID: "", SessionNote: "" });
  return { success: true };
}

function getBehavioristDashboard_(dateValue) {
  const date = assertDate_(dateValue || formatDatePoland_(new Date()), "date");
  const dogsMap = getDogsMap_();
  const schedule = getWeekSchedule_(date, 1);
  return { date, slots: schedule.days[0].slots.map((slot) => ({ ...slot, dog: dogsMap[slot.dogId] || null })) };
}

function getWeekSchedule_(startDateValue, daysValue) {
  initTherapySheets_();
  const startDate = assertDate_(startDateValue || formatDatePoland_(new Date()), "startDate");
  const days = Math.min(Math.max(Number(daysValue) || 7, 1), 21);
  const allRows = getScheduleRows_();
  const rowsByKey = {};
  allRows.forEach((row) => {
    rowsByKey[`${safeStr(row.Date)}|${safeStr(row.SessionType)}|${Number(row.Slot)}`] = row;
  });
  const daysOut = [];
  for (let i = 0; i < days; i++) {
    const date = formatDatePoland_(new Date(toDatePoland_(startDate).getTime() + i * 24 * 60 * 60 * 1000));
    const slots = [];
    ["WALK", "BOX"].forEach((type) => {
      for (let slot = 1; slot <= getMaxSlot_(type); slot++) {
        const key = `${date}|${type}|${slot}`;
        const found = rowsByKey[key];
        slots.push({ date, type, slot, dogId: safeStr(found?.DogID), status: safeStr(found?.Status) || "EMPTY", planArea: safeStr(found?.PlanArea), templateId: safeStr(found?.TemplateID), sessionNote: safeStr(found?.SessionNote) });
      }
    });
    daysOut.push({ date, slots });
  }
  return { startDate, days: daysOut };
}

function completeSession_(payload) {
  const date = assertDate_(payload?.date, "date");
  const type = safeStr(payload?.type).toUpperCase();
  const slot = Number(payload?.slot);
  const dogId = safeStr(payload?.dogId);
  if (!validSessionType_(type)) throw new Error("Nieprawidłowy type");
  if (!dogId) throw new Error("Brak dogId");
  if (!Number.isInteger(slot) || slot < 1 || slot > getMaxSlot_(type)) throw new Error("Nieprawidłowy slot");

  const row = getOrCreateScheduleSlot_(date, type, slot);
  setScheduleRow_(row.__row, { ...row, Date: date, SessionType: type, Slot: slot, DogID: dogId, Status: "DONE", SessionNote: safeStr(payload?.note) || safeStr(row.SessionNote) });

  const logSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(THERAPY_SESSION_LOG_SHEET_NAME);
  const exercisesDone = Array.isArray(payload?.exercisesDone) ? payload.exercisesDone.join(", ") : safeStr(payload?.exercisesDone);
  logSheet.appendRow([nowInPolandText(), date, type, slot, dogId, exercisesDone, safeStr(payload?.outcome), safeStr(payload?.note)]);

  const patch = {};
  if (type === "WALK") {
    patch.LastWalkDate = date;
    const freq = Number(payload?.walkFreqDays) || Number(getTherapyDog_(dogId)?.WalkFreqDays) || 0;
    patch.NextWalkDue = freq > 0 ? formatDatePoland_(new Date(toDatePoland_(date).getTime() + freq * 24 * 60 * 60 * 1000)) : "";
  } else {
    patch.LastBoxDate = date;
    const freq = Number(payload?.boxFreqDays) || Number(getTherapyDog_(dogId)?.BoxFreqDays) || 0;
    patch.NextBoxDue = freq > 0 ? formatDatePoland_(new Date(toDatePoland_(date).getTime() + freq * 24 * 60 * 60 * 1000)) : "";
  }
  upsertTherapyDog_(dogId, patch);
  return { success: true };
}

function getTherapyInbox_() {
  const reports = adminGetBehaviorReports_();
  const dogs = getDogsMap_();
  return reports.map((report) => ({
    id: report.id,
    dogId: report.dogId,
    dogName: report.dogName || dogs[safeStr(report.dogId)]?.name || "",
    box: dogs[safeStr(report.dogId)]?.kennel || report.box || "",
    pavilion: dogs[safeStr(report.dogId)]?.pavilion || report.pavilion || "",
    reason: report.reason,
    priority: report.priority,
    timestamp: report.timestamp,
    decision: safeStr(report.therapyDecision || report.status || "NEW"),
  }));
}

function setTherapyDecision_(payload) {
  const dogId = safeStr(payload?.dogId);
  const decision = safeStr(payload?.decision).toUpperCase();
  if (!dogId) throw new Error("Brak dogId");
  if (THERAPY_DECISIONS.indexOf(decision) === -1) throw new Error("Nieprawidłowa decyzja");

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const reportsSheet = getOrCreateSheet(ss, REPORTS_SHEET_NAME);
  ensureHeadersAppend_(reportsSheet, ["timestamp", "dogName", "dogId", "volunteerName", "reason", "incident3P", "tagsEmotions", "tagsRelations", "tagsWelfare", "risk", "priority", "status", "resolvedAt", "workPlanGoals", "workPlanNotes", "assignedTo", "therapyDecision", "therapyDecisionAt"]);

  const values = reportsSheet.getDataRange().getValues();
  const headers = values[0].map((h) => safeStr(h));
  const dogIdx = headers.indexOf("dogId");
  const decisionIdx = headers.indexOf("therapyDecision");
  const decisionAtIdx = headers.indexOf("therapyDecisionAt");
  for (let r = values.length - 1; r >= 1; r--) {
    if (safeStr(values[r][dogIdx]) === dogId) {
      reportsSheet.getRange(r + 1, decisionIdx + 1).setValue(decision);
      reportsSheet.getRange(r + 1, decisionAtIdx + 1).setValue(nowInPolandText());
      break;
    }
  }

  if (decision === "THERAPY") upsertTherapyDog_(dogId, { TherapyStatus: "THERAPY" });
  if (decision === "WAIT") upsertTherapyDog_(dogId, { TherapyStatus: "WAIT" });
  return { success: true };
}

function getTherapyDog_(dogId) {
  const id = safeStr(dogId);
  if (!id) throw new Error("Brak dogId");
  const row = readTherapyRows_().find((item) => safeStr(item.DogID) === id);
  return row || upsertTherapyDog_(id, {});
}

function updateTherapyDog_(dogId, payload) {
  const id = safeStr(dogId);
  if (!id) throw new Error("Brak dogId");
  const patch = {};
  if (THERAPY_STATUSES.indexOf(safeStr(payload?.therapyStatus).toUpperCase()) !== -1) patch.TherapyStatus = safeStr(payload?.therapyStatus).toUpperCase();
  if ([1, 2, 3].indexOf(Number(payload?.priority)) !== -1) patch.Priority = Number(payload.priority);
  ["walkFreqDays", "boxFreqDays"].forEach((key) => {
    const val = payload?.[key];
    if (val === "" || val === null || val === undefined) return;
    if (!Number.isInteger(Number(val)) || Number(val) <= 0) throw new Error("Nieprawidłowa częstotliwość");
  });
  if (payload?.walkFreqDays !== undefined) patch.WalkFreqDays = payload.walkFreqDays === "" ? "" : Number(payload.walkFreqDays);
  if (payload?.boxFreqDays !== undefined) patch.BoxFreqDays = payload.boxFreqDays === "" ? "" : Number(payload.boxFreqDays);
  if (payload?.workAreas !== undefined) patch.WorkAreas = safeStr(payload.workAreas);
  if (payload?.exercises !== undefined) patch.Exercises = safeStr(payload.exercises);
  if (payload?.notesShort !== undefined) patch.NotesShort = safeStr(payload.notesShort);
  return upsertTherapyDog_(id, patch);
}

function getToSchedule_(dateValue, windowDaysValue) {
  const date = assertDate_(dateValue || formatDatePoland_(new Date()), "date");
  const windowDays = Math.max(Number(windowDaysValue) || 1, 1);
  const dogs = readTherapyRows_().filter((row) => safeStr(row.TherapyStatus) === "THERAPY");
  const schedule = getWeekSchedule_(date, windowDays + 1);
  const byDog = {};
  schedule.days.forEach((day) => {
    day.slots.forEach((slot) => {
      if (!slot.dogId) return;
      if (!byDog[slot.dogId]) byDog[slot.dogId] = { WALK: 0, BOX: 0 };
      byDog[slot.dogId][slot.type] += 1;
    });
  });
  const today = toDatePoland_(date);
  return dogs.filter((dog) => {
    const nextWalkDue = toDatePoland_(dog.NextWalkDue);
    const nextBoxDue = toDatePoland_(dog.NextBoxDue);
    const walkFreq = Number(dog.WalkFreqDays) || 0;
    const boxFreq = Number(dog.BoxFreqDays) || 0;
    const overdue = (nextWalkDue && nextWalkDue.getTime() < today.getTime()) || (nextBoxDue && nextBoxDue.getTime() < today.getTime());
    const dailyNoPlan = (walkFreq === 1 && (!byDog[safeStr(dog.DogID)] || byDog[safeStr(dog.DogID)].WALK < 1)) || (boxFreq === 1 && (!byDog[safeStr(dog.DogID)] || byDog[safeStr(dog.DogID)].BOX < 1));
    return overdue || dailyNoPlan;
  });
}

function autoPlanWeek_(payload) {
  const startDate = assertDate_(payload?.startDate || formatDatePoland_(new Date()), "startDate");
  const days = Math.max(Number(payload?.days) || 7, 1);
  const therapyDogs = readTherapyRows_().filter((row) => safeStr(row.TherapyStatus) === "THERAPY");

  for (let i = 0; i < days; i++) {
    const date = formatDatePoland_(new Date(toDatePoland_(startDate).getTime() + i * 24 * 60 * 60 * 1000));
    ["WALK", "BOX"].forEach((type) => {
      const candidates = therapyDogs.filter((dog) => Number(type === "WALK" ? dog.WalkFreqDays : dog.BoxFreqDays) > 0)
        .sort((a, b) => {
          const dueA = toDatePoland_(type === "WALK" ? a.NextWalkDue : a.NextBoxDue);
          const dueB = toDatePoland_(type === "WALK" ? b.NextWalkDue : b.NextBoxDue);
          const overdueA = dueA && dueA.getTime() <= toDatePoland_(date).getTime();
          const overdueB = dueB && dueB.getTime() <= toDatePoland_(date).getTime();
          if (overdueA !== overdueB) return overdueA ? -1 : 1;
          const dailyA = Number(type === "WALK" ? a.WalkFreqDays : a.BoxFreqDays) === 1;
          const dailyB = Number(type === "WALK" ? b.WalkFreqDays : b.BoxFreqDays) === 1;
          if (dailyA !== dailyB) return dailyA ? -1 : 1;
          const priorityDiff = (Number(a.Priority) || 3) - (Number(b.Priority) || 3);
          if (priorityDiff !== 0) return priorityDiff;
          const lastA = toDatePoland_(type === "WALK" ? a.LastWalkDate : a.LastBoxDate);
          const lastB = toDatePoland_(type === "WALK" ? b.LastWalkDate : b.LastBoxDate);
          return (lastA ? lastA.getTime() : 0) - (lastB ? lastB.getTime() : 0);
        });

      const used = {};
      for (let slot = 1; slot <= getMaxSlot_(type); slot++) {
        const existing = getOrCreateScheduleSlot_(date, type, slot);
        if (safeStr(existing.DogID) || safeStr(existing.Status) === "DONE") continue;
        const candidate = candidates.find((dog) => !used[safeStr(dog.DogID)]);
        if (!candidate) break;
        used[safeStr(candidate.DogID)] = true;
        setScheduleSlot_({ date, type, slot, dogId: safeStr(candidate.DogID) });
      }
    });
  }
  return { success: true };
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
