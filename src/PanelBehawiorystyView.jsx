import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Calendar, FileText, PlayCircle, Plus, Stethoscope } from "lucide-react";

const API_URL = "/api/gs";

const styles = {
  page: { minHeight: "100vh", background: "#f9fafb", paddingBottom: "90px" },
  header: { position: "sticky", top: 0, zIndex: 100, background: "white", borderBottom: "1px solid #e5e7eb", padding: "1rem" },
  title: { margin: 0, fontSize: "1.2rem", fontWeight: 800 },
  row: { display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" },
  input: { flex: 1, minWidth: 120, padding: "0.65rem", border: "1px solid #d1d5db", borderRadius: "0.6rem" },
  button: { padding: "0.65rem 0.8rem", border: "none", borderRadius: "0.6rem", background: "#2563eb", color: "white", fontWeight: 600, cursor: "pointer" },
  card: { background: "white", margin: "0.8rem 1rem", borderRadius: "0.9rem", padding: "0.9rem", border: "1px solid #e5e7eb" },
  sectionTitle: { margin: "0 0 0.5rem", fontSize: "1rem" },
  helper: { fontSize: "0.82rem", color: "#6b7280", marginTop: "0.3rem" },
  chip: { display: "inline-flex", alignItems: "center", borderRadius: "999px", border: "1px solid #bfdbfe", background: "#eff6ff", color: "#1d4ed8", padding: "0.2rem 0.55rem", fontSize: "0.76rem", fontWeight: 700 },
};

async function apiCall(currentUser, action, data, method = "POST") {
  const token = currentUser ? await currentUser.getIdToken() : "";
  const isGet = method === "GET";
  const url = isGet
    ? `${API_URL}?${new URLSearchParams({ action, ...(data || {}) }).toString()}`
    : API_URL;

  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(isGet ? {} : { body: JSON.stringify({ action, ...(data || {}) }) }),
  });

  const result = await response.json();
  if (!response.ok || result?.ok !== true) throw new Error(result?.error || "Błąd API");
  return result.data;
}

export default function PanelBehawiorystyView({ currentUser, dogs, setCurrentView }) {
  const [cases, setCases] = useState([]);
  const [today, setToday] = useState([]);
  const [reports, setReports] = useState([]);
  const [selectedCase, setSelectedCase] = useState(null);

  const [search, setSearch] = useState("");
  const [caseDraft, setCaseDraft] = useState({ dogId: "", title: "", priority: "MEDIUM" });
  const [diagnosisText, setDiagnosisText] = useState("");
  const [newArea, setNewArea] = useState("");
  const [selectedAreaName, setSelectedAreaName] = useState("");
  const [exerciseTitle, setExerciseTitle] = useState("");
  const [sessionTitle, setSessionTitle] = useState("Sesja terapeutyczna");
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().slice(0, 16));
  const [sessionNote, setSessionNote] = useState("");
  const [nextStep, setNextStep] = useState("");
  const [reportPreview, setReportPreview] = useState("");

  const [areasByCase, setAreasByCase] = useState({});
  const [exercisesByArea, setExercisesByArea] = useState({});

  const dogById = useMemo(() => Object.fromEntries((dogs || []).map((d) => [d.id, d])), [dogs]);

  const loadCases = async () => {
    const data = await apiCall(currentUser, "cases.list", { stage: "", search, limit: 50, offset: 0 }, "GET");
    setCases(data.items || []);
  };

  const loadToday = async () => {
    const data = await apiCall(currentUser, "sessions.listToday", {}, "GET");
    setToday(data.items || []);
  };

  const loadReports = async () => {
    const result = await apiCall(currentUser, "adminGetBehaviorReports", {}, "POST");
    const rows = Array.isArray(result) ? result : result?.reports || [];
    setReports(rows);
  };

  useEffect(() => {
    apiCall(currentUser, "behavior.init", {}).then(() => {
      loadCases();
      loadToday();
      loadReports();
    }).catch(() => {
      loadCases();
      loadToday();
      loadReports();
    });
  }, []);

  const openCase = async (item) => {
    setSelectedCase(item);
    setDiagnosisText("");
    const reportsData = await apiCall(currentUser, "reports.list", { caseId: item.id }, "GET");
    if (reportsData.items?.[0]) setReportPreview(reportsData.items[0].contentMarkdown || "");
  };

  const createCase = async () => {
    await apiCall(currentUser, "cases.create", caseDraft);
    setCaseDraft({ dogId: "", title: "", priority: "MEDIUM" });
    loadCases();
  };

  const startFromReport = async (report) => {
    await apiCall(currentUser, "cases.create", {
      dogId: report.dogId,
      title: `Terapia: ${report.dogName || report.dogId}`,
      priority: "HIGH",
    });

    await apiCall(currentUser, "adminUpdateBehaviorReport", {
      reportId: report.id,
      status: "in_progress",
      behavioristNote: "Rozpoczęto pracę - etap diagnozy.",
    });

    loadCases();
    loadReports();
  };

  const setStage = async (stage) => {
    if (!selectedCase?.id) return;
    await apiCall(currentUser, "cases.setStage", { id: selectedCase.id, stage });
    await loadCases();
    setSelectedCase((prev) => ({ ...prev, stage }));
  };

  const addDiagnosis = async () => {
    if (!selectedCase?.id || !diagnosisText.trim()) return;
    await apiCall(currentUser, "diagnosis.addVersion", {
      caseId: selectedCase.id,
      data: { mainProblem: diagnosisText, createdBy: currentUser?.email || "" },
    });
    setDiagnosisText("");
    alert("Diagnoza zapisana");
  };

  const addArea = async () => {
    if (!selectedCase?.id || !newArea.trim()) return;
    const draft = await apiCall(currentUser, "plan.createDraft", { caseId: selectedCase.id, summary: "Plan pracy" });
    await apiCall(currentUser, "plan.activate", { planId: draft.id });
    await apiCall(currentUser, "areas.create", { planId: draft.id, name: newArea, order: (areasByCase[selectedCase.id]?.length || 0) + 1 });

    setAreasByCase((prev) => ({
      ...prev,
      [selectedCase.id]: [...(prev[selectedCase.id] || []), newArea.trim()],
    }));
    setSelectedAreaName(newArea.trim());
    setNewArea("");
  };

  const addExerciseToArea = async () => {
    if (!selectedCase?.id || !selectedAreaName.trim() || !exerciseTitle.trim()) return;

    await apiCall(currentUser, "goals.create", {
      caseId: selectedCase.id,
      title: `${selectedAreaName}: ${exerciseTitle}`,
      metricType: "COUNT",
      metricLabel: "Powtórzenia",
      metricTarget: "10",
    });

    const key = `${selectedCase.id}:${selectedAreaName}`;
    setExercisesByArea((prev) => ({
      ...prev,
      [key]: [...(prev[key] || []), exerciseTitle.trim()],
    }));
    setExerciseTitle("");
  };

  const scheduleSession = async () => {
    if (!selectedCase?.id) return;
    await apiCall(currentUser, "sessions.createPlanned", {
      caseId: selectedCase.id,
      dogId: selectedCase.dogId,
      plannedFor: new Date(sessionDate).toISOString(),
      title: sessionTitle || "Sesja terapeutyczna",
    });
    await loadToday();
    alert("Sesja zaplanowana");
  };

  const markDone = async (sessionId) => {
    await apiCall(currentUser, "sessions.markDone", { sessionId, notes: sessionNote, overallTrend: "SAME" });
    await apiCall(currentUser, "sEntries.add", {
      sessionId,
      trend: "SAME",
      difficultyUsed: 2,
      metrics: [{ label: "czas", value: 300 }],
      nextStep: nextStep || "Kontynuować krótkie serie",
    });
    setSessionNote("");
    setNextStep("");
    loadToday();
  };

  const generateReport = async () => {
    if (!selectedCase?.id) return;
    const report = await apiCall(currentUser, "reports.generateMarkdown", { caseId: selectedCase.id });
    setReportPreview(report.contentMarkdown || "");
  };

  const selectedCaseAreas = selectedCase ? (areasByCase[selectedCase.id] || []) : [];
  const selectedAreaExercises = selectedCase ? (exercisesByArea[`${selectedCase.id}:${selectedAreaName}`] || []) : [];

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div style={styles.row}>
          <button style={{ ...styles.button, background: "#6b7280" }} onClick={() => setCurrentView("home")}><ArrowLeft size={16} /> Wróć</button>
          <h2 style={styles.title}>Panel terapii behawioralnej</h2>
        </div>
        <div style={{ ...styles.row, marginTop: "0.6rem" }}>
          <input style={styles.input} placeholder="Szukaj sprawy / psa" value={search} onChange={(e) => setSearch(e.target.value)} />
          <button style={styles.button} onClick={loadCases}>Szukaj</button>
        </div>
      </div>

      <div style={styles.card}>
        <h4 style={styles.sectionTitle}>Nowe zgłoszenia do pracy</h4>
        {(reports || []).filter((r) => (r.status || "new") === "new").slice(0, 8).map((report) => (
          <div key={report.id} style={{ borderTop: "1px solid #eee", paddingTop: "0.6rem", marginTop: "0.6rem" }}>
            <div><strong>{report.dogName || report.dogId}</strong> • {report.reason || report.shortDescription || "Brak opisu"}</div>
            <button style={{ ...styles.button, marginTop: "0.4rem" }} onClick={() => startFromReport(report)}><PlayCircle size={14} /> Rozpocznij pracę</button>
          </div>
        ))}
        {(reports || []).filter((r) => (r.status || "new") === "new").length === 0 && <div style={styles.helper}>Brak nowych zgłoszeń.</div>}
      </div>

      <div style={styles.card}>
        <h4 style={styles.sectionTitle}>Dzisiaj do zrobienia <Calendar size={14} /></h4>
        {(today || []).map((s) => (
          <div key={s.id} style={{ borderTop: "1px solid #eee", paddingTop: "0.6rem", marginTop: "0.6rem" }}>
            <div>{s.title || "Sesja"} • {dogById[s.dogId]?.name || s.dogId}</div>
            <div style={styles.helper}>{s.plannedFor ? new Date(s.plannedFor).toLocaleString("pl-PL") : "Brak daty"}</div>
            <button style={{ ...styles.button, marginTop: "0.35rem" }} onClick={() => markDone(s.id)}>Zapisz przebieg i oznacz DONE</button>
          </div>
        ))}
      </div>

      <div style={styles.card}>
        <h4 style={styles.sectionTitle}>Nowa sprawa (ręcznie)</h4>
        <div style={styles.row}>
          <input style={styles.input} placeholder="dogId" value={caseDraft.dogId} onChange={(e) => setCaseDraft((p) => ({ ...p, dogId: e.target.value }))} />
          <input style={styles.input} placeholder="Tytuł" value={caseDraft.title} onChange={(e) => setCaseDraft((p) => ({ ...p, title: e.target.value }))} />
          <button style={styles.button} onClick={createCase}><Plus size={15} /> Utwórz</button>
        </div>
      </div>

      <div style={styles.card}>
        <h4 style={styles.sectionTitle}>Aktywne sprawy</h4>
        {(cases || []).map((item) => (
          <div key={item.id} onClick={() => openCase(item)} style={{ borderTop: "1px solid #eee", padding: "0.55rem 0", cursor: "pointer" }}>
            <strong>{item.title}</strong> • {dogById[item.dogId]?.name || item.dogId} • <span style={styles.chip}>{item.stage}</span>
          </div>
        ))}
      </div>

      {selectedCase && (
        <>
          <div style={styles.card}>
            <h3 style={{ marginTop: 0 }}>{dogById[selectedCase.dogId]?.name || selectedCase.dogId} — {selectedCase.title}</h3>
            <div style={styles.row}>
              <button style={styles.button} onClick={() => setStage("DIAGNOSIS")}>1. Diagnoza</button>
              <button style={styles.button} onClick={() => setStage("PLAN")}>2. Plan</button>
              <button style={styles.button} onClick={() => setStage("IN_PROGRESS")}>3. Sesje</button>
              <button style={styles.button} onClick={() => setStage("DONE")}>4. Zakończ</button>
            </div>
          </div>

          <div style={styles.card}>
            <h4 style={styles.sectionTitle}><Stethoscope size={15} /> Diagnoza i plan pracy</h4>
            <textarea style={{ ...styles.input, minHeight: 90 }} placeholder="Opis diagnozy i główne trudności" value={diagnosisText} onChange={(e) => setDiagnosisText(e.target.value)} />
            <button style={{ ...styles.button, marginTop: "0.6rem" }} onClick={addDiagnosis}>Zapisz diagnozę</button>

            <div style={{ ...styles.row, marginTop: "0.9rem" }}>
              <input style={styles.input} placeholder="Nowy obszar (np. Luźna smycz, Skupienie uwagi, Miejsce)" value={newArea} onChange={(e) => setNewArea(e.target.value)} />
              <button style={styles.button} onClick={addArea}>Dodaj obszar</button>
            </div>

            {selectedCaseAreas.length > 0 && (
              <>
                <div style={{ ...styles.row, marginTop: "0.8rem" }}>
                  <select style={styles.input} value={selectedAreaName} onChange={(e) => setSelectedAreaName(e.target.value)}>
                    <option value="">Wybierz obszar</option>
                    {selectedCaseAreas.map((areaName) => (
                      <option key={areaName} value={areaName}>{areaName}</option>
                    ))}
                  </select>
                  <input style={styles.input} placeholder="Ćwiczenie do obszaru" value={exerciseTitle} onChange={(e) => setExerciseTitle(e.target.value)} />
                  <button style={styles.button} onClick={addExerciseToArea}>Dodaj ćwiczenie</button>
                </div>
                {selectedAreaName && (
                  <div style={styles.helper}>
                    Ćwiczenia: {(selectedAreaExercises || []).length ? selectedAreaExercises.join(", ") : "brak"}
                  </div>
                )}
              </>
            )}
          </div>

          <div style={styles.card}>
            <h4 style={styles.sectionTitle}>Planowanie sesji do przodu</h4>
            <div style={styles.row}>
              <input style={styles.input} type="datetime-local" value={sessionDate} onChange={(e) => setSessionDate(e.target.value)} />
              <input style={styles.input} placeholder="Tytuł sesji" value={sessionTitle} onChange={(e) => setSessionTitle(e.target.value)} />
              <button style={styles.button} onClick={scheduleSession}>Zaplanuj</button>
            </div>
            <textarea style={{ ...styles.input, minHeight: 65, marginTop: "0.7rem" }} value={sessionNote} onChange={(e) => setSessionNote(e.target.value)} placeholder="Przebieg sesji (do szybkiego użycia przy DONE)" />
            <input style={{ ...styles.input, marginTop: "0.5rem" }} value={nextStep} onChange={(e) => setNextStep(e.target.value)} placeholder="Kolejny krok terapii" />
          </div>

          <div style={styles.card}>
            <h4 style={styles.sectionTitle}>Raport końcowy</h4>
            <button style={styles.button} onClick={generateReport}><FileText size={14} /> Generuj raport z pracy</button>
            <pre style={{ whiteSpace: "pre-wrap", fontSize: "0.8rem", marginTop: "0.75rem" }}>{reportPreview || "Brak raportu"}</pre>
          </div>
        </>
      )}
    </div>
  );
}
