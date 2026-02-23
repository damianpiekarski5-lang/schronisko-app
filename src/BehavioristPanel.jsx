import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Brain, CalendarDays, CheckCircle2, ClipboardList, Plus, Save, Search } from "lucide-react";

const API_URL = "/api/gs";
const TODO_STORAGE_KEY = "behaviorist-custom-tasks-v1";

const styles = {
  page: { minHeight: "100vh", backgroundColor: "#f9fafb", paddingBottom: "5rem" },
  header: {
    position: "sticky",
    top: 0,
    zIndex: 20,
    backgroundColor: "white",
    borderBottom: "1px solid #e5e7eb",
    padding: "0.9rem 1rem",
    boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
  },
  titleRow: { display: "flex", alignItems: "center", gap: "0.75rem", justifyContent: "space-between" },
  title: { margin: 0, fontSize: "1.1rem", fontWeight: 800, color: "#111827", display: "flex", alignItems: "center", gap: "0.5rem" },
  backButton: { border: "none", background: "#eff6ff", color: "#1d4ed8", borderRadius: "0.6rem", padding: "0.5rem 0.7rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.35rem" },
  content: { padding: "1rem" },
  card: { backgroundColor: "white", borderRadius: "0.9rem", padding: "0.9rem", boxShadow: "0 1px 3px rgba(0,0,0,0.08)", marginBottom: "0.9rem" },
  sectionTitle: { fontSize: "0.98rem", fontWeight: 800, color: "#111827", marginBottom: "0.65rem", display: "flex", alignItems: "center", gap: "0.45rem" },
  tabs: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginBottom: "0.65rem" },
  tab: { border: "1px solid #d1d5db", borderRadius: "0.65rem", padding: "0.5rem", background: "white", fontWeight: 700, color: "#374151" },
  tabActive: { background: "#dbeafe", borderColor: "#3b82f6", color: "#1e3a8a" },
  input: { width: "100%", border: "1px solid #d1d5db", borderRadius: "0.65rem", padding: "0.6rem 0.7rem", fontSize: "0.9rem", marginBottom: "0.5rem" },
  textarea: { width: "100%", border: "1px solid #d1d5db", borderRadius: "0.65rem", padding: "0.6rem 0.7rem", fontSize: "0.9rem", minHeight: "80px", marginBottom: "0.5rem" },
  row: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" },
  button: { border: "none", borderRadius: "0.65rem", padding: "0.6rem 0.75rem", fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "0.4rem" },
  primary: { backgroundColor: "#2563eb", color: "white" },
  success: { backgroundColor: "#16a34a", color: "white" },
  muted: { backgroundColor: "#f3f4f6", color: "#374151" },
  item: { border: "1px solid #e5e7eb", borderRadius: "0.65rem", padding: "0.6rem", marginBottom: "0.5rem" },
  itemTitle: { margin: "0 0 0.35rem", fontWeight: 700, color: "#111827" },
  badge: { fontSize: "0.72rem", padding: "0.2rem 0.45rem", borderRadius: "999px", background: "#fef3c7", color: "#92400e", marginRight: "0.4rem" },
  badgeBlue: { background: "#dbeafe", color: "#1e40af" },
  checkboxRow: { display: "flex", alignItems: "center", gap: "0.55rem", marginBottom: "0.35rem" },
  small: { color: "#6b7280", fontSize: "0.78rem" },
  alert: { background: "#fffbeb", border: "1px solid #fcd34d", color: "#92400e", borderRadius: "0.65rem", padding: "0.65rem", marginBottom: "0.7rem", fontSize: "0.82rem" },
};

function normalizeStatus(value) {
  const status = String(value || "").toLowerCase();
  if (["w trakcie", "in_progress", "in progress", "active", "accepted"].includes(status)) return "IN_PROGRESS";
  if (["done", "closed", "zamknięte", "completed"].includes(status)) return "DONE";
  return "NEW";
}

function parseDateOnly(value) {
  if (!value) return "";
  const raw = String(value);
  const date = new Date(raw);
  if (!Number.isNaN(date.getTime())) return date.toISOString().slice(0, 10);
  const match = raw.match(/(\d{4})-(\d{2})-(\d{2})/);
  return match ? match[0] : "";
}

const BehavioristPanel = ({ currentUser, dogs, onBack }) => {
  const [reports, setReports] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [activeList, setActiveList] = useState("new");
  const [reportSearch, setReportSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [customTasks, setCustomTasks] = useState([]);
  const [newTask, setNewTask] = useState("");
  const [planDraft, setPlanDraft] = useState({ reportId: "", dogId: "", goals: "", notes: "" });
  const [sessionDraft, setSessionDraft] = useState({ id: "", dogId: "", reportId: "", title: "Sesja behawioralna", plannedFor: "", goals: "", notes: "", status: "PLANNED" });

  const dogIndex = useMemo(() => {
    const map = new Map();
    dogs.forEach((dog) => map.set(String(dog.id || "").trim().toLowerCase(), dog));
    return map;
  }, [dogs]);

  const loadAdminData = async () => {
    if (!currentUser) return;
    setLoading(true);
    setMessage("");
    try {
      const token = await currentUser.getIdToken();
      const [reportsRes, sessionsRes] = await Promise.all([
        fetch(`${API_URL}?action=adminGetBehaviorReports`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}?action=adminGetSessions`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const reportsJson = await reportsRes.json();
      const sessionsJson = await sessionsRes.json();
      setReports(Array.isArray(reportsJson?.data) ? reportsJson.data : []);
      setSessions(Array.isArray(sessionsJson?.data) ? sessionsJson.data : []);
    } catch (error) {
      console.error(error);
      setMessage("Nie udało się załadować danych panelu.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
    const fromStorage = localStorage.getItem(TODO_STORAGE_KEY);
    if (fromStorage) {
      try {
        setCustomTasks(JSON.parse(fromStorage));
      } catch (_) {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(TODO_STORAGE_KEY, JSON.stringify(customTasks));
  }, [customTasks]);

  const reportsNormalized = useMemo(() => {
    return reports.map((report) => {
      const dog = dogIndex.get(String(report.dogId || report.id || "").trim().toLowerCase());
      return {
        ...report,
        id: report.id || report.reportId || `${report.timestamp || ""}-${report.dogId || ""}`,
        dogName: report.dogName || dog?.name || "Nieznany pies",
        dogId: report.dogId || dog?.id || "",
        box: report.box || dog?.box || "",
        pavilion: report.pavilion || dog?.pavilion || "",
        statusNorm: normalizeStatus(report.status || report.stage),
      };
    });
  }, [reports, dogIndex]);

  const filteredReports = useMemo(() => {
    const term = reportSearch.trim().toLowerCase();
    const targetStatus = activeList === "new" ? "NEW" : "IN_PROGRESS";
    return reportsNormalized.filter((report) => {
      if (report.statusNorm !== targetStatus) return false;
      if (!term) return true;
      return [report.dogName, report.dogId, report.box, report.pavilion, report.id]
        .map((entry) => String(entry || "").toLowerCase())
        .some((entry) => entry.includes(term));
    });
  }, [reportsNormalized, reportSearch, activeList]);

  const todayItems = useMemo(() => {
    const custom = customTasks
      .filter((task) => task.date === selectedDate)
      .map((task) => ({ ...task, type: "task" }));

    const planned = sessions
      .filter((session) => parseDateOnly(session.plannedFor || session.date) === selectedDate)
      .map((session) => ({
        id: session.id,
        title: session.title || `Sesja: ${session.dogName || session.dogId || "pies"}`,
        done: ["DONE", "COMPLETED"].includes(String(session.status || "").toUpperCase()),
        type: "session",
      }));

    return [...custom, ...planned];
  }, [customTasks, selectedDate, sessions]);

  const addTask = () => {
    if (!newTask.trim()) return;
    setCustomTasks((prev) => [...prev, { id: `task-${Date.now()}`, date: selectedDate, text: newTask.trim(), done: false }]);
    setNewTask("");
  };

  const toggleTask = (taskId) => {
    setCustomTasks((prev) => prev.map((task) => (task.id === taskId ? { ...task, done: !task.done } : task)));
  };

  const updateReportStatus = async (reportId, status) => {
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "adminUpdateBehaviorReport", reportId, id: reportId, status }),
      });
      const json = await response.json();
      if (!response.ok || json?.ok !== true) throw new Error(json?.error || "Błąd aktualizacji");
      setMessage("Status zgłoszenia został zaktualizowany.");
      await loadAdminData();
    } catch (error) {
      setMessage(String(error?.message || error));
    }
  };

  const saveWorkPlan = async () => {
    try {
      const token = await currentUser.getIdToken();
      const goals = planDraft.goals
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          action: "adminSaveWorkPlan",
          reportId: planDraft.reportId,
          dogId: planDraft.dogId,
          goals,
          notes: planDraft.notes,
        }),
      });
      const json = await response.json();
      if (!response.ok || json?.ok !== true) throw new Error(json?.error || "Nie udało się zapisać planu");
      setMessage("Plan pracy zapisany.");
      setPlanDraft({ reportId: "", dogId: "", goals: "", notes: "" });
    } catch (error) {
      setMessage(String(error?.message || error));
    }
  };

  const saveSession = async () => {
    try {
      const token = await currentUser.getIdToken();
      const payload = {
        action: "adminSaveSession",
        id: sessionDraft.id || undefined,
        reportId: sessionDraft.reportId || undefined,
        dogId: sessionDraft.dogId,
        title: sessionDraft.title,
        plannedFor: sessionDraft.plannedFor,
        goals: sessionDraft.goals,
        notes: sessionDraft.notes,
        status: sessionDraft.status,
      };
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const json = await response.json();
      if (!response.ok || json?.ok !== true) throw new Error(json?.error || "Nie udało się zapisać sesji");
      setMessage("Sesja zapisana.");
      setSessionDraft({ id: "", dogId: "", reportId: "", title: "Sesja behawioralna", plannedFor: "", goals: "", notes: "", status: "PLANNED" });
      await loadAdminData();
    } catch (error) {
      setMessage(String(error?.message || error));
    }
  };

  if (loading) return <div style={styles.page}><div style={styles.content}>Ładowanie panelu behawiorysty...</div></div>;

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div style={styles.titleRow}>
          <button onClick={onBack} style={styles.backButton}><ArrowLeft size={16} /> Powrót</button>
          <h1 style={styles.title}><Brain size={20} /> Centrum behawiorysty</h1>
        </div>
      </div>

      <div style={styles.content}>
        {message && <div style={styles.alert}>{message}</div>}

        <div style={styles.card}>
          <div style={styles.sectionTitle}><Search size={16} /> Zgłoszenia z panelu psa</div>
          <div style={styles.tabs}>
            <button style={{ ...styles.tab, ...(activeList === "new" ? styles.tabActive : {}) }} onClick={() => setActiveList("new")}>Nowe</button>
            <button style={{ ...styles.tab, ...(activeList === "progress" ? styles.tabActive : {}) }} onClick={() => setActiveList("progress")}>W trakcie</button>
            <button style={{ ...styles.tab, ...(activeList === "archive" ? styles.tabActive : {}) }} onClick={() => setActiveList("archive")}>Archiwum</button>
          </div>
          <input value={reportSearch} onChange={(e) => setReportSearch(e.target.value)} placeholder="Szukaj po imieniu, ID, boksie, pawilonie..." style={styles.input} />
          {filteredReports.map((report) => (
            <div style={styles.item} key={report.id}>
              <p style={styles.itemTitle}>{report.dogName} ({report.dogId || "brak ID"})</p>
              <div style={styles.small}>Pawilon {report.pavilion || "-"} / Boks {report.box || "-"}</div>
              <div style={{ marginTop: "0.35rem", marginBottom: "0.35rem" }}>
                <span style={styles.badge}>{report.priority || "Do konsultacji"}</span>
                {report.timestamp && <span style={{ ...styles.badge, ...styles.badgeBlue }}>{report.timestamp}</span>}
              </div>
              {report.reason && <div style={styles.small}>Powód: {report.reason}</div>}
              <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
                {report.statusNorm === "NEW" && <button style={{ ...styles.button, ...styles.primary }} onClick={() => updateReportStatus(report.id, "IN_PROGRESS")}>Przyjmij</button>}
                {report.statusNorm === "IN_PROGRESS" && <button style={{ ...styles.button, ...styles.success }} onClick={() => updateReportStatus(report.id, "DONE")}>Zakończ</button>}
                <button
                  style={{ ...styles.button, ...styles.muted }}
                  onClick={() => {
                    setPlanDraft({ reportId: report.id, dogId: report.dogId || "", goals: "", notes: "" });
                    setSessionDraft((prev) => ({ ...prev, reportId: report.id, dogId: report.dogId || prev.dogId }));
                  }}
                >Ustaw plan</button>
              </div>
            </div>
          ))}
          {!filteredReports.length && <div style={styles.small}>Brak pozycji na tej liście.</div>}
        </div>

        <div style={styles.card}>
          <div style={styles.sectionTitle}><ClipboardList size={16} /> Lista zadań na dzień</div>
          <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} style={styles.input} />
          <div style={styles.row}>
            <input value={newTask} onChange={(e) => setNewTask(e.target.value)} placeholder="Nowe zadanie..." style={{ ...styles.input, marginBottom: 0 }} />
            <button style={{ ...styles.button, ...styles.primary }} onClick={addTask}><Plus size={16} /> Dodaj</button>
          </div>
          <div style={{ marginTop: "0.6rem" }}>
            {todayItems.map((item) => (
              <label key={item.id} style={styles.checkboxRow}>
                <input type="checkbox" checked={!!item.done} onChange={() => item.type === "task" && toggleTask(item.id)} disabled={item.type === "session"} />
                <span style={{ textDecoration: item.done ? "line-through" : "none" }}>{item.title || item.text}</span>
                {item.type === "session" && <span style={styles.small}>(z planu sesji)</span>}
              </label>
            ))}
            {!todayItems.length && <div style={styles.small}>Brak zadań dla tej daty.</div>}
          </div>
        </div>

        <div style={styles.card}>
          <div style={styles.sectionTitle}><CheckCircle2 size={16} /> Plan pracy (cele)</div>
          <input value={planDraft.reportId} onChange={(e) => setPlanDraft((prev) => ({ ...prev, reportId: e.target.value }))} placeholder="ID zgłoszenia" style={styles.input} />
          <input value={planDraft.dogId} onChange={(e) => setPlanDraft((prev) => ({ ...prev, dogId: e.target.value }))} placeholder="ID psa" style={styles.input} />
          <textarea value={planDraft.goals} onChange={(e) => setPlanDraft((prev) => ({ ...prev, goals: e.target.value }))} placeholder="Cele pracy (każdy cel w nowej linii)" style={styles.textarea} />
          <textarea value={planDraft.notes} onChange={(e) => setPlanDraft((prev) => ({ ...prev, notes: e.target.value }))} placeholder="Notatki do planu" style={styles.textarea} />
          <button style={{ ...styles.button, ...styles.success, width: "100%" }} onClick={saveWorkPlan}><Save size={16} /> Zapisz plan</button>
        </div>

        <div style={styles.card}>
          <div style={styles.sectionTitle}><CalendarDays size={16} /> Planowanie i edycja sesji</div>
          <input value={sessionDraft.id} onChange={(e) => setSessionDraft((prev) => ({ ...prev, id: e.target.value }))} placeholder="ID sesji (uzupełnij, aby edytować)" style={styles.input} />
          <input value={sessionDraft.dogId} onChange={(e) => setSessionDraft((prev) => ({ ...prev, dogId: e.target.value }))} placeholder="ID psa" style={styles.input} />
          <input value={sessionDraft.reportId} onChange={(e) => setSessionDraft((prev) => ({ ...prev, reportId: e.target.value }))} placeholder="ID zgłoszenia" style={styles.input} />
          <input value={sessionDraft.title} onChange={(e) => setSessionDraft((prev) => ({ ...prev, title: e.target.value }))} placeholder="Tytuł sesji" style={styles.input} />
          <input type="datetime-local" value={sessionDraft.plannedFor} onChange={(e) => setSessionDraft((prev) => ({ ...prev, plannedFor: e.target.value }))} style={styles.input} />
          <textarea value={sessionDraft.goals} onChange={(e) => setSessionDraft((prev) => ({ ...prev, goals: e.target.value }))} placeholder="Cele sesji" style={styles.textarea} />
          <textarea value={sessionDraft.notes} onChange={(e) => setSessionDraft((prev) => ({ ...prev, notes: e.target.value }))} placeholder="Notatki" style={styles.textarea} />
          <button style={{ ...styles.button, ...styles.primary, width: "100%" }} onClick={saveSession}><Save size={16} /> Zapisz sesję</button>

          <div style={{ marginTop: "0.75rem" }}>
            {sessions.map((session) => (
              <div key={session.id || `${session.dogId}-${session.plannedFor}`} style={styles.item}>
                <p style={styles.itemTitle}>{session.title || "Sesja behawioralna"}</p>
                <div style={styles.small}>{session.dogId || "brak ID psa"} • {session.plannedFor || "bez terminu"}</div>
                <button
                  style={{ ...styles.button, ...styles.muted, marginTop: "0.4rem" }}
                  onClick={() => setSessionDraft({
                    id: session.id || "",
                    dogId: session.dogId || "",
                    reportId: session.reportId || "",
                    title: session.title || "Sesja behawioralna",
                    plannedFor: session.plannedFor || "",
                    goals: session.goals || "",
                    notes: session.notes || "",
                    status: session.status || "PLANNED",
                  })}
                >Edytuj</button>
              </div>
            ))}
            {!sessions.length && <div style={styles.small}>Brak zaplanowanych sesji.</div>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BehavioristPanel;
