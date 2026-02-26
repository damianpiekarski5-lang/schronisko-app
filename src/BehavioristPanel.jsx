import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Brain } from "lucide-react";

const API_URL = "/api/gs";
const SLOT_TYPES = [
  ...Array.from({ length: 6 }, (_, i) => ({ type: "WALK", slot: i + 1 })),
  ...Array.from({ length: 4 }, (_, i) => ({ type: "BOX", slot: i + 1 })),
];

const TYPE_LABEL = { WALK: "Spacer", BOX: "Praca w boksie" };
const STATUS_LABEL = { EMPTY: "Puste", PLANNED: "Zaplanowane", DONE: "Zakończone" };

const THERAPY_STATUS_OPTIONS = [
  ["THERAPY", "W terapii"],
  ["WAIT", "Oczekuje"],
  ["HOLD", "Wstrzymany"],
  ["ADOPTION_READY", "Gotowy do adopcji"],
];

const SESSION_STATUS_OPTIONS = [
  ["PLANNED", "Zaplanowana"],
  ["IN_PROGRESS", "W trakcie"],
  ["DONE", "Zakończona"],
  ["CANCELLED", "Anulowana"],
];

const styles = {
  page: { minHeight: "100vh", background: "#f9fafb", paddingBottom: "6rem" },
  header: {
    position: "sticky",
    top: 0,
    zIndex: 20,
    background: "white",
    borderBottom: "1px solid #e5e7eb",
    padding: "0.9rem 1rem",
  },
  titleRow: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem" },
  title: { margin: 0, fontSize: "1.1rem", fontWeight: 800, display: "flex", alignItems: "center", gap: "0.5rem" },
  backButton: {
    border: "none",
    background: "#eff6ff",
    color: "#1d4ed8",
    borderRadius: "0.6rem",
    padding: "0.5rem 0.7rem",
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    gap: "0.35rem",
  },
  content: { padding: "1rem" },
  tabs: { display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: "0.4rem", marginBottom: "0.8rem" },
  tab: { border: "1px solid #d1d5db", borderRadius: "0.6rem", background: "white", padding: "0.5rem", fontWeight: 700 },
  card: {
    background: "white",
    borderRadius: "0.9rem",
    padding: "0.9rem",
    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
    marginBottom: "0.75rem",
  },
  row: { display: "grid", gridTemplateColumns: "1fr auto", gap: "0.6rem", alignItems: "center" },
  col2: { display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: "0.6rem" },
  input: { width: "100%", border: "1px solid #d1d5db", borderRadius: "0.6rem", padding: "0.55rem" },
  textarea: { width: "100%", border: "1px solid #d1d5db", borderRadius: "0.6rem", padding: "0.55rem", minHeight: 90 },
  btn: { border: "none", borderRadius: "0.6rem", padding: "0.5rem 0.7rem", fontWeight: 700, cursor: "pointer" },
  muted: { color: "#6b7280", fontSize: 13 },
};

const fmtDate = (dateValue) => new Date(dateValue).toISOString().slice(0, 10);
const slotLabel = (slot) => `${TYPE_LABEL[slot.type] || slot.type} ${slot.slot}`;

async function apiGet(currentUser, action, params = {}) {
  const token = await currentUser.getIdToken();
  const query = new URLSearchParams({ action, ...params });
  const response = await fetch(`${API_URL}?${query.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await response.json();
  if (!json?.ok) throw new Error(json?.error || "Błąd");
  return json.data;
}

async function apiPost(currentUser, action, body = {}) {
  const token = await currentUser.getIdToken();
  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ action, ...body }),
  });
  const json = await response.json();
  if (!json?.ok) throw new Error(json?.error || "Błąd");
  return json.data;
}

function normalizeQuery(query) {
  return String(query || "").trim().toLowerCase();
}

function matchesDogByNameOrId(dogLike, query) {
  const q = normalizeQuery(query);
  if (!q) return true;
  return [dogLike?.id, dogLike?.DogID, dogLike?.dogId, dogLike?.name, dogLike?.dogName]
    .map((value) => String(value || "").toLowerCase())
    .some((value) => value.includes(q));
}

function DogSelect({ dogs, value, onChange, placeholder = "Wyszukaj psa po imieniu lub ID" }) {
  const [search, setSearch] = useState("");
  const visibleDogs = useMemo(() => dogs.filter((dog) => matchesDogByNameOrId(dog, search)).slice(0, 60), [dogs, search]);

  return (
    <div>
      <input
        style={styles.input}
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder={placeholder}
      />
      <select style={{ ...styles.input, marginTop: 6 }} value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">Wybierz psa</option>
        {visibleDogs.map((dog) => (
          <option key={dog.id} value={String(dog.id)}>
            {dog.name} ({dog.id})
          </option>
        ))}
      </select>
    </div>
  );
}

function BehavioristPanel({ currentUser, dogs, onBack }) {
  const [tab, setTab] = useState("requests");
  const [date, setDate] = useState(fmtDate(new Date()));
  const [dashboard, setDashboard] = useState({ slots: [] });
  const [week, setWeek] = useState([]);
  const [inbox, setInbox] = useState([]);
  const [toSchedule, setToSchedule] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [message, setMessage] = useState("");

  const [dogSearch, setDogSearch] = useState("");
  const [selectedDogId, setSelectedDogId] = useState("");
  const [dogCard, setDogCard] = useState(null);

  const [requestSearch, setRequestSearch] = useState("");
  const [sessionSearch, setSessionSearch] = useState("");
  const [weekSearchBySlot, setWeekSearchBySlot] = useState({});

  const [slotSessionModal, setSlotSessionModal] = useState(null);
  const [sessionEditor, setSessionEditor] = useState({
    id: "",
    reportId: "",
    dogId: "",
    title: "Sesja behawioralna",
    plannedFor: "",
    goals: "",
    notes: "",
    status: "PLANNED",
  });

  const dogsById = useMemo(() => Object.fromEntries(dogs.map((dog) => [String(dog.id), dog])), [dogs]);

  const runAction = async (handler, successMessage = "") => {
    try {
      setMessage("");
      await handler();
      if (successMessage) setMessage(successMessage);
    } catch (error) {
      setMessage(String(error?.message || error));
    }
  };

  const loadAll = async () => {
    await runAction(async () => {
      const [dayData, weekData, inboxData, scheduleData, sessionsData] = await Promise.all([
        apiGet(currentUser, "getBehavioristDashboard", { date }),
        apiGet(currentUser, "getWeekSchedule", { startDate: date, days: 7 }),
        apiGet(currentUser, "getTherapyInbox"),
        apiGet(currentUser, "getToSchedule", { date, windowDays: 7 }),
        apiGet(currentUser, "adminGetSessions"),
      ]);

      setDashboard(dayData || { slots: [] });
      setWeek(
        (weekData?.days || []).map((day) => ({
          ...day,
          byKey: Object.fromEntries((day.slots || []).map((slot) => [`${slot.type}-${slot.slot}`, slot])),
        }))
      );
      setInbox(inboxData || []);
      setToSchedule(scheduleData || []);
      setSessions(sessionsData || []);
    });
  };

  useEffect(() => {
    loadAll();
  }, [date]);

  useEffect(() => {
    if (!selectedDogId) {
      setDogCard(null);
      return;
    }
    runAction(async () => {
      const data = await apiGet(currentUser, "getTherapyDog", { dogId: selectedDogId });
      setDogCard(data);
    });
  }, [selectedDogId]);

  const filteredDogs = useMemo(() => dogs.filter((dog) => matchesDogByNameOrId(dog, dogSearch)), [dogs, dogSearch]);
  const filteredInbox = useMemo(
    () => inbox.filter((item) => matchesDogByNameOrId({ dogId: item.dogId, dogName: item.dogName }, requestSearch)),
    [inbox, requestSearch]
  );
  const filteredSessions = useMemo(
    () => sessions.filter((session) => matchesDogByNameOrId(session, sessionSearch)),
    [sessions, sessionSearch]
  );

  const openSessionEditor = (session) => {
    if (!session) {
      setSessionEditor({ id: "", reportId: "", dogId: "", title: "Sesja behawioralna", plannedFor: "", goals: "", notes: "", status: "PLANNED" });
      return;
    }
    setSessionEditor({
      id: session.id || "",
      reportId: session.reportId || "",
      dogId: session.dogId || "",
      title: session.title || "Sesja behawioralna",
      plannedFor: session.plannedFor || "",
      goals: session.goals || "",
      notes: session.notes || "",
      status: session.status || "PLANNED",
    });
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div style={styles.titleRow}>
          <button style={styles.backButton} onClick={onBack}>
            <ArrowLeft size={16} /> Powrót
          </button>
          <h2 style={styles.title}>
            <Brain size={18} /> Panel behawiorysty
          </h2>
        </div>
      </div>

      <div style={styles.content}>
        {!!message && <div style={{ ...styles.card, background: "#eff6ff", color: "#1e3a8a", marginBottom: "0.8rem" }}>{message}</div>}

        <div style={styles.card}>
          <label style={styles.muted}>Data startowa tygodnia</label>
          <input style={styles.input} type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </div>

        <div style={styles.tabs}>
          {[
            ["requests", "Zgłoszenia do pracy"],
            ["dog", "Karta psa"],
            ["sessions", "Sesje"],
            ["week", "Plan tygodnia"],
          ].map(([value, label]) => (
            <button
              key={value}
              style={{ ...styles.tab, background: tab === value ? "#dbeafe" : "white", borderColor: tab === value ? "#93c5fd" : "#d1d5db" }}
              onClick={() => setTab(value)}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "requests" && (
          <>
            <div style={styles.card}>
              <input
                style={styles.input}
                placeholder="Szukaj zgłoszeń po imieniu psa lub ID"
                value={requestSearch}
                onChange={(event) => setRequestSearch(event.target.value)}
              />
            </div>
            {filteredInbox.map((item) => (
              <div key={item.id} style={styles.card}>
                <div style={{ fontWeight: 800 }}>{item.dogName || "Nieznany pies"} ({item.dogId})</div>
                <div style={styles.muted}>Boks: {item.box || "-"} | Powód: {item.reason || "-"}</div>
                <div style={styles.muted}>Decyzja: {item.decision || "NOWE"}</div>
                <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                  {[["THERAPY", "Przyjmij do terapii"], ["WAIT", "Odłóż"], ["REJECTED", "Odrzuć"]].map(([value, label]) => (
                    <button
                      key={value}
                      style={{ ...styles.btn, background: "#e5e7eb" }}
                      onClick={() =>
                        runAction(async () => {
                          await apiPost(currentUser, "setTherapyDecision", { dogId: item.dogId, decision: value });
                          await loadAll();
                        }, "Zmieniono decyzję zgłoszenia.")
                      }
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            <div style={styles.card}>
              <div style={{ fontWeight: 800, marginBottom: 6 }}>Do zaplanowania</div>
              {toSchedule.length === 0 && <div style={styles.muted}>Brak pozycji.</div>}
              {toSchedule.map((item) => (
                <div key={item.DogID} style={{ marginBottom: 6 }}>
                  {item.DogID} | spacer do: {item.NextWalkDue || "-"} | boks do: {item.NextBoxDue || "-"}
                </div>
              ))}
            </div>
          </>
        )}

        {tab === "dog" && (
          <>
            <div style={styles.card}>
              <input
                style={styles.input}
                placeholder="Wyszukaj psa po imieniu lub ID"
                value={dogSearch}
                onChange={(event) => setDogSearch(event.target.value)}
              />
            </div>
            {filteredDogs.slice(0, 40).map((dog) => (
              <button
                key={dog.id}
                style={{ ...styles.card, width: "100%", textAlign: "left", border: "none" }}
                onClick={() => setSelectedDogId(String(dog.id))}
              >
                <div style={{ fontWeight: 700 }}>{dog.name} ({dog.id})</div>
                <div style={styles.muted}>Boks: {dog.kennel || "-"}</div>
              </button>
            ))}

            {selectedDogId && dogCard && (
              <div style={styles.card}>
                <div style={{ fontWeight: 800, marginBottom: 8 }}>Karta psa: {dogsById[selectedDogId]?.name || "Pies"} ({selectedDogId})</div>
                <select
                  style={styles.input}
                  value={dogCard.TherapyStatus || "WAIT"}
                  onChange={(event) => setDogCard((prev) => ({ ...prev, TherapyStatus: event.target.value }))}
                >
                  {THERAPY_STATUS_OPTIONS.map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
                <div style={{ ...styles.col2, marginTop: 8 }}>
                  <input style={styles.input} value={dogCard.Priority || 2} onChange={(event) => setDogCard((prev) => ({ ...prev, Priority: event.target.value }))} placeholder="Priorytet 1..3" />
                  <input style={styles.input} value={dogCard.WalkFreqDays || ""} onChange={(event) => setDogCard((prev) => ({ ...prev, WalkFreqDays: event.target.value }))} placeholder="Co ile dni spacer" />
                </div>
                <input style={{ ...styles.input, marginTop: 8 }} value={dogCard.BoxFreqDays || ""} onChange={(event) => setDogCard((prev) => ({ ...prev, BoxFreqDays: event.target.value }))} placeholder="Co ile dni boks" />
                <textarea style={{ ...styles.textarea, marginTop: 8 }} value={dogCard.WorkAreas || ""} onChange={(event) => setDogCard((prev) => ({ ...prev, WorkAreas: event.target.value }))} placeholder="Nad czym pracuje pies" />
                <textarea style={{ ...styles.textarea, marginTop: 8 }} value={dogCard.Exercises || ""} onChange={(event) => setDogCard((prev) => ({ ...prev, Exercises: event.target.value }))} placeholder="Jakie ćwiczenia robię (jedno na linię)" />
                <textarea style={{ ...styles.textarea, marginTop: 8 }} value={dogCard.NotesShort || ""} onChange={(event) => setDogCard((prev) => ({ ...prev, NotesShort: event.target.value }))} placeholder="Notatki skrócone" />
                <button
                  style={{ ...styles.btn, background: "#2563eb", color: "white", marginTop: 8 }}
                  onClick={() =>
                    runAction(async () => {
                      await apiPost(currentUser, "updateTherapyDog", {
                        dogId: selectedDogId,
                        therapyStatus: dogCard.TherapyStatus,
                        priority: Number(dogCard.Priority),
                        walkFreqDays: dogCard.WalkFreqDays,
                        boxFreqDays: dogCard.BoxFreqDays,
                        workAreas: dogCard.WorkAreas,
                        exercises: dogCard.Exercises,
                        notesShort: dogCard.NotesShort || "",
                      });
                      await loadAll();
                    }, "Zapisano kartę psa.")
                  }
                >
                  Zapisz kartę psa
                </button>
              </div>
            )}
          </>
        )}

        {tab === "sessions" && (
          <>
            <div style={styles.card}>
              <div style={{ fontWeight: 800, marginBottom: 8 }}>Zaplanowane dzisiaj</div>
              {dashboard.slots.map((slot) => (
                <div key={`${slot.type}-${slot.slot}`} style={{ borderTop: "1px solid #f1f5f9", paddingTop: 8, marginTop: 8 }}>
                  <div style={styles.row}>
                    <div>
                      <div style={{ fontWeight: 700 }}>{slotLabel(slot)}</div>
                      <div style={styles.muted}>{slot.dog ? `${slot.dog.name} (${slot.dog.id})` : "Brak przypisania"}</div>
                      <div style={styles.muted}>Status: {STATUS_LABEL[slot.status] || slot.status || "Puste"}</div>
                    </div>
                    <button
                      style={{ ...styles.btn, background: "#dbeafe", color: "#1d4ed8" }}
                      disabled={!slot.dogId}
                      onClick={() =>
                        runAction(async () => {
                          const therapyDog = await apiGet(currentUser, "getTherapyDog", { dogId: slot.dogId });
                          const exercises = String(therapyDog?.Exercises || "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
                          setSlotSessionModal({ slot, exercises, exercisesDone: [], note: "" });
                        })
                      }
                    >
                      Zapisz sesję
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div style={styles.card}>
              <div style={{ fontWeight: 800, marginBottom: 8 }}>
                {sessionEditor.id ? "Edycja sesji" : "Dodawanie sesji"}
              </div>
              <DogSelect dogs={dogs} value={sessionEditor.dogId} onChange={(dogId) => setSessionEditor((prev) => ({ ...prev, dogId }))} />
              <input style={{ ...styles.input, marginTop: 8 }} value={sessionEditor.title} onChange={(event) => setSessionEditor((prev) => ({ ...prev, title: event.target.value }))} placeholder="Tytuł sesji" />
              <div style={{ ...styles.col2, marginTop: 8 }}>
                <input style={styles.input} value={sessionEditor.reportId} onChange={(event) => setSessionEditor((prev) => ({ ...prev, reportId: event.target.value }))} placeholder="Powiązane zgłoszenie (opcjonalnie)" />
                <input style={styles.input} type="date" value={sessionEditor.plannedFor} onChange={(event) => setSessionEditor((prev) => ({ ...prev, plannedFor: event.target.value }))} />
              </div>
              <textarea style={{ ...styles.textarea, marginTop: 8 }} value={sessionEditor.goals} onChange={(event) => setSessionEditor((prev) => ({ ...prev, goals: event.target.value }))} placeholder="Cele sesji" />
              <textarea style={{ ...styles.textarea, marginTop: 8 }} value={sessionEditor.notes} onChange={(event) => setSessionEditor((prev) => ({ ...prev, notes: event.target.value }))} placeholder="Notatki z sesji" />
              <select style={{ ...styles.input, marginTop: 8 }} value={sessionEditor.status} onChange={(event) => setSessionEditor((prev) => ({ ...prev, status: event.target.value }))}>
                {SESSION_STATUS_OPTIONS.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button
                  style={{ ...styles.btn, background: "#2563eb", color: "white" }}
                  onClick={() =>
                    runAction(async () => {
                      await apiPost(currentUser, "adminSaveSession", sessionEditor);
                      openSessionEditor(null);
                      await loadAll();
                    }, sessionEditor.id ? "Zapisano zmiany sesji." : "Dodano nową sesję.")
                  }
                >
                  {sessionEditor.id ? "Zapisz zmiany" : "Dodaj sesję"}
                </button>
                {sessionEditor.id && (
                  <button style={{ ...styles.btn, background: "#e5e7eb" }} onClick={() => openSessionEditor(null)}>
                    Anuluj edycję
                  </button>
                )}
              </div>
            </div>

            <div style={styles.card}>
              <input
                style={styles.input}
                placeholder="Wyszukaj sesje po imieniu psa lub ID"
                value={sessionSearch}
                onChange={(event) => setSessionSearch(event.target.value)}
              />
              {filteredSessions.map((session) => (
                <div key={session.id} style={{ borderTop: "1px solid #f1f5f9", marginTop: 8, paddingTop: 8 }}>
                  <div style={styles.row}>
                    <div>
                      <div style={{ fontWeight: 700 }}>{session.title}</div>
                      <div style={styles.muted}>Pies: {dogsById[session.dogId]?.name || "Nieznany"} ({session.dogId})</div>
                      <div style={styles.muted}>Data: {session.plannedFor || "-"} | Status: {session.status}</div>
                    </div>
                    <button style={{ ...styles.btn, background: "#e5e7eb" }} onClick={() => openSessionEditor(session)}>Edytuj</button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === "week" && (
          <>
            {week.map((day) => (
              <div key={day.date} style={styles.card}>
                <div style={{ fontWeight: 800, marginBottom: 6 }}>{day.date}</div>
                {SLOT_TYPES.map((slotDef) => {
                  const key = `${slotDef.type}-${slotDef.slot}`;
                  const slot = day.byKey?.[key] || { date: day.date, ...slotDef, dogId: "", status: "EMPTY" };
                  const dog = dogsById[String(slot.dogId)];
                  const searchKey = `${day.date}|${key}`;
                  const visibleDogs = dogs.filter((item) => matchesDogByNameOrId(item, weekSearchBySlot[searchKey]));

                  return (
                    <div key={key} style={{ borderTop: "1px solid #f1f5f9", marginTop: 8, paddingTop: 8 }}>
                      <div style={{ fontWeight: 700 }}>{slotLabel(slotDef)}</div>
                      <div style={styles.muted}>Aktualnie: {dog ? `${dog.name} (${dog.id})` : "brak"}</div>
                      <input
                        style={{ ...styles.input, marginTop: 6 }}
                        value={weekSearchBySlot[searchKey] || ""}
                        onChange={(event) => setWeekSearchBySlot((prev) => ({ ...prev, [searchKey]: event.target.value }))}
                        placeholder="Wyszukaj psa po imieniu lub ID"
                      />
                      <div style={{ ...styles.row, marginTop: 6 }}>
                        <select
                          style={styles.input}
                          defaultValue=""
                          onChange={(event) =>
                            runAction(async () => {
                              const dogId = event.target.value;
                              if (!dogId) return;
                              await apiPost(currentUser, "setScheduleSlot", {
                                date: day.date,
                                type: slotDef.type,
                                slot: slotDef.slot,
                                dogId,
                              });
                              await loadAll();
                            }, "Zaktualizowano plan tygodnia.")
                          }
                        >
                          <option value="">Wybierz psa</option>
                          {visibleDogs.slice(0, 50).map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.name} ({item.id})
                            </option>
                          ))}
                        </select>
                        <button
                          style={{ ...styles.btn, background: "#f3f4f6" }}
                          onClick={() =>
                            runAction(async () => {
                              await apiPost(currentUser, "clearScheduleSlot", {
                                date: day.date,
                                type: slotDef.type,
                                slot: slotDef.slot,
                              });
                              await loadAll();
                            }, "Wyczyszczono slot.")
                          }
                        >
                          Wyczyść
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </>
        )}
      </div>

      {slotSessionModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(17,24,39,0.55)", padding: "1rem", zIndex: 100 }}>
          <div style={{ ...styles.card, margin: "4rem auto", maxWidth: 560 }}>
            <div style={{ fontWeight: 800, marginBottom: 8 }}>Zapis sesji: {slotLabel(slotSessionModal.slot)}</div>
            <div style={styles.muted}>
              {dogsById[String(slotSessionModal.slot.dogId)]?.name || "Nieznany pies"} ({slotSessionModal.slot.dogId})
            </div>
            <div style={{ marginTop: 8, marginBottom: 8 }}>
              {slotSessionModal.exercises.length > 0 ? (
                slotSessionModal.exercises.map((exercise) => (
                  <label key={exercise} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                    <input
                      type="checkbox"
                      checked={slotSessionModal.exercisesDone.includes(exercise)}
                      onChange={(event) =>
                        setSlotSessionModal((prev) => ({
                          ...prev,
                          exercisesDone: event.target.checked
                            ? [...prev.exercisesDone, exercise]
                            : prev.exercisesDone.filter((item) => item !== exercise),
                        }))
                      }
                    />
                    {exercise}
                  </label>
                ))
              ) : (
                <div style={styles.muted}>Brak zdefiniowanych ćwiczeń na karcie psa.</div>
              )}
            </div>
            <textarea
              style={styles.textarea}
              value={slotSessionModal.note}
              onChange={(event) => setSlotSessionModal((prev) => ({ ...prev, note: event.target.value }))}
              placeholder="Notatka z sesji"
            />
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button
                style={{ ...styles.btn, background: "#16a34a", color: "white" }}
                onClick={() =>
                  runAction(async () => {
                    await apiPost(currentUser, "completeSession", {
                      date: slotSessionModal.slot.date,
                      type: slotSessionModal.slot.type,
                      slot: slotSessionModal.slot.slot,
                      dogId: slotSessionModal.slot.dogId,
                      exercisesDone: slotSessionModal.exercisesDone,
                      note: slotSessionModal.note,
                    });
                    setSlotSessionModal(null);
                    await loadAll();
                  }, "Sesja została zapisana.")
                }
              >
                Zakończ i zapisz sesję
              </button>
              <button style={{ ...styles.btn, background: "#e5e7eb" }} onClick={() => setSlotSessionModal(null)}>
                Anuluj
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BehavioristPanel;
