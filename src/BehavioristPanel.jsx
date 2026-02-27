import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Brain,
  CalendarDays,
  ClipboardList,
  FileText,
  PauseCircle,
  PlayCircle,
  Plus,
  Save,
  StopCircle,
} from "lucide-react";

const API_URL = "/api/gs";

const toISODate = (value = new Date()) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

const fromPLtoISO = (plDate) => {
  const [day, month, year] = String(plDate || "").split(".");
  if (!day || !month || !year) return "";
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
};

const fromISOtoPL = (isoDate) => {
  const [year, month, day] = String(isoDate || "").split("-");
  if (!day || !month || !year) return "";
  return `${day}.${month}.${year}`;
};

const style = {
  page: { padding: "1rem", paddingBottom: "6rem", background: "#f8fafc", minHeight: "100vh" },
  topBar: { display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" },
  backButton: { border: "none", background: "white", borderRadius: "0.7rem", padding: "0.55rem", cursor: "pointer" },
  title: { margin: 0, fontSize: "1.25rem", color: "#0f172a" },
  sub: { margin: "0.25rem 0 0", color: "#64748b", fontSize: "0.85rem" },
  tabs: { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "0.5rem", marginBottom: "1rem" },
  tab: { border: "1px solid #cbd5e1", background: "white", borderRadius: "0.65rem", padding: "0.6rem", fontWeight: 700, fontSize: "0.8rem", cursor: "pointer" },
  tabActive: { background: "#2563eb", color: "white", borderColor: "#2563eb" },
  card: { background: "white", borderRadius: "0.95rem", border: "1px solid #e2e8f0", padding: "1rem", marginBottom: "0.85rem" },
  dogHeader: { display: "grid", gridTemplateColumns: "70px 1fr", gap: "0.8rem" },
  photo: { width: "70px", height: "70px", borderRadius: "0.7rem", objectFit: "cover", background: "#e2e8f0" },
  actions: { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "0.4rem", marginTop: "0.85rem" },
  smallBtn: { border: "none", borderRadius: "0.55rem", padding: "0.45rem", fontSize: "0.75rem", fontWeight: 700, color: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.25rem" },
  input: { width: "100%", padding: "0.6rem", borderRadius: "0.55rem", border: "1px solid #cbd5e1", marginBottom: "0.55rem", fontSize: "0.9rem" },
  textarea: { width: "100%", minHeight: "75px", resize: "vertical", padding: "0.6rem", borderRadius: "0.55rem", border: "1px solid #cbd5e1", marginBottom: "0.55rem", fontSize: "0.9rem", fontFamily: "inherit" },
  addBtn: { width: "100%", border: "1px dashed #3b82f6", color: "#1d4ed8", borderRadius: "0.65rem", padding: "0.55rem", fontWeight: 700, background: "#eff6ff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem" },
  saveBtn: { width: "100%", border: "none", background: "#16a34a", color: "white", borderRadius: "0.65rem", padding: "0.65rem", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.35rem" },
  badge: { display: "inline-block", borderRadius: "999px", padding: "0.2rem 0.55rem", fontWeight: 700, fontSize: "0.72rem", background: "#e2e8f0", color: "#334155" },
  message: { borderRadius: "0.7rem", padding: "0.65rem", fontWeight: 700, marginBottom: "0.8rem", fontSize: "0.85rem" },
};

const BehavioristPanel = ({ currentUser, dogs, onBack }) => {
  const [tab, setTab] = useState("inbox");
  const [inbox, setInbox] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [activeDogId, setActiveDogId] = useState("");
  const [dogState, setDogState] = useState({});
  const [newSession, setNewSession] = useState({ title: "Sesja behawioralna", plannedFor: toISODate(), goals: "", notes: "", status: "PLANNED" });
  const [newPlan, setNewPlan] = useState({ workAreas: "", exercises: "", notesShort: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const dogsById = useMemo(() => Object.fromEntries((dogs || []).map((dog) => [String(dog.id || ""), dog])), [dogs]);
  const activeDog = dogsById[activeDogId] || null;

  const authHeaders = async () => {
    const token = await currentUser.getIdToken();
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
  };

  const fetchAdminGet = async (action, params = {}) => {
    const token = await currentUser.getIdToken();
    const query = new URLSearchParams({ action, ...params }).toString();
    const response = await fetch(`${API_URL}?${query}`, { headers: { Authorization: `Bearer ${token}` } });
    const result = await response.json();
    if (!response.ok || result?.ok !== true) throw new Error(result?.error || "Błąd odczytu danych");
    return result.data;
  };

  const fetchData = async () => {
    if (!currentUser) return;
    setError("");
    try {
      const [inboxData, sessionData] = await Promise.all([
        fetchAdminGet("getTherapyInbox"),
        fetchAdminGet("adminGetSessions"),
      ]);
      setInbox(Array.isArray(inboxData) ? inboxData : []);
      setSessions(Array.isArray(sessionData) ? sessionData : []);
    } catch (err) {
      setError(err.message || "Nie udało się pobrać danych panelu.");
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentUser]);

  const ensureDogLoaded = async (dogId) => {
    if (dogState[dogId]) return dogState[dogId];
    const data = await fetchAdminGet("getTherapyDog", { dogId });
    setDogState((prev) => ({ ...prev, [dogId]: data || {} }));
    return data;
  };

  const decide = async (entry, mode) => {
    setError("");
    setMessage("");
    try {
      const headers = await authHeaders();
      await fetch(API_URL, {
        method: "POST",
        headers,
        body: JSON.stringify({ action: "setTherapyDecision", dogId: entry.dogId, decision: "THERAPY" }),
      });

      const statusMap = { start: "THERAPY", pause: "HOLD", end: "ADOPTION_READY" };
      await fetch(API_URL, {
        method: "POST",
        headers,
        body: JSON.stringify({ action: "updateTherapyDog", dogId: entry.dogId, therapyStatus: statusMap[mode] }),
      });

      setMessage("Status pracy z psem został zapisany.");
      setActiveDogId(entry.dogId);
      await Promise.all([fetchData(), ensureDogLoaded(entry.dogId)]);
    } catch (err) {
      setError(err.message || "Nie udało się zmienić statusu.");
    }
  };

  const saveSession = async (session) => {
    if (!activeDogId) return;
    setError("");
    setMessage("");
    try {
      const headers = await authHeaders();
      const payload = {
        action: "adminSaveSession",
        id: session?.id,
        dogId: activeDogId,
        title: session?.title || "Sesja behawioralna",
        plannedFor: fromISOtoPL(session?.plannedFor || toISODate()),
        goals: session?.goals || "",
        notes: session?.notes || "",
        status: session?.status || "PLANNED",
      };
      const response = await fetch(API_URL, { method: "POST", headers, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok || result?.ok !== true) throw new Error(result?.error || "Błąd zapisu");
      setMessage("Sesja została zapisana.");
      setNewSession({ title: "Sesja behawioralna", plannedFor: toISODate(), goals: "", notes: "", status: "PLANNED" });
      await fetchData();
    } catch (err) {
      setError(err.message || "Nie udało się zapisać sesji.");
    }
  };

  const savePlan = async () => {
    if (!activeDogId) return;
    setError("");
    setMessage("");
    try {
      const headers = await authHeaders();
      const response = await fetch(API_URL, {
        method: "POST",
        headers,
        body: JSON.stringify({ action: "updateTherapyDog", dogId: activeDogId, ...newPlan }),
      });
      const result = await response.json();
      if (!response.ok || result?.ok !== true) throw new Error(result?.error || "Błąd zapisu planu");
      await ensureDogLoaded(activeDogId);
      setDogState((prev) => ({ ...prev, [activeDogId]: { ...(prev[activeDogId] || {}), ...newPlan } }));
      setMessage("Plan treningowy zapisany.");
    } catch (err) {
      setError(err.message || "Nie udało się zapisać planu.");
    }
  };

  const todayPL = fromISOtoPL(toISODate());
  const sessionsForDog = sessions
    .filter((item) => String(item.dogId || "") === String(activeDogId || ""))
    .map((item) => ({ ...item, isoDate: fromPLtoISO(item.plannedFor) || toISODate() }))
    .sort((a, b) => String(a.isoDate).localeCompare(String(b.isoDate)));

  const todayList = sessions
    .map((item) => ({ ...item, isoDate: fromPLtoISO(item.plannedFor) }))
    .filter((item) => item.isoDate === toISODate())
    .sort((a, b) => String(a.title).localeCompare(String(b.title)));

  const therapyStartDate = sessionsForDog[0]?.plannedFor || "";
  const therapyEndDate = (dogState[activeDogId]?.TherapyStatus || "") === "ADOPTION_READY" ? sessionsForDog[sessionsForDog.length - 1]?.plannedFor || "" : "obecnie";

  return (
    <div style={style.page}>
      <div style={style.topBar}>
        <button onClick={onBack} style={style.backButton}><ArrowLeft size={18} /></button>
        <div>
          <h1 style={style.title}>Panel behawiorysty</h1>
          <p style={style.sub}>Widoczny tylko dla konta damian.piekarski5@gmail.com</p>
        </div>
      </div>

      <div style={style.tabs}>
        <button style={{ ...style.tab, ...(tab === "inbox" ? style.tabActive : {}) }} onClick={() => setTab("inbox")}><ClipboardList size={14} /> Zgłoszenia</button>
        <button style={{ ...style.tab, ...(tab === "dogs" ? style.tabActive : {}) }} onClick={() => setTab("dogs")}><Brain size={14} /> Psy</button>
        <button style={{ ...style.tab, ...(tab === "today" ? style.tabActive : {}) }} onClick={() => setTab("today")}><CalendarDays size={14} /> Praca na dziś</button>
      </div>

      {message ? <div style={{ ...style.message, background: "#dcfce7", color: "#166534" }}>{message}</div> : null}
      {error ? <div style={{ ...style.message, background: "#fee2e2", color: "#991b1b" }}>{error}</div> : null}

      {tab === "inbox" && (
        <>
          {inbox.map((entry) => {
            const dog = dogsById[entry.dogId] || {};
            return (
              <div key={entry.id} style={style.card}>
                <div style={style.dogHeader}>
                  <img src={dog.photo || ""} alt={entry.dogName} style={style.photo} />
                  <div>
                    <div style={{ fontWeight: 800 }}>{entry.dogName || dog.name} ({entry.dogId})</div>
                    <div style={{ color: "#64748b", fontSize: "0.84rem", marginTop: "0.2rem" }}>{entry.reason || "Brak opisu zgłoszenia"}</div>
                    <div style={{ marginTop: "0.5rem" }}><span style={style.badge}>{entry.decision || "NEW"}</span></div>
                  </div>
                </div>
                <div style={style.actions}>
                  <button onClick={() => decide(entry, "start")} style={{ ...style.smallBtn, background: "#16a34a" }}><PlayCircle size={14} /> Start</button>
                  <button onClick={() => decide(entry, "pause")} style={{ ...style.smallBtn, background: "#f59e0b" }}><PauseCircle size={14} /> Wstrzymaj</button>
                  <button onClick={() => decide(entry, "end")} style={{ ...style.smallBtn, background: "#dc2626" }}><StopCircle size={14} /> Zakończ</button>
                </div>
              </div>
            );
          })}
          {!inbox.length && <div style={style.card}>Brak zgłoszeń w kolejce.</div>}
        </>
      )}

      {tab === "dogs" && (
        <>
          <div style={style.card}>
            <label style={{ fontWeight: 700, display: "block", marginBottom: "0.5rem" }}>Wybierz psa do karty pracy</label>
            <select
              value={activeDogId}
              onChange={async (event) => {
                const value = event.target.value;
                setActiveDogId(value);
                if (value) {
                  const data = await ensureDogLoaded(value);
                  setNewPlan({
                    workAreas: data?.WorkAreas || "",
                    exercises: data?.Exercises || "",
                    notesShort: data?.NotesShort || "",
                  });
                }
              }}
              style={style.input}
            >
              <option value="">-- wybierz --</option>
              {Object.values(dogsById).map((dog) => <option key={dog.id} value={dog.id}>{dog.name} ({dog.id})</option>)}
            </select>
          </div>

          {activeDog && (
            <div style={style.card}>
              <div style={style.dogHeader}>
                <img src={activeDog.photo || ""} alt={activeDog.name} style={style.photo} />
                <div>
                  <div style={{ fontWeight: 800, fontSize: "1rem" }}>{activeDog.name} ({activeDog.id})</div>
                  <div style={{ color: "#475569", fontSize: "0.83rem" }}>{activeDog.breed || "Brak rasy"}</div>
                  <div style={{ marginTop: "0.5rem" }}><span style={style.badge}>Status: {dogState[activeDogId]?.TherapyStatus || "WAIT"}</span></div>
                </div>
              </div>

              <h3 style={{ marginBottom: "0.6rem" }}>Dodaj sesję</h3>
              <input style={style.input} value={newSession.title} onChange={(e) => setNewSession((p) => ({ ...p, title: e.target.value }))} placeholder="Tytuł sesji" />
              <input style={style.input} type="date" value={newSession.plannedFor} onChange={(e) => setNewSession((p) => ({ ...p, plannedFor: e.target.value }))} />
              <textarea style={style.textarea} value={newSession.goals} onChange={(e) => setNewSession((p) => ({ ...p, goals: e.target.value }))} placeholder="Cele / plan pracy" />
              <textarea style={style.textarea} value={newSession.notes} onChange={(e) => setNewSession((p) => ({ ...p, notes: e.target.value }))} placeholder="Notatki po sesji" />
              <button style={style.addBtn} onClick={() => saveSession(newSession)}><Plus size={15} /> Dodaj sesję</button>

              <h3 style={{ margin: "1rem 0 0.6rem" }}>Zaplanuj trening</h3>
              <textarea style={style.textarea} value={newPlan.workAreas} onChange={(e) => setNewPlan((p) => ({ ...p, workAreas: e.target.value }))} placeholder="Obszary pracy" />
              <textarea style={style.textarea} value={newPlan.exercises} onChange={(e) => setNewPlan((p) => ({ ...p, exercises: e.target.value }))} placeholder="Ćwiczenia" />
              <textarea style={style.textarea} value={newPlan.notesShort} onChange={(e) => setNewPlan((p) => ({ ...p, notesShort: e.target.value }))} placeholder="Dodatkowe notatki" />
              <button style={style.saveBtn} onClick={savePlan}><Save size={15} /> Zapisz plan treningowy</button>

              <h3 style={{ margin: "1rem 0 0.6rem" }}>Historia sesji</h3>
              {sessionsForDog.map((session) => (
                <div key={session.id} style={{ border: "1px solid #e2e8f0", borderRadius: "0.6rem", padding: "0.65rem", marginBottom: "0.55rem" }}>
                  <input style={style.input} value={session.title} onChange={(e) => setSessions((prev) => prev.map((item) => item.id === session.id ? { ...item, title: e.target.value } : item))} />
                  <input
                    style={style.input}
                    type="date"
                    value={session.isoDate}
                    onChange={(e) => setSessions((prev) => prev.map((item) => item.id === session.id ? { ...item, isoDate: e.target.value, plannedFor: fromISOtoPL(e.target.value) } : item))}
                  />
                  <textarea style={style.textarea} value={session.goals || ""} onChange={(e) => setSessions((prev) => prev.map((item) => item.id === session.id ? { ...item, goals: e.target.value } : item))} />
                  <textarea style={style.textarea} value={session.notes || ""} onChange={(e) => setSessions((prev) => prev.map((item) => item.id === session.id ? { ...item, notes: e.target.value } : item))} />
                  <button style={style.saveBtn} onClick={() => saveSession(session)}><Save size={15} /> Zapisz zmiany sesji</button>
                </div>
              ))}

              {!!sessionsForDog.length && (
                <div style={{ marginTop: "1rem", borderTop: "1px solid #e2e8f0", paddingTop: "0.9rem" }}>
                  <h3 style={{ marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "0.4rem" }}><FileText size={17} /> Raport terapii</h3>
                  <div style={{ fontSize: "0.86rem", color: "#334155", whiteSpace: "pre-wrap" }}>
{`Imię psa / ID: ${activeDog.name} (${activeDog.id})
Okres terapii: ${therapyStartDate || "brak danych"} - ${therapyEndDate}
Powody (stwierdzone zaburzenia): ${dogState[activeDogId]?.WorkAreas || "do uzupełnienia"}
Osiągnięte efekty: ${dogState[activeDogId]?.NotesShort || "do uzupełnienia"}`}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {tab === "today" && (
        <>
          <div style={style.card}>
            <h3 style={{ marginTop: 0 }}>Praca na dziś ({todayPL})</h3>
            {todayList.map((session) => {
              const dog = dogsById[session.dogId] || {};
              return (
                <div key={session.id} style={{ border: "1px solid #e2e8f0", borderRadius: "0.65rem", padding: "0.65rem", marginBottom: "0.5rem" }}>
                  <div style={{ fontWeight: 800 }}>{session.title}</div>
                  <div style={{ color: "#475569", fontSize: "0.85rem" }}>{dog.name || "Nieznany pies"} ({session.dogId})</div>
                  <div style={{ color: "#64748b", fontSize: "0.82rem" }}>{session.notes || "Brak notatek"}</div>
                </div>
              );
            })}
            {!todayList.length && <div style={{ color: "#64748b" }}>Brak zaplanowanych sesji na dziś.</div>}
          </div>
        </>
      )}
    </div>
  );
};

export default BehavioristPanel;
