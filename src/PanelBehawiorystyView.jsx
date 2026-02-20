import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Plus, FileText, Calendar } from "lucide-react";

const API_URL = "/api/gs";

const styles = {
  page: { minHeight: "100vh", background: "#f9fafb", paddingBottom: "90px" },
  header: { position: "sticky", top: 0, zIndex: 100, background: "white", borderBottom: "1px solid #e5e7eb", padding: "1rem" },
  title: { margin: 0, fontSize: "1.2rem", fontWeight: 800 },
  row: { display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" },
  input: { flex: 1, minWidth: 110, padding: "0.65rem", border: "1px solid #d1d5db", borderRadius: "0.6rem" },
  button: { padding: "0.65rem 0.8rem", border: "none", borderRadius: "0.6rem", background: "#2563eb", color: "white", fontWeight: 600, cursor: "pointer" },
  card: { background: "white", margin: "0.8rem 1rem", borderRadius: "0.9rem", padding: "0.8rem", border: "1px solid #e5e7eb" },
  tabs: { display: "flex", gap: "0.35rem", overflowX: "auto", padding: "0 1rem" },
  tab: { padding: "0.55rem 0.7rem", borderRadius: "999px", border: "1px solid #d1d5db", background: "white", cursor: "pointer", whiteSpace: "nowrap" },
  activeTab: { background: "#dbeafe", borderColor: "#60a5fa" },
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
  const [selectedCase, setSelectedCase] = useState(null);
  const [tab, setTab] = useState("diagnoza");
  const [stageFilter, setStageFilter] = useState("");
  const [search, setSearch] = useState("");
  const [caseDraft, setCaseDraft] = useState({ dogId: "", title: "", priority: "MEDIUM" });
  const [diagnosisText, setDiagnosisText] = useState("");
  const [sessionNote, setSessionNote] = useState("");
  const [newArea, setNewArea] = useState("");
  const [goalsTitle, setGoalsTitle] = useState("");
  const [reportPreview, setReportPreview] = useState("");

  const dogById = useMemo(() => Object.fromEntries((dogs || []).map((d) => [d.id, d])), [dogs]);

  const loadCases = async () => {
    const data = await apiCall(currentUser, "cases.list", { stage: stageFilter, search, limit: 30, offset: 0 }, "GET");
    setCases(data.items || []);
  };

  const loadToday = async () => {
    const data = await apiCall(currentUser, "sessions.listToday", {}, "GET");
    setToday(data.items || []);
  };

  useEffect(() => {
    apiCall(currentUser, "behavior.init", {}).then(() => {
      loadCases();
      loadToday();
    });
  }, []);

  const openCase = async (item) => {
    setSelectedCase(item);
    const reports = await apiCall(currentUser, "reports.list", { caseId: item.id }, "GET");
    if (reports.items?.[0]) setReportPreview(reports.items[0].contentMarkdown || "");
  };

  const createCase = async () => {
    await apiCall(currentUser, "cases.create", caseDraft);
    setCaseDraft({ dogId: "", title: "", priority: "MEDIUM" });
    loadCases();
  };

  const addDiagnosis = async () => {
    await apiCall(currentUser, "diagnosis.addVersion", {
      caseId: selectedCase.id,
      data: { mainProblem: diagnosisText, createdBy: currentUser?.email || "" },
    });
    setDiagnosisText("");
    alert("Dodano wersję diagnozy");
  };

  const createPlanAndArea = async () => {
    const draft = await apiCall(currentUser, "plan.createDraft", { caseId: selectedCase.id, summary: "Plan pracy" });
    await apiCall(currentUser, "plan.activate", { planId: draft.id });
    if (newArea.trim()) {
      await apiCall(currentUser, "areas.create", { planId: draft.id, name: newArea, order: 1 });
      setNewArea("");
    }
    alert("Plan aktywowany");
  };

  const scheduleToday = async () => {
    const plannedFor = new Date().toISOString();
    await apiCall(currentUser, "sessions.createPlanned", {
      caseId: selectedCase.id,
      dogId: selectedCase.dogId,
      plannedFor,
      title: "Sesja terapeutyczna",
    });
    loadToday();
    alert("Sesja zaplanowana");
  };

  const markDone = async (sessionId) => {
    await apiCall(currentUser, "sessions.markDone", { sessionId, notes: sessionNote, overallTrend: "SAME" });
    await apiCall(currentUser, "sEntries.add", {
      sessionId,
      trend: "SAME",
      difficultyUsed: 2,
      metrics: [{ label: "czas", value: 300 }],
      nextStep: "Kontynuować krótkie serie",
    });
    setSessionNote("");
    loadToday();
  };

  const addGoal = async () => {
    await apiCall(currentUser, "goals.create", {
      caseId: selectedCase.id,
      title: goalsTitle,
      metricType: "COUNT",
      metricLabel: "Powtórzenia",
      metricTarget: "10",
    });
    setGoalsTitle("");
  };

  const generateReport = async () => {
    const report = await apiCall(currentUser, "reports.generateMarkdown", { caseId: selectedCase.id });
    setReportPreview(report.contentMarkdown || "");
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div style={styles.row}>
          <button style={{ ...styles.button, background: "#6b7280" }} onClick={() => setCurrentView("home")}><ArrowLeft size={16} /> Wróć</button>
          <h2 style={styles.title}>Panel Behawiorysty</h2>
        </div>
        <div style={{ ...styles.row, marginTop: "0.6rem" }}>
          <input style={styles.input} placeholder="Filtr stage" value={stageFilter} onChange={(e) => setStageFilter(e.target.value)} />
          <input style={styles.input} placeholder="Szukaj" value={search} onChange={(e) => setSearch(e.target.value)} />
          <button style={styles.button} onClick={loadCases}>Filtruj</button>
        </div>
      </div>

      <div style={styles.card}>
        <h4 style={{ marginTop: 0 }}>Dashboard "Dzisiaj" <Calendar size={14} /></h4>
        {(today || []).map((s) => (
          <div key={s.id} style={{ borderTop: "1px solid #eee", paddingTop: "0.5rem", marginTop: "0.5rem" }}>
            <div>{s.title || "Sesja"} • {dogById[s.dogId]?.name || s.dogId}</div>
            <button style={{ ...styles.button, marginTop: "0.4rem" }} onClick={() => markDone(s.id)}>Oznacz DONE</button>
          </div>
        ))}
      </div>

      <div style={styles.card}>
        <h4 style={{ marginTop: 0 }}>Nowa sprawa</h4>
        <div style={styles.row}>
          <input style={styles.input} placeholder="dogId" value={caseDraft.dogId} onChange={(e) => setCaseDraft((p) => ({ ...p, dogId: e.target.value }))} />
          <input style={styles.input} placeholder="Tytuł" value={caseDraft.title} onChange={(e) => setCaseDraft((p) => ({ ...p, title: e.target.value }))} />
          <button style={styles.button} onClick={createCase}><Plus size={15} /> Utwórz</button>
        </div>
      </div>

      <div style={styles.card}>
        <h4 style={{ marginTop: 0 }}>Lista spraw</h4>
        {(cases || []).map((item) => (
          <div key={item.id} onClick={() => openCase(item)} style={{ borderTop: "1px solid #eee", padding: "0.55rem 0", cursor: "pointer" }}>
            <strong>{item.title}</strong> • {dogById[item.dogId]?.name || item.dogId} • {item.stage}
          </div>
        ))}
      </div>

      {selectedCase && (
        <>
          <div style={styles.card}>
            <h3 style={{ marginTop: 0 }}>{dogById[selectedCase.dogId]?.name || selectedCase.dogId} — {selectedCase.title}</h3>
            <div style={styles.row}>
              <button style={styles.button} onClick={() => apiCall(currentUser, "cases.setStage", { id: selectedCase.id, stage: "DIAGNOSIS" }).then(loadCases)}>Etap DIAGNOSIS</button>
              <button style={styles.button} onClick={scheduleToday}>Zaplanuj sesję</button>
              <button style={styles.button} onClick={generateReport}><FileText size={14} /> Generuj raport</button>
            </div>
          </div>

          <div style={styles.tabs}>
            {[
              ["diagnoza", "Diagnoza"],
              ["plan", "Plan pracy"],
              ["sesje", "Sesje"],
              ["cele", "Cele"],
              ["raporty", "Raporty"],
            ].map(([key, label]) => (
              <button key={key} style={{ ...styles.tab, ...(tab === key ? styles.activeTab : {}) }} onClick={() => setTab(key)}>{label}</button>
            ))}
          </div>

          {tab === "diagnoza" && (
            <div style={styles.card}>
              <textarea style={{ ...styles.input, minHeight: 90 }} placeholder="Main problem" value={diagnosisText} onChange={(e) => setDiagnosisText(e.target.value)} />
              <button style={{ ...styles.button, marginTop: "0.6rem" }} onClick={addDiagnosis}>Dodaj wersję</button>
            </div>
          )}

          {tab === "plan" && (
            <div style={styles.card}>
              <input style={styles.input} placeholder="Nowy obszar (np. Luźna smycz)" value={newArea} onChange={(e) => setNewArea(e.target.value)} />
              <button style={{ ...styles.button, marginTop: "0.6rem" }} onClick={createPlanAndArea}>Draft → Active + obszar</button>
            </div>
          )}

          {tab === "sesje" && (
            <div style={styles.card}>
              <textarea style={{ ...styles.input, minHeight: 70 }} value={sessionNote} onChange={(e) => setSessionNote(e.target.value)} placeholder="Notatka dla DONE" />
            </div>
          )}

          {tab === "cele" && (
            <div style={styles.card}>
              <input style={styles.input} placeholder="Nowy cel" value={goalsTitle} onChange={(e) => setGoalsTitle(e.target.value)} />
              <button style={{ ...styles.button, marginTop: "0.6rem" }} onClick={addGoal}>Dodaj cel</button>
            </div>
          )}

          {tab === "raporty" && (
            <div style={styles.card}>
              <pre style={{ whiteSpace: "pre-wrap", fontSize: "0.8rem" }}>{reportPreview || "Brak raportu"}</pre>
            </div>
          )}
        </>
      )}
    </div>
  );
}
