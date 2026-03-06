import React, { useMemo, useState } from "react";
import { Shield, ClipboardList, Target, NotebookPen, Plus, Trash2, Home, MapPin, Star } from "lucide-react";

const API_URL = "/api/gs";

const sessionTagOptions = ["smycz", "reaktywność", "nosework", "relaks"];

const styles = {
  page: { minHeight: "100vh", backgroundColor: "#f9fafb", paddingBottom: "90px" },
  header: { backgroundColor: "white", borderBottom: "1px solid #e5e7eb", padding: "1rem" },
  title: { display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: "800", fontSize: "1.2rem", color: "#111827" },
  subtitle: { color: "#6b7280", fontSize: "0.875rem", marginTop: "0.35rem" },
  tabs: { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "0.5rem", padding: "1rem" },
  tabButton: { border: "1px solid #d1d5db", backgroundColor: "white", borderRadius: "0.65rem", padding: "0.7rem", fontWeight: "600", cursor: "pointer" },
  tabButtonActive: { backgroundColor: "#1d4ed8", borderColor: "#1d4ed8", color: "white" },
  card: { backgroundColor: "white", margin: "0 1rem 1rem", borderRadius: "0.9rem", border: "1px solid #e5e7eb", padding: "1rem" },
  input: { width: "100%", border: "1px solid #d1d5db", borderRadius: "0.6rem", padding: "0.65rem", fontSize: "0.9rem", marginBottom: "0.65rem" },
  textarea: { width: "100%", border: "1px solid #d1d5db", borderRadius: "0.6rem", padding: "0.65rem", fontSize: "0.9rem", minHeight: "90px", marginBottom: "0.65rem", fontFamily: "inherit" },
  button: { border: "none", borderRadius: "0.6rem", padding: "0.65rem 0.85rem", cursor: "pointer", fontWeight: "700", backgroundColor: "#2563eb", color: "white" },
  buttonSecondary: { border: "1px solid #d1d5db", backgroundColor: "white", color: "#374151" },
  item: { border: "1px solid #e5e7eb", borderRadius: "0.75rem", padding: "0.85rem", marginBottom: "0.75rem", cursor: "pointer" },
  helper: { fontSize: "0.8rem", color: "#6b7280", marginTop: "-0.3rem", marginBottom: "0.5rem" },
  messageOk: { color: "#166534", backgroundColor: "#dcfce7", borderRadius: "0.6rem", padding: "0.65rem", marginBottom: "0.75rem" },
  messageError: { color: "#991b1b", backgroundColor: "#fee2e2", borderRadius: "0.6rem", padding: "0.65rem", marginBottom: "0.75rem" },
  bottomNav: {
    position: "fixed",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "white",
    borderTop: "1px solid #e5e7eb",
    padding: "0.75rem 0.25rem",
    display: "flex",
    justifyContent: "space-around",
    alignItems: "center",
    zIndex: 100,
    boxShadow: "0 -2px 10px rgba(0,0,0,0.1)",
  },
  bottomNavButton: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "0.5rem",
    color: "#6b7280",
    fontSize: "0.75rem",
    minWidth: "60px",
    flex: 1,
  },
  bottomNavButtonActive: {
    color: "#2563eb",
    fontWeight: "600",
  },
};

async function postWithAuth(user, payload) {
  const token = await user.getIdToken();
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  return response.json();
}

const ReportsSection = ({ currentUser, dogs }) => {
  const [statusFilter, setStatusFilter] = useState("all");
  const [dogFilter, setDogFilter] = useState("");
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [saving, setSaving] = useState(false);

  const loadReports = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const result = await postWithAuth(currentUser, { action: "adminGetBehaviorReports" });
      if (result?.ok) {
        const rows = Array.isArray(result.data) ? result.data : result?.data?.reports || [];
        setReports(rows);
      } else {
        setMessage({ type: "error", text: result?.error || "Nie udało się pobrać zgłoszeń." });
      }
    } catch {
      setMessage({ type: "error", text: "Błąd połączenia podczas pobierania zgłoszeń." });
    } finally {
      setLoading(false);
    }
  };

  const filteredReports = useMemo(() => {
    const term = dogFilter.trim().toLowerCase();
    return [...reports]
      .filter((row) => {
        if (statusFilter !== "all" && (row.status || "new") !== statusFilter) return false;
        if (!term) return true;
        const dogName = String(row.dogName || "").toLowerCase();
        const dogId = String(row.dogId || "").toLowerCase();
        return dogName.includes(term) || dogId.includes(term);
      })
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }, [reports, statusFilter, dogFilter]);

  const saveDetails = async () => {
    if (!selectedReport?.id) return;
    setSaving(true);
    setMessage(null);

    try {
      const result = await postWithAuth(currentUser, {
        action: "adminUpdateBehaviorReport",
        reportId: selectedReport.id,
        status: selectedReport.status || "new",
        behavioristNote: selectedReport.behavioristNote || "",
      });

      if (result?.ok) {
        setMessage({ type: "ok", text: "Zapisano zmiany w zgłoszeniu." });
        setReports((prev) =>
          prev.map((item) => (item.id === selectedReport.id ? { ...item, ...selectedReport } : item))
        );
      } else {
        setMessage({ type: "error", text: result?.error || "Nie udało się zapisać zmian." });
      }
    } catch {
      setMessage({ type: "error", text: "Błąd połączenia podczas zapisu." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div style={styles.card}>
        {message && <div style={message.type === "ok" ? styles.messageOk : styles.messageError}>{message.text}</div>}
        <button style={{ ...styles.button, marginBottom: "0.75rem" }} onClick={loadReports}>
          Odśwież zgłoszenia
        </button>
        <select style={styles.input} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">Wszystkie statusy</option>
          <option value="new">new</option>
          <option value="in_progress">in_progress</option>
          <option value="done">done</option>
        </select>
        <input
          style={styles.input}
          placeholder="Filtruj psa po imieniu / ID"
          value={dogFilter}
          onChange={(e) => setDogFilter(e.target.value)}
        />
        {loading ? <p>Ładowanie...</p> : null}
        {filteredReports.map((report) => (
          <div key={report.id || `${report.dogId}-${report.createdAt}`} style={styles.item} onClick={() => setSelectedReport(report)}>
            <strong>{report.dogName || "Bez nazwy"}</strong> ({report.dogId || "brak ID"})
            <div style={{ fontSize: "0.85rem", color: "#6b7280", marginTop: "0.35rem" }}>
              {report.createdAt || "brak daty"} • {report.reporterEmail || report.reporterName || "brak zgłaszającego"}
            </div>
            <div style={{ marginTop: "0.35rem" }}>{report.reason || report.shortDescription || "Brak opisu"}</div>
          </div>
        ))}
      </div>

      {selectedReport && (
        <div style={styles.card}>
          <h3 style={{ marginBottom: "0.75rem" }}>Szczegóły zgłoszenia</h3>
          <p style={{ marginBottom: "0.65rem" }}>{selectedReport.description || selectedReport.incident3P || selectedReport.reason}</p>
          <select
            style={styles.input}
            value={selectedReport.status || "new"}
            onChange={(e) => setSelectedReport((prev) => ({ ...prev, status: e.target.value }))}
          >
            <option value="new">new</option>
            <option value="in_progress">in_progress</option>
            <option value="done">done</option>
          </select>
          <textarea
            style={styles.textarea}
            placeholder="Notatka behawiorysty (opcjonalnie)"
            value={selectedReport.behavioristNote || ""}
            onChange={(e) => setSelectedReport((prev) => ({ ...prev, behavioristNote: e.target.value }))}
          />
          <button style={styles.button} onClick={saveDetails} disabled={saving}>
            {saving ? "Zapisywanie..." : "Zapisz"}
          </button>
        </div>
      )}
    </div>
  );
};

const WorkPlansSection = ({ currentUser, dogs }) => {
  const [dogQuery, setDogQuery] = useState("");
  const [selectedDogId, setSelectedDogId] = useState("");
  const [goals, setGoals] = useState([""]);
  const [planStatus, setPlanStatus] = useState("active");
  const [message, setMessage] = useState(null);

  const filteredDogs = useMemo(() => {
    const term = dogQuery.trim().toLowerCase();
    return dogs.filter((dog) => !term || dog.name?.toLowerCase().includes(term) || dog.id?.toLowerCase().includes(term));
  }, [dogs, dogQuery]);

  const addGoal = () => setGoals((prev) => [...prev, ""]);
  const removeGoal = (index) => setGoals((prev) => prev.filter((_, i) => i !== index));

  const savePlan = async () => {
    setMessage(null);
    try {
      const result = await postWithAuth(currentUser, {
        action: "adminSaveWorkPlan",
        dogId: selectedDogId,
        goals: goals.filter((goal) => goal.trim()),
        status: planStatus,
      });

      if (result?.ok) {
        setMessage({ type: "ok", text: "Plan pracy zapisany." });
      } else {
        setMessage({ type: "error", text: result?.error || "Nie udało się zapisać planu." });
      }
    } catch {
      setMessage({ type: "error", text: "Błąd połączenia podczas zapisu planu." });
    }
  };

  return (
    <div style={styles.card}>
      {message && <div style={message.type === "ok" ? styles.messageOk : styles.messageError}>{message.text}</div>}
      <input
        style={styles.input}
        placeholder="Szukaj psa"
        value={dogQuery}
        onChange={(e) => setDogQuery(e.target.value)}
      />
      <select style={styles.input} value={selectedDogId} onChange={(e) => setSelectedDogId(e.target.value)}>
        <option value="">Wybierz psa</option>
        {filteredDogs.map((dog) => (
          <option key={dog.id} value={dog.id}>{dog.name} ({dog.id})</option>
        ))}
      </select>

      {goals.map((goal, index) => (
        <div key={`${index}-goal`} style={{ marginBottom: "0.75rem" }}>
          <input
            style={styles.input}
            placeholder={`Cel #${index + 1}`}
            value={goal}
            onChange={(e) => setGoals((prev) => prev.map((item, i) => (i === index ? e.target.value : item)))}
          />
          <div style={styles.helper}>Cel musi być mierzalny (reguła martwego psa).</div>
          <button style={{ ...styles.button, ...styles.buttonSecondary }} onClick={() => removeGoal(index)}>
            <Trash2 size={14} style={{ marginRight: "0.35rem" }} /> Usuń
          </button>
        </div>
      ))}

      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem" }}>
        <button style={{ ...styles.button, ...styles.buttonSecondary }} onClick={addGoal}>
          <Plus size={14} style={{ marginRight: "0.35rem" }} /> Dodaj cel
        </button>
        <select style={{ ...styles.input, marginBottom: 0 }} value={planStatus} onChange={(e) => setPlanStatus(e.target.value)}>
          <option value="active">aktywne</option>
          <option value="archived">archiwalne</option>
        </select>
      </div>

      <button style={styles.button} onClick={savePlan}>Zapisz plan pracy</button>
    </div>
  );
};

const SessionsSection = ({ currentUser, dogs }) => {
  const [selectedDogId, setSelectedDogId] = useState("");
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().slice(0, 16));
  const [note, setNote] = useState("");
  const [tags, setTags] = useState([]);
  const [result, setResult] = useState("bez zmian");
  const [sessions, setSessions] = useState([]);
  const [limit, setLimit] = useState(20);
  const [message, setMessage] = useState(null);

  const loadSessions = async (dogId = selectedDogId, nextLimit = limit) => {
    if (!dogId) return;
    setMessage(null);

    try {
      const response = await postWithAuth(currentUser, {
        action: "adminGetSessions",
        dogId,
        limit: nextLimit,
      });

      if (response?.ok) {
        const rows = Array.isArray(response.data) ? response.data : response?.data?.sessions || [];
        setSessions(rows);
      } else {
        setMessage({ type: "error", text: response?.error || "Nie udało się pobrać sesji." });
      }
    } catch {
      setMessage({ type: "error", text: "Błąd połączenia podczas pobierania sesji." });
    }
  };

  const toggleTag = (tag) => setTags((prev) => (prev.includes(tag) ? prev.filter((item) => item !== tag) : [...prev, tag]));

  const saveSession = async () => {
    setMessage(null);
    try {
      const response = await postWithAuth(currentUser, {
        action: "adminSaveSession",
        dogId: selectedDogId,
        date: new Date(sessionDate).toISOString(),
        note,
        tags,
        result,
      });

      if (response?.ok) {
        setMessage({ type: "ok", text: "Sesja zapisana." });
        setNote("");
        setTags([]);
        loadSessions(selectedDogId, limit);
      } else {
        setMessage({ type: "error", text: response?.error || "Nie udało się zapisać sesji." });
      }
    } catch {
      setMessage({ type: "error", text: "Błąd połączenia podczas zapisu sesji." });
    }
  };

  return (
    <div style={styles.card}>
      {message && <div style={message.type === "ok" ? styles.messageOk : styles.messageError}>{message.text}</div>}
      <select style={styles.input} value={selectedDogId} onChange={(e) => setSelectedDogId(e.target.value)}>
        <option value="">Wybierz psa</option>
        {dogs.map((dog) => (
          <option key={dog.id} value={dog.id}>{dog.name} ({dog.id})</option>
        ))}
      </select>
      <input type="datetime-local" style={styles.input} value={sessionDate} onChange={(e) => setSessionDate(e.target.value)} />
      <input style={styles.input} value={currentUser?.email || ""} readOnly />
      <textarea style={styles.textarea} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Notatka" />
      <div style={{ marginBottom: "0.75rem" }}>
        {sessionTagOptions.map((tag) => (
          <button
            key={tag}
            style={{
              ...styles.button,
              ...(tags.includes(tag) ? {} : styles.buttonSecondary),
              marginRight: "0.4rem",
              marginBottom: "0.4rem",
            }}
            onClick={() => toggleTag(tag)}
          >
            {tag}
          </button>
        ))}
      </div>
      <select style={styles.input} value={result} onChange={(e) => setResult(e.target.value)}>
        <option value="lepiej">lepiej</option>
        <option value="bez zmian">bez zmian</option>
        <option value="gorzej">gorzej</option>
      </select>
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <button style={styles.button} onClick={saveSession}>Dodaj sesję</button>
        <button style={{ ...styles.button, ...styles.buttonSecondary }} onClick={() => loadSessions(selectedDogId, limit)}>
          Pokaż sesje
        </button>
      </div>

      <div style={{ marginTop: "1rem" }}>
        {sessions.map((session, idx) => (
          <div key={session.id || `${session.date}-${idx}`} style={styles.item}>
            <strong>{session.date || "brak daty"}</strong> • {session.volunteerEmail || "brak wolontariusza"}
            <div>{session.note || "Brak notatki"}</div>
            <div style={{ color: "#6b7280", fontSize: "0.85rem" }}>{(session.tags || []).join(", ")} • {session.result || "-"}</div>
          </div>
        ))}
        {sessions.length >= limit && (
          <button
            style={{ ...styles.button, ...styles.buttonSecondary }}
            onClick={() => {
              const nextLimit = limit + 20;
              setLimit(nextLimit);
              loadSessions(selectedDogId, nextLimit);
            }}
          >
            Pokaż więcej
          </button>
        )}
      </div>
    </div>
  );
};

const AdminPanelView = ({ currentUser, dogs, setCurrentView }) => {
  const [tab, setTab] = useState("reports");

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div style={styles.title}><Shield size={20} /> Panel Behawiorysty</div>
        <p style={styles.subtitle}>Dostęp administracyjny dla: {currentUser?.email}</p>
      </div>

      <div style={styles.tabs}>
        <button style={{ ...styles.tabButton, ...(tab === "reports" ? styles.tabButtonActive : {}) }} onClick={() => setTab("reports")}> 
          <ClipboardList size={16} /> Zgłoszenia
        </button>
        <button style={{ ...styles.tabButton, ...(tab === "plans" ? styles.tabButtonActive : {}) }} onClick={() => setTab("plans")}> 
          <Target size={16} /> Plany pracy
        </button>
        <button style={{ ...styles.tabButton, ...(tab === "sessions" ? styles.tabButtonActive : {}) }} onClick={() => setTab("sessions")}> 
          <NotebookPen size={16} /> Sesje
        </button>
      </div>

      {tab === "reports" && <ReportsSection currentUser={currentUser} dogs={dogs} />}
      {tab === "plans" && <WorkPlansSection currentUser={currentUser} dogs={dogs} />}
      {tab === "sessions" && <SessionsSection currentUser={currentUser} dogs={dogs} />}

      <div style={styles.bottomNav}>
        <button style={styles.bottomNavButton} onClick={() => setCurrentView("home")}>
          <Home size={24} />
          <span style={{ marginTop: "0.25rem" }}>Home</span>
        </button>
        <button style={styles.bottomNavButton} onClick={() => setCurrentView("map")}>
          <MapPin size={24} />
          <span style={{ marginTop: "0.25rem" }}>Mapa</span>
        </button>
        <button style={styles.bottomNavButton} onClick={() => setCurrentView("myDogs")}>
          <Star size={24} />
          <span style={{ marginTop: "0.25rem" }}>Moje psy</span>
        </button>
        <button style={{ ...styles.bottomNavButton, ...styles.bottomNavButtonActive }}>
          <Shield size={24} />
          <span style={{ marginTop: "0.25rem" }}>Panel</span>
        </button>
      </div>
    </div>
  );
};

export default AdminPanelView;
