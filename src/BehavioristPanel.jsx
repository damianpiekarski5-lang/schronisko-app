import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Brain } from "lucide-react";

const API_URL = "/api/gs";
const SLOT_TYPES = [
  ...Array.from({ length: 6 }, (_, i) => ({ type: "WALK", slot: i + 1 })),
  ...Array.from({ length: 4 }, (_, i) => ({ type: "BOX", slot: i + 1 })),
];

const styles = {
  page: { minHeight: "100vh", backgroundColor: "#f9fafb", paddingBottom: "6rem" },
  header: { position: "sticky", top: 0, zIndex: 20, background: "white", borderBottom: "1px solid #e5e7eb", padding: "0.9rem 1rem" },
  titleRow: { display: "flex", alignItems: "center", justifyContent: "space-between" },
  title: { margin: 0, fontSize: "1.1rem", fontWeight: 800, display: "flex", alignItems: "center", gap: "0.5rem" },
  backButton: { border: "none", background: "#eff6ff", color: "#1d4ed8", borderRadius: "0.6rem", padding: "0.5rem 0.7rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.35rem" },
  content: { padding: "1rem" },
  tabs: { display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: "0.4rem", marginBottom: "0.8rem" },
  tab: { border: "1px solid #d1d5db", borderRadius: "0.6rem", background: "white", padding: "0.45rem", fontWeight: 700 },
  card: { background: "white", borderRadius: "0.9rem", padding: "0.9rem", boxShadow: "0 1px 3px rgba(0,0,0,0.08)", marginBottom: "0.75rem" },
  row: { display: "grid", gridTemplateColumns: "1fr auto", gap: "0.6rem", alignItems: "center" },
  input: { width: "100%", border: "1px solid #d1d5db", borderRadius: "0.6rem", padding: "0.55rem" },
  btn: { border: "none", borderRadius: "0.6rem", padding: "0.5rem 0.7rem", fontWeight: 700 },
};

const fmtDate = (d) => new Date(d).toISOString().slice(0, 10);
const label = (s) => `${s.type} ${s.slot}`;

async function apiGet(currentUser, action, params = {}) {
  const token = await currentUser.getIdToken();
  const query = new URLSearchParams({ action, ...params });
  const res = await fetch(`${API_URL}?${query.toString()}`, { headers: { Authorization: `Bearer ${token}` } });
  const json = await res.json();
  if (!json?.ok) throw new Error(json?.error || "Błąd");
  return json.data;
}

async function apiPost(currentUser, action, body = {}) {
  const token = await currentUser.getIdToken();
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ action, ...body }),
  });
  const json = await res.json();
  if (!json?.ok) throw new Error(json?.error || "Błąd");
  return json.data;
}

function TodayView({ dashboard, onOpenSession }) {
  return (
    <div>
      {dashboard.slots.map((slot) => (
        <div key={`${slot.type}-${slot.slot}`} style={styles.card}>
          <div style={styles.row}>
            <div>
              <div style={{ fontWeight: 800 }}>{label(slot)}</div>
              <div style={{ fontSize: 13, color: "#4b5563" }}>{slot.dog ? `${slot.dog.name} | ${slot.dog.id} | boks ${slot.dog.kennel}` : "Brak przypisania"}</div>
              <div style={{ fontSize: 12, color: "#6b7280" }}>Status: {slot.status || "PUSTE"}</div>
            </div>
            <button style={{ ...styles.btn, background: "#dbeafe", color: "#1d4ed8" }} onClick={() => onOpenSession(slot)} disabled={!slot.dogId}>Sesja</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function BehavioristPanel({ currentUser, dogs, onBack }) {
  const [tab, setTab] = useState("today");
  const [date, setDate] = useState(fmtDate(new Date()));
  const [dashboard, setDashboard] = useState({ slots: [] });
  const [week, setWeek] = useState([]);
  const [inbox, setInbox] = useState([]);
  const [toSchedule, setToSchedule] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedDogId, setSelectedDogId] = useState("");
  const [dogCard, setDogCard] = useState(null);
  const [sessionModal, setSessionModal] = useState(null);
  const [message, setMessage] = useState("");

  const dogsById = useMemo(() => Object.fromEntries(dogs.map((dog) => [String(dog.id), dog])), [dogs]);

  const loadAll = async () => {
    try {
      const [dayData, weekData, inboxData, scheduleData] = await Promise.all([
        apiGet(currentUser, "getBehavioristDashboard", { date }),
        apiGet(currentUser, "getWeekSchedule", { startDate: date, days: 7 }),
        apiGet(currentUser, "getTherapyInbox"),
        apiGet(currentUser, "getToSchedule", { date, windowDays: 1 }),
      ]);
      setDashboard(dayData || { slots: [] });
      setWeek((weekData?.days || []).map((d) => ({ ...d, byKey: Object.fromEntries(d.slots.map((s) => [`${s.type}-${s.slot}`, s])) })));
      setInbox(inboxData || []);
      setToSchedule(scheduleData || []);
    } catch (e) {
      setMessage(String(e.message || e));
    }
  };

  useEffect(() => { loadAll(); }, [date]);

  const filteredDogs = dogs.filter((dog) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return [dog.id, dog.kennel, dog.name].some((v) => String(v || "").toLowerCase().includes(q));
  });

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div style={styles.titleRow}><button style={styles.backButton} onClick={onBack}><ArrowLeft size={16} /> Powrót</button><h1 style={styles.title}><Brain size={20} /> Panel behawiorysty</h1></div>
      </div>
      <div style={styles.content}>
        {message ? <div style={styles.card}>{message}</div> : null}
        <div style={styles.tabs}>
          {[["today", "DZIŚ"], ["week", "PLAN"], ["inbox", "SKRZYNKA"], ["todo", "DO ZAPLAN."], ["dog", "KARTA PSA"]].map(([key, text]) => (
            <button key={key} style={{ ...styles.tab, ...(tab === key ? { background: "#dbeafe", borderColor: "#3b82f6" } : {}) }} onClick={() => setTab(key)}>{text}</button>
          ))}
        </div>

        {tab === "today" && <TodayView dashboard={dashboard} onOpenSession={(slot) => setSessionModal({ slot, exercisesDone: [], note: "" })} />}

        {tab === "week" && (
          <div>
            <div style={styles.card}><div style={styles.row}><input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={styles.input} /><button style={{ ...styles.btn, background: "#2563eb", color: "white" }} onClick={async () => { await apiPost(currentUser, "autoPlanWeek", { startDate: date, days: 7 }); loadAll(); }}>Ułóż tydzień</button></div></div>
            {SLOT_TYPES.map((slotDef) => (
              <div key={`${slotDef.type}-${slotDef.slot}`} style={styles.card}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>{label(slotDef)}</div>
                {week.map((day) => {
                  const slot = day.byKey[`${slotDef.type}-${slotDef.slot}`] || {};
                  const dog = dogsById[slot.dogId];
                  return (
                    <div key={`${day.date}-${slotDef.type}-${slotDef.slot}`} style={{ display: "grid", gridTemplateColumns: "120px 1fr auto auto", gap: 8, marginBottom: 6, alignItems: "center" }}>
                      <div>{day.date}</div>
                      <div style={{ fontSize: 13 }}>{dog ? `${dog.name} (${dog.id}, boks ${dog.kennel})` : "puste"}</div>
                      <input placeholder="ID psa" style={styles.input} onBlur={async (e) => { const dogId = e.target.value.trim(); if (!dogId) return; await apiPost(currentUser, "setScheduleSlot", { date: day.date, type: slotDef.type, slot: slotDef.slot, dogId }); loadAll(); }} />
                      <button style={{ ...styles.btn, background: "#f3f4f6" }} onClick={async () => { await apiPost(currentUser, "clearScheduleSlot", { date: day.date, type: slotDef.type, slot: slotDef.slot }); loadAll(); }}>Wyczyść</button>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}

        {tab === "inbox" && inbox.map((item) => (
          <div key={item.id} style={styles.card}>
            <div style={{ fontWeight: 700 }}>{item.dogName} ({item.dogId})</div><div style={{ fontSize: 13 }}>Boks: {item.box || "-"} | Decyzja: {item.decision}</div>
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>{[["THERAPY", "TERAPIA"], ["WAIT", "OCZEKUJE"], ["REJECTED", "ODRZUCONY"]].map(([value, label]) => <button key={value} style={{ ...styles.btn, background: "#e5e7eb" }} onClick={async () => { await apiPost(currentUser, "setTherapyDecision", { dogId: item.dogId, decision: value }); loadAll(); }}>{label}</button>)}</div>
          </div>
        ))}

        {tab === "todo" && toSchedule.map((dog) => <div key={dog.DogID} style={styles.card}>{dog.DogID} | spacer do: {dog.NextWalkDue || "-"} | boks do: {dog.NextBoxDue || "-"}</div>)}

        {tab === "dog" && (
          <div>
            <div style={styles.card}><input value={search} onChange={(e) => setSearch(e.target.value)} style={styles.input} placeholder="Szukaj po ID psa / boksie / imieniu" /></div>
            {filteredDogs.slice(0, 30).map((dog) => <div key={dog.id} style={styles.card} onClick={async () => { setSelectedDogId(dog.id); setDogCard(await apiGet(currentUser, "getTherapyDog", { dogId: dog.id })); }}>{dog.name} ({dog.id}) boks {dog.kennel}</div>)}
            {selectedDogId && dogCard ? (
              <div style={styles.card}>
                <div style={{ fontWeight: 800, marginBottom: 8 }}>Karta terapii: {selectedDogId}</div>
                <select value={dogCard.TherapyStatus || "WAIT"} style={styles.input} onChange={(e) => setDogCard((prev) => ({ ...prev, TherapyStatus: e.target.value }))}><option value="THERAPY">Terapia</option><option value="WAIT">Oczekuje</option><option value="HOLD">Wstrzymany</option><option value="ADOPTION_READY">Gotowy do adopcji</option></select>
                <input value={dogCard.Priority || 2} style={styles.input} onChange={(e) => setDogCard((p) => ({ ...p, Priority: e.target.value }))} placeholder="Priorytet 1..3" />
                <input value={dogCard.WalkFreqDays || ""} style={styles.input} onChange={(e) => setDogCard((p) => ({ ...p, WalkFreqDays: e.target.value }))} placeholder="Częstotliwość spacerów (dni)" />
                <input value={dogCard.BoxFreqDays || ""} style={styles.input} onChange={(e) => setDogCard((p) => ({ ...p, BoxFreqDays: e.target.value }))} placeholder="Częstotliwość pracy w boksie (dni)" />
                <textarea value={dogCard.WorkAreas || ""} style={{ ...styles.input, minHeight: 70 }} onChange={(e) => setDogCard((p) => ({ ...p, WorkAreas: e.target.value }))} placeholder="Obszary pracy" />
                <textarea value={dogCard.Exercises || ""} style={{ ...styles.input, minHeight: 90 }} onChange={(e) => setDogCard((p) => ({ ...p, Exercises: e.target.value }))} placeholder="Ćwiczenia (jedno na linię)" />
                <button style={{ ...styles.btn, background: "#2563eb", color: "white" }} onClick={async () => { await apiPost(currentUser, "updateTherapyDog", { dogId: selectedDogId, therapyStatus: dogCard.TherapyStatus, priority: Number(dogCard.Priority), walkFreqDays: dogCard.WalkFreqDays, boxFreqDays: dogCard.BoxFreqDays, workAreas: dogCard.WorkAreas, exercises: dogCard.Exercises, notesShort: dogCard.NotesShort || "" }); loadAll(); }}>Zapisz kartę</button>
              </div>
            ) : null}
          </div>
        )}

        {sessionModal ? (
          <div style={{ position: "fixed", inset: 0, background: "rgba(17,24,39,0.55)", padding: "1rem", zIndex: 100 }}>
            <div style={{ ...styles.card, margin: "4rem auto", maxWidth: 540 }}>
              <div style={{ fontWeight: 800, marginBottom: 8 }}>Sesja: {label(sessionModal.slot)}</div>
              {(String(dogsById[sessionModal.slot.dogId]?.name || "") + "\n" + String((dogCard?.DogID === sessionModal.slot.dogId ? dogCard.Exercises : "") || "")).split("\n").map((line, i) => line.trim()).filter(Boolean).map((line) => (
                <label key={line} style={{ display: "flex", gap: 8, marginBottom: 6 }}><input type="checkbox" onChange={(e) => setSessionModal((prev) => ({ ...prev, exercisesDone: e.target.checked ? [...prev.exercisesDone, line] : prev.exercisesDone.filter((x) => x !== line) }))} /> {line}</label>
              ))}
              <textarea style={{ ...styles.input, minHeight: 100 }} placeholder="Notatka" onChange={(e) => setSessionModal((p) => ({ ...p, note: e.target.value }))} />
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button style={{ ...styles.btn, background: "#16a34a", color: "white" }} onClick={async () => { await apiPost(currentUser, "completeSession", { date: sessionModal.slot.date, type: sessionModal.slot.type, slot: sessionModal.slot.slot, dogId: sessionModal.slot.dogId, exercisesDone: sessionModal.exercisesDone, note: sessionModal.note }); setSessionModal(null); loadAll(); }}>Zakończ</button>
                <button style={{ ...styles.btn, background: "#e5e7eb" }} onClick={() => setSessionModal(null)}>Anuluj</button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default BehavioristPanel;
