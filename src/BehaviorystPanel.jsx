import React, { useState, useEffect, useCallback, useRef } from "react";
import { ArrowLeft, Plus, Trash2, ChevronDown, ChevronUp, CheckCircle, XCircle, MinusCircle, BookOpen, Dog, Calendar, RefreshCw, Search, UserPlus, LogOut } from "lucide-react";
import {
  collection, doc, getDocs, getDoc, setDoc, addDoc,
  updateDoc, deleteDoc, query, where, orderBy, serverTimestamp, Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";

const S = {
  page: { minHeight: "100vh", backgroundColor: "#f9fafb", paddingBottom: "80px" },
  header: { backgroundColor: "white", borderBottom: "1px solid #e5e7eb", position: "sticky", top: 0, zIndex: 100, padding: "1rem", display: "flex", alignItems: "center", gap: "0.75rem" },
  headerTitle: { fontSize: "1.2rem", fontWeight: "700", color: "#111827", flex: 1 },
  content: { padding: "1rem" },
  bottomNav: { position: "fixed", bottom: 0, left: 0, right: 0, backgroundColor: "white", borderTop: "1px solid #e5e7eb", padding: "0.75rem 0.25rem", display: "flex", justifyContent: "space-around", alignItems: "center", zIndex: 100 },
  navBtn: { display: "flex", flexDirection: "column", alignItems: "center", background: "none", border: "none", cursor: "pointer", padding: "0.5rem", color: "#6b7280", fontSize: "0.7rem", gap: "0.2rem", flex: 1 },
  navBtnActive: { color: "#7c3aed" },
  card: { backgroundColor: "white", borderRadius: "0.75rem", padding: "1rem", marginBottom: "0.75rem", border: "1px solid #e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" },
  cardClickable: { cursor: "pointer" },
  dogName: { fontSize: "1.05rem", fontWeight: "700", color: "#111827" },
  dogSub: { fontSize: "0.82rem", color: "#6b7280", marginTop: "0.2rem" },
  badge: { display: "inline-block", padding: "0.2rem 0.6rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: "600" },
  btn: { padding: "0.65rem 1.2rem", borderRadius: "0.75rem", border: "none", cursor: "pointer", fontSize: "0.9rem", fontWeight: "600" },
  btnPrimary: { backgroundColor: "#7c3aed", color: "white" },
  btnSecondary: { backgroundColor: "#f3f4f6", color: "#374151" },
  btnDanger: { backgroundColor: "#fee2e2", color: "#dc2626" },
  btnSmall: { padding: "0.4rem 0.8rem", fontSize: "0.8rem" },
  input: { width: "100%", padding: "0.65rem 0.75rem", borderRadius: "0.75rem", border: "1px solid #d1d5db", fontSize: "0.9rem", backgroundColor: "white", color: "#111827", boxSizing: "border-box" },
  textarea: { width: "100%", padding: "0.65rem 0.75rem", borderRadius: "0.75rem", border: "1px solid #d1d5db", fontSize: "0.9rem", backgroundColor: "white", color: "#111827", minHeight: "80px", resize: "vertical", boxSizing: "border-box" },
  select: { width: "100%", padding: "0.65rem 0.75rem", borderRadius: "0.75rem", border: "1px solid #d1d5db", fontSize: "0.9rem", backgroundColor: "white", color: "#111827", boxSizing: "border-box" },
  label: { fontSize: "0.82rem", fontWeight: "600", color: "#374151", marginBottom: "0.3rem", display: "block" },
  section: { marginBottom: "1.5rem" },
  sectionTitle: { fontSize: "1rem", fontWeight: "700", color: "#111827", marginBottom: "0.75rem" },
  row: { display: "flex", alignItems: "center", gap: "0.5rem" },
  divider: { height: "1px", backgroundColor: "#e5e7eb", margin: "1rem 0" },
  emptyState: { textAlign: "center", padding: "2rem 1rem", color: "#9ca3af" },
  stageBar: { display: "flex", gap: "0.25rem", alignItems: "center" },
  stageDot: { width: "20px", height: "20px", borderRadius: "50%", border: "2px solid #d1d5db", cursor: "pointer", transition: "all 0.15s" },
  stageDotActive: { backgroundColor: "#7c3aed", borderColor: "#7c3aed" },
  successSlider: { width: "100%", accentColor: "#7c3aed" },
  tabRow: { display: "flex", borderBottom: "2px solid #e5e7eb", marginBottom: "1rem" },
  tab: { padding: "0.6rem 1rem", fontSize: "0.9rem", fontWeight: "600", color: "#6b7280", background: "none", border: "none", cursor: "pointer", borderBottom: "2px solid transparent", marginBottom: "-2px" },
  tabActive: { color: "#7c3aed", borderBottomColor: "#7c3aed" },
  resultBtn: { flex: 1, padding: "0.5rem", borderRadius: "0.5rem", border: "2px solid #e5e7eb", cursor: "pointer", fontSize: "0.8rem", fontWeight: "600", background: "white", transition: "all 0.15s" },
};

const CATEGORIES = ["Komunikacja", "Spacer", "Przywołanie", "Relaks", "Samokontrola", "Socjalizacja", "Handling", "Węchowanie"];
const DIFFICULTIES = ["podstawowy", "średni", "zaawansowany"];
const RESULTS = [
  { key: "sukces", label: "✅ Sukces", color: "#dcfce7", border: "#16a34a" },
  { key: "częściowo", label: "🔶 Częściowo", color: "#fef9c3", border: "#ca8a04" },
  { key: "nieudane", label: "❌ Nieudane", color: "#fee2e2", border: "#dc2626" },
];

const PANEL_TABS = [
  { key: "dogs", label: "Psy", icon: "🐕" },
  { key: "today", label: "Dziś", icon: "📅" },
  { key: "library", label: "Biblioteka", icon: "📚" },
  { key: "report", label: "Raport", icon: "📊" },
];

function formatDate(ts) {
  if (!ts) return "—";
  const d = ts instanceof Timestamp ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function daysSince(ts) {
  if (!ts) return null;
  const d = ts instanceof Timestamp ? ts.toDate() : new Date(ts);
  return Math.floor((Date.now() - d.getTime()) / 86400000);
}

// ─── Firestore helpers ───────────────────────────────────────────────────────

async function fsGetExercises() {
  const snap = await getDocs(query(collection(db, "exercises"), orderBy("name")));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function fsGetPrograms() {
  const snap = await getDocs(query(collection(db, "programs"), orderBy("name")));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function fsGetDogTraining(dogId) {
  const ref = doc(db, "dogTraining", dogId);
  const snap = await getDoc(ref);
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

async function fsGetDogProgress(dogId) {
  const snap = await getDocs(collection(db, "dogTraining", dogId, "progress"));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function fsGetDogSessions(dogId) {
  const snap = await getDocs(
    query(collection(db, "dogTraining", dogId, "sessions"), orderBy("date", "desc"))
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function fsSaveDogTraining(dogId, data) {
  await setDoc(doc(db, "dogTraining", dogId), data, { merge: true });
}

async function fsSaveProgress(dogId, exerciseId, data) {
  await setDoc(doc(db, "dogTraining", dogId, "progress", exerciseId), data, { merge: true });
}

async function fsAddSession(dogId, session) {
  await addDoc(collection(db, "dogTraining", dogId, "sessions"), {
    ...session,
    date: serverTimestamp(),
  });
  await setDoc(doc(db, "dogTraining", dogId), { lastSessionDate: serverTimestamp() }, { merge: true });
}

async function fsAddExercise(data) {
  return addDoc(collection(db, "exercises"), { ...data, createdAt: serverTimestamp() });
}

async function fsUpdateExercise(id, data) {
  return updateDoc(doc(db, "exercises", id), data);
}

async function fsDeleteExercise(id) {
  return deleteDoc(doc(db, "exercises", id));
}

async function fsAddProgram(data) {
  return addDoc(collection(db, "programs"), { ...data, createdAt: serverTimestamp() });
}

async function fsUpdateProgram(id, data) {
  return updateDoc(doc(db, "programs", id), data);
}

async function fsDeleteProgram(id) {
  return deleteDoc(doc(db, "programs", id));
}

// Ćwiczenia przypisane bezpośrednio do psa — nie wymagają programu.
// Kolekcja: dogTraining/{dogId}/exercises/{autoId}
// Pole libraryId (opcjonalne) wskazuje ćwiczenie skopiowane z globalnej biblioteki.

async function fsGetDogExercises(dogId) {
  const snap = await getDocs(collection(db, "dogTraining", dogId, "exercises"));
  return snap.docs.map(d => ({ id: d.id, ...d.data(), _own: true }));
}

async function fsAddDogExercise(dogId, data) {
  return addDoc(collection(db, "dogTraining", dogId, "exercises"), {
    ...data,
    createdAt: serverTimestamp(),
  });
}

async function fsDeleteDogExercise(dogId, id) {
  return deleteDoc(doc(db, "dogTraining", dogId, "exercises", id));
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StageDots({ stage, onChange }) {
  return (
    <div style={S.stageBar}>
      {[1, 2, 3, 4, 5].map(n => (
        <div
          key={n}
          title={`Etap ${n}`}
          onClick={() => onChange(n)}
          style={{ ...S.stageDot, ...(n <= stage ? S.stageDotActive : {}), width: "18px", height: "18px" }}
        />
      ))}
      <span style={{ fontSize: "0.78rem", color: "#6b7280", marginLeft: "0.25rem" }}>Etap {stage}/5</span>
    </div>
  );
}

function ProgressCard({ exercise, progress, onUpdate, onDelete }) {
  const p = progress || { stage: 1, successRate: 0, notes: "" };
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [local, setLocal] = useState({ stage: p.stage || 1, successRate: p.successRate || 0, notes: p.notes || "" });

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdate(exercise.id, local);
      setOpen(false);
    } catch (e) {
      console.error("Błąd zapisu postępu:", e);
      alert("Nie udało się zapisać postępu — sprawdź połączenie i spróbuj ponownie.");
    } finally {
      setSaving(false);
    }
  };

  const successColor = local.successRate >= 80 ? "#16a34a" : local.successRate >= 50 ? "#ca8a04" : "#dc2626";

  return (
    <div style={{ ...S.card, marginBottom: "0.5rem" }}>
      <div style={{ ...S.row, justifyContent: "space-between" }} onClick={() => setOpen(o => !o)}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: "600", fontSize: "0.95rem", color: "#111827" }}>{exercise.name}</div>
          <div style={{ fontSize: "0.78rem", color: "#6b7280" }}>
            {exercise.category} · {exercise.difficulty}
            {!exercise._own && <span style={{ color: "#7c3aed" }}> · z programu</span>}
          </div>
          <div style={{ ...S.row, marginTop: "0.4rem", gap: "1rem" }}>
            <StageDots stage={local.stage} onChange={() => {}} />
            <span style={{ fontSize: "0.8rem", fontWeight: "700", color: successColor }}>{local.successRate}%</span>
          </div>
        </div>
        <div>{open ? <ChevronUp size={18} color="#6b7280" /> : <ChevronDown size={18} color="#6b7280" />}</div>
      </div>

      {open && (
        <div style={{ marginTop: "0.75rem", borderTop: "1px solid #f3f4f6", paddingTop: "0.75rem" }}>
          <label style={S.label}>Etap</label>
          <StageDots stage={local.stage} onChange={s => setLocal(l => ({ ...l, stage: s }))} />
          <div style={{ marginTop: "0.75rem" }}>
            <label style={S.label}>Skuteczność: {local.successRate}%</label>
            <input type="range" min="0" max="100" step="5" value={local.successRate}
              onChange={e => setLocal(l => ({ ...l, successRate: Number(e.target.value) }))}
              style={S.successSlider} />
          </div>
          <div style={{ marginTop: "0.75rem" }}>
            <label style={S.label}>Notatki</label>
            <textarea value={local.notes} onChange={e => setLocal(l => ({ ...l, notes: e.target.value }))}
              style={S.textarea} placeholder="Uwagi do ćwiczenia..." />
          </div>
          {exercise.description && (
            <div style={{ fontSize: "0.8rem", color: "#6b7280", marginTop: "0.5rem", fontStyle: "italic" }}>
              {exercise.description}
            </div>
          )}
          <button onClick={handleSave} disabled={saving}
            style={{ ...S.btn, ...S.btnPrimary, marginTop: "0.5rem", width: "100%", opacity: saving ? 0.6 : 1 }}>
            {saving ? "Zapisuję..." : "Zapisz postęp"}
          </button>
          {onDelete && (
            <button onClick={onDelete}
              style={{ ...S.btn, ...S.btnDanger, ...S.btnSmall, marginTop: "0.4rem", width: "100%" }}>
              Usuń ćwiczenie z psa
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function AddSessionModal({ dog, exList, onClose, onSave }) {
  const [results, setResults] = useState(() =>
    exList.map(e => ({ exerciseId: e.id, exerciseName: e.name, result: "", notes: "" }))
  );
  const [sessionNotes, setSessionNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const setResult = (idx, result) => setResults(r => r.map((item, i) => i === idx ? { ...item, result } : item));
  const setNotes = (idx, notes) => setResults(r => r.map((item, i) => i === idx ? { ...item, notes } : item));

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({ exercises: results, notes: sessionNotes });
      onClose();
    } catch (e) {
      console.error("Błąd zapisu sesji:", e);
      alert("Nie udało się zapisać sesji — sprawdź połączenie i spróbuj ponownie.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", zIndex: 200, display: "flex", alignItems: "flex-end" }}>
      <div style={{ backgroundColor: "white", borderRadius: "1rem 1rem 0 0", width: "100%", maxHeight: "90vh", overflowY: "auto", padding: "1.25rem" }}>
        <div style={{ ...S.row, justifyContent: "space-between", marginBottom: "1rem" }}>
          <h3 style={{ fontWeight: "700", fontSize: "1.1rem", margin: 0 }}>Nowa sesja — {dog.name}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.3rem", color: "#6b7280" }}>✕</button>
        </div>

        {exList.length === 0 ? (
          <p style={{ color: "#6b7280", textAlign: "center", padding: "1rem" }}>Brak ćwiczeń dla tego psa. Zamknij okno i dodaj ćwiczenie w zakładce Postępy.</p>
        ) : (
          exList.map((ex, idx) => (
            <div key={ex.id} style={{ ...S.card, marginBottom: "0.75rem" }}>
              <div style={{ fontWeight: "600", marginBottom: "0.5rem" }}>{ex.name}</div>
              <div style={{ display: "flex", gap: "0.4rem", marginBottom: "0.4rem" }}>
                {RESULTS.map(r => (
                  <button key={r.key} onClick={() => setResult(idx, r.key)}
                    style={{ ...S.resultBtn, backgroundColor: results[idx].result === r.key ? r.color : "white", borderColor: results[idx].result === r.key ? r.border : "#e5e7eb" }}>
                    {r.label}
                  </button>
                ))}
              </div>
              <input value={results[idx].notes} onChange={e => setNotes(idx, e.target.value)}
                placeholder="Notatka (opcjonalnie)" style={{ ...S.input, fontSize: "0.82rem" }} />
            </div>
          ))
        )}

        <div style={{ marginTop: "0.75rem" }}>
          <label style={S.label}>Notatki do sesji</label>
          <textarea value={sessionNotes} onChange={e => setSessionNotes(e.target.value)}
            style={S.textarea} placeholder="Ogólne uwagi..." />
        </div>
        <button onClick={handleSave} disabled={saving}
          style={{ ...S.btn, ...S.btnPrimary, width: "100%", marginTop: "0.75rem", opacity: saving ? 0.6 : 1 }}>
          {saving ? "Zapisuję..." : "Zapisz sesję"}
        </button>
      </div>
    </div>
  );
}

// ─── Dodawanie ćwiczenia z karty psa ─────────────────────────────────────────
// Dwie drogi: nowe ćwiczenie "szyte" pod psa albo szybkie wzięcie z biblioteki.
// W obu przypadkach powstaje dokument w dogTraining/{dogId}/exercises — program
// nie jest potrzebny.

function AddDogExerciseForm({ library, usedLibraryIds, onAdd, onClose }) {
  const [mode, setMode] = useState("new");
  const [form, setForm] = useState({ name: "", category: CATEGORIES[0], difficulty: DIFFICULTIES[0], description: "" });
  const [libId, setLibId] = useState("");
  const [saving, setSaving] = useState(false);

  const available = library.filter(e => !usedLibraryIds.has(e.id));

  const handleSave = async () => {
    setSaving(true);
    try {
      if (mode === "new") {
        if (!form.name.trim()) return;
        await onAdd({
          name: form.name.trim(),
          category: form.category,
          difficulty: form.difficulty,
          description: form.description.trim(),
        });
      } else {
        const src = library.find(e => e.id === libId);
        if (!src) return;
        await onAdd({
          name: src.name,
          category: src.category || CATEGORIES[0],
          difficulty: src.difficulty || DIFFICULTIES[0],
          description: src.description || "",
          libraryId: src.id,
        });
      }
      onClose();
    } catch (e) {
      console.error("Błąd dodawania ćwiczenia:", e);
      alert("Nie udało się dodać ćwiczenia — sprawdź połączenie i spróbuj ponownie.");
    } finally {
      setSaving(false);
    }
  };

  const canSave = mode === "new" ? !!form.name.trim() : !!libId;

  return (
    <div style={{ ...S.card, borderColor: "#c4b5fd", backgroundColor: "#faf5ff" }}>
      <div style={{ ...S.row, justifyContent: "space-between", marginBottom: "0.75rem" }}>
        <strong style={{ fontSize: "0.95rem" }}>Nowe ćwiczenie dla tego psa</strong>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.1rem", color: "#6b7280" }}>✕</button>
      </div>

      <div style={{ ...S.tabRow, marginBottom: "0.75rem" }}>
        {[["new", "Nowe"], ["library", `Z biblioteki (${available.length})`]].map(([k, l]) => (
          <button key={k} onClick={() => setMode(k)} style={{ ...S.tab, ...(mode === k ? S.tabActive : {}) }}>{l}</button>
        ))}
      </div>

      {mode === "new" ? (
        <>
          <label style={S.label}>Nazwa ćwiczenia</label>
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            style={S.input} placeholder="np. Chodzenie przy nodze bez szarpania" autoFocus />
          <div style={{ ...S.row, gap: "0.5rem", marginTop: "0.6rem" }}>
            <div style={{ flex: 1 }}>
              <label style={S.label}>Kategoria</label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} style={S.select}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={S.label}>Poziom</label>
              <select value={form.difficulty} onChange={e => setForm(f => ({ ...f, difficulty: e.target.value }))} style={S.select}>
                {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>
          <div style={{ marginTop: "0.6rem" }}>
            <label style={S.label}>Opis / sposób pracy (opcjonalnie)</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              style={{ ...S.textarea, minHeight: 70 }} placeholder="Na co zwracać uwagę u tego psa..." />
          </div>
        </>
      ) : available.length === 0 ? (
        <p style={{ color: "#6b7280", fontSize: "0.85rem", textAlign: "center", padding: "0.75rem" }}>
          Wszystkie ćwiczenia z biblioteki są już przypisane temu psu.
        </p>
      ) : (
        <>
          <label style={S.label}>Wybierz z biblioteki</label>
          <select value={libId} onChange={e => setLibId(e.target.value)} style={S.select}>
            <option value="">— wybierz ćwiczenie —</option>
            {available.map(e => (
              <option key={e.id} value={e.id}>{e.name} ({e.category})</option>
            ))}
          </select>
        </>
      )}

      <button onClick={handleSave} disabled={saving || !canSave}
        style={{ ...S.btn, ...S.btnPrimary, width: "100%", marginTop: "0.75rem", opacity: saving || !canSave ? 0.5 : 1 }}>
        {saving ? "Dodaję..." : "Dodaj ćwiczenie"}
      </button>
    </div>
  );
}

// ─── Dog Training View ────────────────────────────────────────────────────────

function DogTrainingView({ dog, programs, exercises, currentUser, onBack, onNavigate, onLogout }) {
  const [training, setTraining] = useState(null);
  const [progress, setProgress] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [dogExercises, setDogExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [tab, setTab] = useState("progress");
  const [showSession, setShowSession] = useState(false);
  const [savingProgram, setSavingProgram] = useState(false);
  const [showNote, setShowNote] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [showAddEx, setShowAddEx] = useState(false);
  const [showProgramPicker, setShowProgramPicker] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const doFetch = () => Promise.all([
      fsGetDogTraining(dog.id),
      fsGetDogProgress(dog.id),
      fsGetDogSessions(dog.id),
      fsGetDogExercises(dog.id),
    ]);
    try {
      let result;
      try {
        result = await doFetch();
      } catch (e) {
        if (e?.code !== 'permission-denied') throw e;
        await new Promise(r => setTimeout(r, 1500));
        result = await doFetch();
      }
      const [t, pr, ss, dex] = result;
      setTraining(t);
      setProgress(pr);
      setSessions(ss);
      setDogExercises(dex);
    } catch (e) {
      console.error("Błąd ładowania danych psa:", e);
      setLoadError(e?.code || e?.message || "Nieznany błąd");
    } finally {
      setLoading(false);
    }
  }, [dog.id]);

  useEffect(() => { load(); }, [load]);

  const assignedProgram = programs.find(p => p.id === training?.assignedProgramId);
  const programExercises = (assignedProgram?.exercises || [])
    .map(pe => ({ ...exercises.find(e => e.id === pe.exerciseId), _order: pe.order }))
    .filter(e => e?.id)
    .sort((a, b) => a._order - b._order);

  // Ćwiczenia psa + ćwiczenia z programu (jeśli przypisany). Pomijamy duplikat,
  // gdy to samo ćwiczenie z biblioteki weszło już przez program.
  const programIds = new Set(programExercises.map(e => e.id));
  const ownExercises = dogExercises.filter(e => !(e.libraryId && programIds.has(e.libraryId)));
  const allExercises = [...ownExercises, ...programExercises];

  // Blokuje ponowne wzięcie z biblioteki tego, co pies już ma.
  const usedLibraryIds = new Set([
    ...programIds,
    ...dogExercises.map(e => e.libraryId).filter(Boolean),
  ]);

  const handleAddDogExercise = async (data) => {
    // Dokument dogTraining musi istnieć, żeby pies trafiał do raportów.
    await fsSaveDogTraining(dog.id, {
      behavioristId: currentUser.uid,
      dogName: dog.name,
      status: training?.status || "in_progress",
      ...(training?.startedAt ? {} : { startedAt: serverTimestamp() }),
    });
    await fsAddDogExercise(dog.id, { ...data, createdBy: currentUser.uid });
    await load();
  };

  const handleDeleteDogExercise = async (exId, exName) => {
    if (!window.confirm(`Usunąć ćwiczenie "${exName}" z tego psa?\n\nHistoria sesji zostanie zachowana.`)) return;
    try {
      await fsDeleteDogExercise(dog.id, exId);
      await load();
    } catch (e) {
      console.error("Błąd usuwania ćwiczenia:", e);
      alert("Nie udało się usunąć ćwiczenia.");
    }
  };

  const handleAssignProgram = async (programId) => {
    setSavingProgram(true);
    try {
      await fsSaveDogTraining(dog.id, {
        behavioristId: currentUser.uid,
        dogName: dog.name,
        assignedProgramId: programId || null,
        status: "in_progress",
        // data rozpoczęcia pracy z psem — ustawiana raz, do raportów
        ...(training?.startedAt ? {} : { startedAt: serverTimestamp() }),
      });
      await load();
    } catch (e) {
      console.error("Błąd przypisania programu:", e);
      alert("Nie udało się przypisać programu — spróbuj ponownie.");
    } finally {
      setSavingProgram(false);
    }
  };

  const handleUpdateProgress = async (exerciseId, data) => {
    await fsSaveProgress(dog.id, exerciseId, {
      exerciseId,
      ...data,
      lastUpdated: serverTimestamp(),
    });
    await load();
  };

  const handleSaveSession = async (session) => {
    await fsAddSession(dog.id, session);
    // Update progress success rate based on session results
    for (const r of session.exercises) {
      if (!r.result) continue;
      const existing = progress.find(p => p.id === r.exerciseId);
      const count = (existing?.sessionsCount || 0) + 1;
      const prevSuccesses = Math.round(((existing?.successRate || 0) / 100) * (existing?.sessionsCount || 0));
      const newSuccesses = prevSuccesses + (r.result === "sukces" ? 1 : r.result === "częściowo" ? 0.5 : 0);
      const newRate = Math.round((newSuccesses / count) * 100);
      await fsSaveProgress(dog.id, r.exerciseId, {
        exerciseId: r.exerciseId,
        exerciseName: r.exerciseName,
        stage: existing?.stage || 1,
        successRate: newRate,
        sessionsCount: count,
        lastUpdated: serverTimestamp(),
      });
    }
    await load();
  };

  const days = daysSince(training?.lastSessionDate);

  return (
    <div style={S.page}>
      <div style={S.header}>
        <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", padding: "0.25rem" }}>
          <ArrowLeft size={22} color="#374151" />
        </button>
        <div style={{ flex: 1 }}>
          <div style={S.headerTitle}>{dog.name}</div>
          <div style={{ fontSize: "0.78rem", color: "#6b7280" }}>
            {dog.breed || dog.rasa || ""}{dog.pavilion ? ` · Paw. ${dog.pavilion}` : ""}
            {training?.lastSessionDate
              ? ` · Ostatnia sesja: ${days === 0 ? "dziś" : `${days} dni temu`}`
              : " · Brak sesji"}
          </div>
        </div>
        <button onClick={() => setShowSession(true)}
          style={{ ...S.btn, ...S.btnPrimary, ...S.btnSmall, display: "flex", alignItems: "center", gap: "0.3rem" }}>
          <Plus size={16} /> Sesja
        </button>
        {onLogout && (
          <button onClick={onLogout} style={{ background: "none", border: "none", cursor: "pointer", padding: "0.25rem", flexShrink: 0 }}>
            <LogOut size={20} color="#6b7280" />
          </button>
        )}
      </div>

      <div style={S.content}>
        {/* Plan sesji + notatka */}
        <div style={S.card}>
          <div style={{ ...S.row, gap: "0.75rem", flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 150 }}>
              <label style={S.label}>Następna sesja (plan)</label>
              <input
                type="date"
                value={training?.nextSessionDate || ""}
                onChange={async (e) => {
                  const v = e.target.value;
                  try {
                    await fsSaveDogTraining(dog.id, { nextSessionDate: v || null });
                    await load();
                  } catch (err) {
                    console.error("Błąd zapisu planu sesji:", err);
                    alert("Nie udało się zapisać planu sesji.");
                  }
                }}
                style={S.input}
              />
            </div>
            <button
              onClick={() => setShowNote(true)}
              style={{ ...S.btn, ...S.btnSecondary, ...S.btnSmall, alignSelf: "flex-end" }}
            >
              📝 Notatka
            </button>
          </div>
          {training?.nextSessionDate && training.nextSessionDate < new Date().toISOString().slice(0, 10) && (
            <div style={{ marginTop: "0.4rem", fontSize: "0.8rem", color: "#dc2626", fontWeight: 600 }}>
              ⚠️ Zaplanowana sesja zaległa ({formatDate(training.nextSessionDate)})
            </div>
          )}

          {/* Program jest opcjonalny — schowany, żeby nie sugerował, że trzeba go tworzyć */}
          <div style={{ marginTop: "0.75rem", borderTop: "1px solid #f3f4f6", paddingTop: "0.6rem" }}>
            {!showProgramPicker && !assignedProgram ? (
              <button onClick={() => setShowProgramPicker(true)}
                style={{ background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: "0.8rem", color: "#7c3aed", fontWeight: 600 }}>
                Użyj gotowego programu (opcjonalnie)
              </button>
            ) : (
              <>
                <label style={S.label}>Program treningowy (opcjonalnie)</label>
                <select value={training?.assignedProgramId || ""} onChange={e => handleAssignProgram(e.target.value)}
                  style={S.select} disabled={savingProgram}>
                  <option value="">— bez programu —</option>
                  {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                {assignedProgram?.description && (
                  <div style={{ fontSize: "0.8rem", color: "#6b7280", marginTop: "0.4rem" }}>{assignedProgram.description}</div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div style={S.tabRow}>
          {[["progress", "Postępy"], ["sessions", "Historia"]].map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)}
              style={{ ...S.tab, ...(tab === k ? S.tabActive : {}) }}>{l}</button>
          ))}
        </div>

        {loading ? (
          <div style={S.emptyState}>Ładowanie...</div>
        ) : loadError ? (
          <div style={{ textAlign: "center", padding: "1.5rem" }}>
            <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>⚠️</div>
            <div style={{ color: "#dc2626", fontWeight: "600", marginBottom: "0.25rem" }}>Błąd ładowania danych</div>
            <div style={{ fontSize: "0.82rem", color: "#6b7280", marginBottom: "1rem" }}>{loadError}</div>
            <button onClick={load} style={{ ...S.btn, ...S.btnPrimary }}>Spróbuj ponownie</button>
          </div>
        ) : tab === "progress" ? (
          <>
            {showAddEx ? (
              <AddDogExerciseForm
                library={exercises}
                usedLibraryIds={usedLibraryIds}
                onAdd={handleAddDogExercise}
                onClose={() => setShowAddEx(false)}
              />
            ) : (
              <button onClick={() => setShowAddEx(true)}
                style={{ ...S.btn, ...S.btnPrimary, width: "100%", marginBottom: "0.75rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem" }}>
                <Plus size={16} /> Dodaj ćwiczenie
              </button>
            )}

            {allExercises.length === 0 ? (
              <div style={S.emptyState}>
                <BookOpen size={32} style={{ margin: "0 auto 0.5rem", display: "block", opacity: 0.4 }} />
                <div>Brak ćwiczeń dla tego psa</div>
                <div style={{ fontSize: "0.82rem", marginTop: "0.25rem" }}>
                  Dodaj pierwsze ćwiczenie przyciskiem powyżej
                </div>
              </div>
            ) : (
              allExercises.map(ex => (
                <ProgressCard key={ex.id} exercise={ex}
                  progress={progress.find(p => p.id === ex.id)}
                  onUpdate={handleUpdateProgress}
                  onDelete={ex._own ? () => handleDeleteDogExercise(ex.id, ex.name) : null} />
              ))
            )}
          </>
        ) : (
          <>
            {sessions.length === 0 ? (
              <div style={S.emptyState}>Brak sesji treningowych</div>
            ) : (
              sessions.map(s => (
                <div key={s.id} style={S.card}>
                  <div style={{ ...S.row, justifyContent: "space-between", marginBottom: "0.4rem" }}>
                    <span style={{ fontWeight: "600", fontSize: "0.9rem" }}>{formatDate(s.date)}</span>
                    <span style={{ fontSize: "0.8rem", color: "#6b7280" }}>
                      {s.type === "note" || !s.exercises?.length ? "📝 Notatka" : `${s.exercises.length} ćwiczeń`}
                    </span>
                  </div>
                  {s.exercises?.map((e, i) => {
                    const res = RESULTS.find(r => r.key === e.result);
                    return (
                      <div key={i} style={{ ...S.row, justifyContent: "space-between", fontSize: "0.82rem", padding: "0.2rem 0" }}>
                        <span>{e.exerciseName}</span>
                        {res && <span style={{ color: res.border, fontWeight: "600" }}>{res.label}</span>}
                      </div>
                    );
                  })}
                  {s.notes && <div style={{ fontSize: "0.8rem", color: "#6b7280", marginTop: "0.4rem", fontStyle: "italic" }}>{s.notes}</div>}
                </div>
              ))
            )}
          </>
        )}
      </div>

      {showSession && (
        <AddSessionModal
          dog={dog}
          exList={allExercises}
          onClose={() => setShowSession(false)}
          onSave={handleSaveSession}
        />
      )}

      {showNote && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <div style={{ backgroundColor: "white", borderRadius: "1rem", padding: "1.25rem", width: "100%", maxWidth: 420 }}>
            <div style={{ fontWeight: 700, marginBottom: "0.6rem" }}>📝 Notatka — {dog.name}</div>
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              style={{ ...S.textarea, minHeight: 110 }}
              placeholder="Obserwacje, zachowanie, zalecenia..."
              autoFocus
            />
            <div style={{ ...S.row, marginTop: "0.75rem" }}>
              <button onClick={() => { setShowNote(false); setNoteText(""); }} style={{ ...S.btn, ...S.btnSecondary, flex: 1 }}>
                Anuluj
              </button>
              <button
                disabled={savingNote || !noteText.trim()}
                onClick={async () => {
                  setSavingNote(true);
                  try {
                    await fsAddSession(dog.id, { exercises: [], notes: noteText.trim(), type: "note" });
                    setShowNote(false);
                    setNoteText("");
                    await load();
                  } catch (e) {
                    console.error("Błąd zapisu notatki:", e);
                    alert("Nie udało się zapisać notatki.");
                  } finally {
                    setSavingNote(false);
                  }
                }}
                style={{ ...S.btn, ...S.btnPrimary, flex: 2, opacity: savingNote || !noteText.trim() ? 0.6 : 1 }}
              >
                {savingNote ? "Zapisuję..." : "Zapisz notatkę"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={S.bottomNav}>
        {PANEL_TABS.map(t => (
          <button key={t.key} onClick={() => onNavigate(t.key)}
            style={S.navBtn}>
            <span style={{ fontSize: "1.3rem" }}>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Library View ─────────────────────────────────────────────────────────────

function LibraryView({ exercises, programs, onExerciseAdded, onProgramAdded, currentUser }) {
  const [tab, setTab] = useState("exercises");
  const [showExForm, setShowExForm] = useState(false);
  const [showProgForm, setShowProgForm] = useState(false);
  const [editEx, setEditEx] = useState(null);
  const [editProg, setEditProg] = useState(null);
  const [saving, setSaving] = useState(false);

  // Exercise form state
  const emptyEx = { name: "", description: "", category: CATEGORIES[0], difficulty: DIFFICULTIES[0] };
  const [exForm, setExForm] = useState(emptyEx);

  // Program form state
  const emptyProg = { name: "", description: "", exercises: [] };
  const [progForm, setProgForm] = useState(emptyProg);

  const openEditEx = (ex) => { setEditEx(ex); setExForm({ name: ex.name, description: ex.description || "", category: ex.category || CATEGORIES[0], difficulty: ex.difficulty || DIFFICULTIES[0] }); setShowExForm(true); };
  const openEditProg = (p) => { setEditProg(p); setProgForm({ name: p.name, description: p.description || "", exercises: p.exercises || [] }); setShowProgForm(true); };

  const handleSaveEx = async () => {
    if (!exForm.name.trim()) return;
    setSaving(true);
    if (editEx) await fsUpdateExercise(editEx.id, exForm);
    else await fsAddExercise({ ...exForm, createdBy: currentUser.uid });
    setSaving(false);
    setShowExForm(false);
    setEditEx(null);
    setExForm(emptyEx);
    onExerciseAdded();
  };

  const handleDeleteEx = async (id) => {
    if (!window.confirm("Usunąć ćwiczenie?")) return;
    await fsDeleteExercise(id);
    onExerciseAdded();
  };

  const handleSaveProg = async () => {
    if (!progForm.name.trim()) return;
    setSaving(true);
    if (editProg) await fsUpdateProgram(editProg.id, progForm);
    else await fsAddProgram({ ...progForm, createdBy: currentUser.uid });
    setSaving(false);
    setShowProgForm(false);
    setEditProg(null);
    setProgForm(emptyProg);
    onProgramAdded();
  };

  const handleDeleteProg = async (id) => {
    if (!window.confirm("Usunąć program?")) return;
    await fsDeleteProgram(id);
    onProgramAdded();
  };

  const toggleExInProg = (exId) => {
    setProgForm(pf => {
      const exists = pf.exercises.find(e => e.exerciseId === exId);
      if (exists) return { ...pf, exercises: pf.exercises.filter(e => e.exerciseId !== exId) };
      return { ...pf, exercises: [...pf.exercises, { exerciseId: exId, order: pf.exercises.length + 1, reps: 3 }] };
    });
  };

  return (
    <div style={S.content}>
      <div style={S.tabRow}>
        {[["exercises", "Ćwiczenia"], ["programs", "Programy"]].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)}
            style={{ ...S.tab, ...(tab === k ? S.tabActive : {}) }}>{l}</button>
        ))}
      </div>

      {tab === "exercises" ? (
        <>
          <button onClick={() => { setEditEx(null); setExForm(emptyEx); setShowExForm(true); }}
            style={{ ...S.btn, ...S.btnPrimary, width: "100%", marginBottom: "1rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem" }}>
            <Plus size={18} /> Dodaj ćwiczenie
          </button>

          {showExForm && (
            <div style={{ ...S.card, border: "2px solid #7c3aed", marginBottom: "1rem" }}>
              <h3 style={{ margin: "0 0 0.75rem", fontWeight: "700" }}>{editEx ? "Edytuj ćwiczenie" : "Nowe ćwiczenie"}</h3>
              <label style={S.label}>Nazwa *</label>
              <input value={exForm.name} onChange={e => setExForm(f => ({ ...f, name: e.target.value }))} style={{ ...S.input, marginBottom: "0.5rem" }} placeholder="np. Siad, Przywołanie..." />
              <label style={S.label}>Kategoria</label>
              <select value={exForm.category} onChange={e => setExForm(f => ({ ...f, category: e.target.value }))} style={{ ...S.select, marginBottom: "0.5rem" }}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
              <label style={S.label}>Poziom trudności</label>
              <select value={exForm.difficulty} onChange={e => setExForm(f => ({ ...f, difficulty: e.target.value }))} style={{ ...S.select, marginBottom: "0.5rem" }}>
                {DIFFICULTIES.map(d => <option key={d}>{d}</option>)}
              </select>
              <label style={S.label}>Opis</label>
              <textarea value={exForm.description} onChange={e => setExForm(f => ({ ...f, description: e.target.value }))} style={{ ...S.textarea, marginBottom: "0.75rem" }} placeholder="Opis ćwiczenia..." />
              <div style={{ ...S.row, justifyContent: "flex-end", gap: "0.5rem" }}>
                <button onClick={() => { setShowExForm(false); setEditEx(null); }} style={{ ...S.btn, ...S.btnSecondary }}>Anuluj</button>
                <button onClick={handleSaveEx} disabled={saving} style={{ ...S.btn, ...S.btnPrimary, opacity: saving ? 0.6 : 1 }}>{saving ? "Zapisuję..." : "Zapisz"}</button>
              </div>
            </div>
          )}

          {exercises.length === 0 ? (
            <div style={S.emptyState}>Brak ćwiczeń — dodaj pierwsze</div>
          ) : (
            exercises.map(ex => (
              <div key={ex.id} style={S.card}>
                <div style={{ ...S.row, justifyContent: "space-between" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: "600" }}>{ex.name}</div>
                    <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>{ex.category} · {ex.difficulty}</div>
                    {ex.description && <div style={{ fontSize: "0.82rem", color: "#374151", marginTop: "0.25rem" }}>{ex.description}</div>}
                  </div>
                  <div style={{ ...S.row, gap: "0.4rem" }}>
                    <button onClick={() => openEditEx(ex)} style={{ ...S.btn, ...S.btnSecondary, ...S.btnSmall }}>✏️</button>
                    <button onClick={() => handleDeleteEx(ex.id)} style={{ ...S.btn, ...S.btnDanger, ...S.btnSmall }}>🗑️</button>
                  </div>
                </div>
              </div>
            ))
          )}
        </>
      ) : (
        <>
          <button onClick={() => { setEditProg(null); setProgForm(emptyProg); setShowProgForm(true); }}
            style={{ ...S.btn, ...S.btnPrimary, width: "100%", marginBottom: "1rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem" }}>
            <Plus size={18} /> Dodaj program
          </button>

          {showProgForm && (
            <div style={{ ...S.card, border: "2px solid #7c3aed", marginBottom: "1rem" }}>
              <h3 style={{ margin: "0 0 0.75rem", fontWeight: "700" }}>{editProg ? "Edytuj program" : "Nowy program"}</h3>
              <label style={S.label}>Nazwa *</label>
              <input value={progForm.name} onChange={e => setProgForm(f => ({ ...f, name: e.target.value }))} style={{ ...S.input, marginBottom: "0.5rem" }} placeholder="np. Program podstawowy..." />
              <label style={S.label}>Opis</label>
              <textarea value={progForm.description} onChange={e => setProgForm(f => ({ ...f, description: e.target.value }))} style={{ ...S.textarea, marginBottom: "0.75rem" }} placeholder="Opis programu..." />
              <label style={S.label}>Ćwiczenia w programie</label>
              {exercises.length === 0 ? (
                <p style={{ fontSize: "0.85rem", color: "#9ca3af" }}>Najpierw dodaj ćwiczenia w zakładce Ćwiczenia</p>
              ) : (
                <div style={{ border: "1px solid #e5e7eb", borderRadius: "0.5rem", overflow: "hidden", marginBottom: "0.75rem" }}>
                  {exercises.map(ex => {
                    const inProg = progForm.exercises.find(e => e.exerciseId === ex.id);
                    return (
                      <div key={ex.id} onClick={() => toggleExInProg(ex.id)}
                        style={{ ...S.row, padding: "0.6rem 0.75rem", borderBottom: "1px solid #f3f4f6", cursor: "pointer", backgroundColor: inProg ? "#f3e8ff" : "white" }}>
                        <div style={{ width: "20px", height: "20px", borderRadius: "4px", border: `2px solid ${inProg ? "#7c3aed" : "#d1d5db"}`, backgroundColor: inProg ? "#7c3aed" : "white", display: "flex", alignItems: "center", justifyContent: "center", marginRight: "0.6rem", flexShrink: 0 }}>
                          {inProg && <span style={{ color: "white", fontSize: "0.75rem" }}>✓</span>}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: "600", fontSize: "0.88rem" }}>{ex.name}</div>
                          <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>{ex.category} · {ex.difficulty}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <div style={{ ...S.row, justifyContent: "flex-end", gap: "0.5rem" }}>
                <button onClick={() => { setShowProgForm(false); setEditProg(null); }} style={{ ...S.btn, ...S.btnSecondary }}>Anuluj</button>
                <button onClick={handleSaveProg} disabled={saving} style={{ ...S.btn, ...S.btnPrimary, opacity: saving ? 0.6 : 1 }}>{saving ? "Zapisuję..." : "Zapisz"}</button>
              </div>
            </div>
          )}

          {programs.length === 0 ? (
            <div style={S.emptyState}>Brak programów — dodaj pierwszy</div>
          ) : (
            programs.map(p => (
              <div key={p.id} style={S.card}>
                <div style={{ ...S.row, justifyContent: "space-between", marginBottom: "0.4rem" }}>
                  <div style={{ fontWeight: "600" }}>{p.name}</div>
                  <div style={{ ...S.row, gap: "0.4rem" }}>
                    <button onClick={() => openEditProg(p)} style={{ ...S.btn, ...S.btnSecondary, ...S.btnSmall }}>✏️</button>
                    <button onClick={() => handleDeleteProg(p.id)} style={{ ...S.btn, ...S.btnDanger, ...S.btnSmall }}>🗑️</button>
                  </div>
                </div>
                {p.description && <div style={{ fontSize: "0.82rem", color: "#6b7280", marginBottom: "0.4rem" }}>{p.description}</div>}
                <div style={{ fontSize: "0.8rem", color: "#7c3aed", fontWeight: "600" }}>
                  {p.exercises?.length || 0} ćwiczeń
                </div>
              </div>
            ))
          )}
        </>
      )}
    </div>
  );
}

// ─── Manage Dogs Modal ────────────────────────────────────────────────────────

function ManageDogsModal({ allDogs, behaviorystDogs, onToggle, onClose }) {
  const [search, setSearch] = useState("");
  const [toggling, setToggling] = useState(null);
  const ids = new Set((behaviorystDogs || []).map(d => d.id));

  const filtered = allDogs.filter(d =>
    !search.trim() || (d.name || "").toLowerCase().includes(search.toLowerCase().trim())
  );

  const handleToggle = async (dogId) => {
    setToggling(dogId);
    await onToggle(dogId);
    setToggling(null);
  };

  return (
    <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", zIndex: 300, display: "flex", flexDirection: "column" }}>
      <div style={{ backgroundColor: "white", borderRadius: "1rem 1rem 0 0", marginTop: "auto", maxHeight: "85vh", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "1rem 1rem 0.75rem", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div style={{ fontWeight: "700", fontSize: "1.05rem", flex: 1 }}>Zarządzaj psami w pracy</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.3rem", color: "#6b7280" }}>✕</button>
        </div>
        <div style={{ padding: "0.75rem 1rem" }}>
          <div style={{ position: "relative" }}>
            <Search size={16} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Szukaj psa..."
              style={{ ...S.input, paddingLeft: "2.25rem" }}
              autoFocus
            />
          </div>
        </div>
        <div style={{ overflowY: "auto", padding: "0 1rem 1rem" }}>
          {filtered.length === 0 ? (
            <div style={S.emptyState}>Brak wyników</div>
          ) : (
            filtered.map(dog => {
              const inPanel = ids.has(dog.id);
              const isToggling = toggling === dog.id;
              return (
                <div key={dog.id} style={{ ...S.card, ...S.row, justifyContent: "space-between", marginBottom: "0.5rem", border: `1px solid ${inPanel ? "#7c3aed" : "#e5e7eb"}`, backgroundColor: inPanel ? "#faf5ff" : "white" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: "600", fontSize: "0.95rem" }}>{dog.name}</div>
                    <div style={{ fontSize: "0.78rem", color: "#6b7280" }}>
                      {dog.breed || dog.rasa || "—"} · Paw. {dog.pavilion || "?"} Boks {dog.box || "?"}
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggle(dog.id)}
                    disabled={isToggling}
                    style={{ ...S.btn, ...S.btnSmall, backgroundColor: inPanel ? "#ede9fe" : "#7c3aed", color: inPanel ? "#7c3aed" : "white", opacity: isToggling ? 0.5 : 1, whiteSpace: "nowrap" }}
                  >
                    {isToggling ? "..." : inPanel ? "Odłącz" : "Dołącz"}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Dogs Tab ─────────────────────────────────────────────────────────────────

function DogsTab({ dogs, trainings, onSelectDog, onManage }) {
  return (
    <div style={S.content}>
      <button
        onClick={onManage}
        style={{ ...S.btn, ...S.btnSecondary, width: "100%", marginBottom: "1rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}
      >
        <UserPlus size={16} /> Zarządzaj psami w pracy ({dogs.length})
      </button>
      {dogs.length === 0 ? (
        <div style={S.emptyState}>
          <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🐕</div>
          <div>Brak psów w pracy</div>
          <div style={{ fontSize: "0.82rem", marginTop: "0.25rem" }}>Naciśnij przycisk powyżej żeby dodać psy</div>
        </div>
      ) : (
        [...dogs].sort((a, b) => {
          const ta = trainings[a.id];
          const tb = trainings[b.id];
          const da = ta?.lastSessionDate ? (ta.lastSessionDate instanceof Timestamp ? ta.lastSessionDate.toDate() : new Date(ta.lastSessionDate)) : new Date(0);
          const db2 = tb?.lastSessionDate ? (tb.lastSessionDate instanceof Timestamp ? tb.lastSessionDate.toDate() : new Date(tb.lastSessionDate)) : new Date(0);
          return da - db2;
        }).map(dog => {
          const t = trainings[dog.id];
          const days = t?.lastSessionDate ? daysSince(t.lastSessionDate) : null;
          const urgent = days === null || days >= 7;
          return (
            <div key={dog.id} style={{ ...S.card, ...S.cardClickable, borderLeft: `4px solid ${urgent ? "#f97316" : "#7c3aed"}` }}
              onClick={() => onSelectDog(dog)}>
              <div style={{ ...S.row, justifyContent: "space-between" }}>
                <div style={{ flex: 1 }}>
                  <div style={S.dogName}>{dog.name}</div>
                  <div style={S.dogSub}>
                    {dog.breed || dog.rasa || "—"} · Paw. {dog.pavilion || "?"} Boks {dog.box || "?"}
                  </div>
                  {t?.assignedProgramId && (
                    <div style={{ fontSize: "0.78rem", color: "#7c3aed", marginTop: "0.2rem", fontWeight: "600" }}>
                      📋 Program przypisany
                    </div>
                  )}
                </div>
                <div style={{ textAlign: "right" }}>
                  {days === null ? (
                    <span style={{ ...S.badge, backgroundColor: "#fee2e2", color: "#dc2626" }}>Brak sesji</span>
                  ) : days === 0 ? (
                    <span style={{ ...S.badge, backgroundColor: "#dcfce7", color: "#16a34a" }}>Dziś</span>
                  ) : (
                    <span style={{ ...S.badge, backgroundColor: urgent ? "#fff7ed" : "#f3e8ff", color: urgent ? "#ea580c" : "#7c3aed" }}>
                      {days} dni temu
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

// ─── Today Tab ────────────────────────────────────────────────────────────────

function TodayTab({ dogs, trainings, onSelectDog }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().slice(0, 10);

  const dueDogs = dogs.filter(dog => {
    const t = trainings[dog.id];
    if (!t?.lastSessionDate) return true;
    const last = t.lastSessionDate instanceof Timestamp ? t.lastSessionDate.toDate() : new Date(t.lastSessionDate);
    return last < today;
  });

  // Psy z zaplanowaną sesją (na dziś lub zaległą) idą na górę listy.
  const planRank = (dog) => {
    const plan = trainings[dog.id]?.nextSessionDate;
    if (!plan) return 2;
    return plan <= todayStr ? 0 : 1;
  };
  dueDogs.sort((a, b) => planRank(a) - planRank(b));

  if (dueDogs.length === 0) {
    return (
      <div style={{ ...S.content, ...S.emptyState }}>
        <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>✅</div>
        <div>Wszystkie psy miały dziś trening!</div>
      </div>
    );
  }

  return (
    <div style={S.content}>
      <p style={{ fontSize: "0.85rem", color: "#6b7280", marginBottom: "0.75rem" }}>
        Psy bez sesji treningowej dzisiaj: <strong>{dueDogs.length}</strong>
      </p>
      {dueDogs.map(dog => {
        const t = trainings[dog.id];
        const days = t?.lastSessionDate ? daysSince(t.lastSessionDate) : null;
        const plan = t?.nextSessionDate;
        const planDue = plan && plan <= todayStr;
        return (
          <div key={dog.id} style={{ ...S.card, ...S.cardClickable, ...(planDue ? { borderLeft: "4px solid #7c3aed" } : {}) }} onClick={() => onSelectDog(dog)}>
            <div style={{ ...S.row, justifyContent: "space-between" }}>
              <div>
                <div style={S.dogName}>{dog.name}</div>
                <div style={S.dogSub}>{dog.breed || dog.rasa || "—"} · Paw. {dog.pavilion || "?"}</div>
                {plan && (
                  <div style={{ fontSize: "0.78rem", marginTop: "0.2rem", fontWeight: 600, color: planDue ? "#7c3aed" : "#6b7280" }}>
                    📅 {plan === todayStr ? "Zaplanowano na dziś" : planDue ? `Zaległa sesja (${formatDate(plan)})` : `Plan: ${formatDate(plan)}`}
                  </div>
                )}
              </div>
              <div>
                {days === null ? (
                  <span style={{ ...S.badge, backgroundColor: "#fee2e2", color: "#dc2626" }}>Brak sesji</span>
                ) : (
                  <span style={{ ...S.badge, backgroundColor: "#fff7ed", color: "#ea580c" }}>{days} dni temu</span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

// ─── Raport miesięczny ────────────────────────────────────────────────────────
// Zbiera dane wszystkich psów behawiorysty za wybrany miesiąc i renderuje
// raport gotowy do druku / zapisu jako PDF (window.print).

function tsToDate(ts) {
  if (!ts) return null;
  return ts instanceof Timestamp ? ts.toDate() : new Date(ts);
}

function ReportTab({ dogs, programs, currentUser }) {
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [report, setReport] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState("");

  const monthLabel = (m) =>
    new Date(m + "-01T12:00:00").toLocaleDateString("pl-PL", { month: "long", year: "numeric" });

  const generate = async () => {
    setGenerating(true);
    setGenError("");
    try {
      const rows = [];
      for (const dog of dogs) {
        const [training, progress, sessions] = await Promise.all([
          fsGetDogTraining(dog.id),
          fsGetDogProgress(dog.id),
          fsGetDogSessions(dog.id),
        ]);
        const dated = sessions
          .map((sess) => ({ ...sess, _d: tsToDate(sess.date) }))
          .filter((sess) => sess._d);
        const inMonth = dated.filter((sess) => {
          const k = `${sess._d.getFullYear()}-${String(sess._d.getMonth() + 1).padStart(2, "0")}`;
          return k === month;
        }).sort((a, b) => a._d - b._d);
        const firstEver = dated.length ? dated.reduce((a, b) => (a._d < b._d ? a : b))._d : null;
        const startedAt = tsToDate(training?.startedAt) || firstEver;
        const program = programs.find((pr) => pr.id === training?.assignedProgramId);
        rows.push({
          dog,
          program,
          startedAt,
          progress: progress || [],
          sessionsInMonth: inMonth,
          totalSessions: dated.length,
        });
      }
      setReport({ month, rows, generatedAt: new Date() });
    } catch (e) {
      console.error("Błąd generowania raportu:", e);
      setGenError("Nie udało się wygenerować raportu — sprawdź połączenie i spróbuj ponownie.");
    } finally {
      setGenerating(false);
    }
  };

  const resultLabel = (r) =>
    r === "sukces" ? "✔ sukces" : r === "częściowo" ? "◐ częściowo" : r === "nieudane" ? "✘ nieudane" : "";

  return (
    <div style={S.content}>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #behav-report, #behav-report * { visibility: visible; }
          #behav-report { position: absolute; left: 0; top: 0; width: 100%; padding: 0 !important; }
          .report-dog { break-inside: avoid; }
        }
      `}</style>

      <div style={S.card}>
        <label style={S.label}>Miesiąc raportu</label>
        <div style={{ ...S.row, gap: "0.6rem" }}>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            style={{ ...S.input, flex: 1 }}
          />
          <button
            onClick={generate}
            disabled={generating || dogs.length === 0}
            style={{ ...S.btn, ...S.btnPrimary, whiteSpace: "nowrap", opacity: generating ? 0.6 : 1 }}
          >
            {generating ? "Generuję..." : "Generuj raport"}
          </button>
        </div>
        {dogs.length === 0 && (
          <div style={{ fontSize: "0.8rem", color: "#6b7280", marginTop: "0.5rem" }}>
            Brak psów w panelu — dodaj psy w zakładce Psy.
          </div>
        )}
        {genError && (
          <div style={{ fontSize: "0.8rem", color: "#dc2626", marginTop: "0.5rem", fontWeight: 600 }}>{genError}</div>
        )}
      </div>

      {report && (
        <>
          <button
            onClick={() => window.print()}
            style={{ ...S.btn, ...S.btnSecondary, width: "100%", marginBottom: "0.75rem" }}
          >
            🖨 Drukuj / zapisz jako PDF
          </button>

          <div id="behav-report" style={{ background: "white", borderRadius: "0.75rem", border: "1px solid #e5e7eb", padding: "1.25rem" }}>
            <div style={{ borderBottom: "2px solid #7c3aed", paddingBottom: "0.75rem", marginBottom: "1rem" }}>
              <div style={{ fontSize: "1.15rem", fontWeight: 800, color: "#111827" }}>
                Raport pracy behawioralnej — {monthLabel(report.month)}
              </div>
              <div style={{ fontSize: "0.8rem", color: "#6b7280", marginTop: "0.25rem" }}>
                Behawiorysta: {currentUser?.displayName || currentUser?.email || "—"} ·
                wygenerowano {report.generatedAt.toLocaleDateString("pl-PL")} ·
                psów w pracy: {report.rows.length}
              </div>
            </div>

            {report.rows.map(({ dog, program, startedAt, progress, sessionsInMonth, totalSessions }) => (
              <div key={dog.id} className="report-dog" style={{ marginBottom: "1.5rem", paddingBottom: "1rem", borderBottom: "1px solid #e5e7eb" }}>
                <div style={{ fontSize: "1rem", fontWeight: 700, color: "#111827" }}>
                  {dog.name}
                  <span style={{ fontWeight: 400, color: "#6b7280", fontSize: "0.82rem", marginLeft: "0.5rem" }}>
                    ID: {dog.id}{dog.pavilion ? ` · ${dog.pavilion}${dog.box ? "/" + dog.box : ""}` : ""}
                  </span>
                </div>
                <div style={{ fontSize: "0.82rem", color: "#374151", margin: "0.35rem 0 0.6rem" }}>
                  Początek pracy: <strong>{startedAt ? startedAt.toLocaleDateString("pl-PL") : "—"}</strong>
                  {" · "}Program: <strong>{program?.name || "brak"}</strong>
                  {" · "}Sesje w miesiącu: <strong>{sessionsInMonth.length}</strong> (łącznie: {totalSessions})
                </div>

                {progress.length > 0 && (
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem", marginBottom: "0.6rem" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid #d1d5db", textAlign: "left", color: "#6b7280" }}>
                        <th style={{ padding: "0.25rem 0.3rem" }}>Ćwiczenie</th>
                        <th style={{ padding: "0.25rem 0.3rem" }}>Etap</th>
                        <th style={{ padding: "0.25rem 0.3rem" }}>Skuteczność</th>
                        <th style={{ padding: "0.25rem 0.3rem" }}>Sesje</th>
                      </tr>
                    </thead>
                    <tbody>
                      {progress.map((pr) => (
                        <tr key={pr.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                          <td style={{ padding: "0.25rem 0.3rem" }}>{pr.exerciseName || pr.id}</td>
                          <td style={{ padding: "0.25rem 0.3rem" }}>{pr.stage || 1}/5</td>
                          <td style={{ padding: "0.25rem 0.3rem", fontWeight: 600, color: (pr.successRate || 0) >= 80 ? "#16a34a" : (pr.successRate || 0) >= 50 ? "#ca8a04" : "#dc2626" }}>
                            {pr.successRate || 0}%
                          </td>
                          <td style={{ padding: "0.25rem 0.3rem" }}>{pr.sessionsCount || 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {sessionsInMonth.length > 0 ? (
                  <div style={{ fontSize: "0.78rem" }}>
                    <div style={{ fontWeight: 700, color: "#374151", marginBottom: "0.25rem" }}>Sesje i notatki:</div>
                    {sessionsInMonth.map((sess) => (
                      <div key={sess.id} style={{ padding: "0.25rem 0", borderBottom: "1px dotted #e5e7eb" }}>
                        <strong>{sess._d.toLocaleDateString("pl-PL")}</strong>
                        {sess.exercises?.length > 0 && (
                          <span style={{ color: "#374151" }}>
                            {" — "}
                            {sess.exercises.filter((e) => e.result).map((e) => `${e.exerciseName}: ${resultLabel(e.result)}`).join("; ")}
                          </span>
                        )}
                        {sess.notes && <div style={{ color: "#6b7280", fontStyle: "italic" }}>„{sess.notes}"</div>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: "0.78rem", color: "#9ca3af" }}>Brak sesji w tym miesiącu</div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function BehaviorystPanel({ currentUser, behaviorystDogs, dogs, onToggleBehaviorystDog, setCurrentView, onLogout }) {
  const [tab, setTab] = useState("dogs");
  const [exercises, setExercises] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [trainings, setTrainings] = useState({});
  const [selectedDog, setSelectedDog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showManage, setShowManage] = useState(false);
  const [loadError, setLoadError] = useState(null);

  // useRef keeps loadTrainings stable regardless of behaviorystDogs prop reference changes
  const behaviorystDogsRef = useRef(behaviorystDogs);
  useEffect(() => { behaviorystDogsRef.current = behaviorystDogs; }, [behaviorystDogs]);

  const loadLibrary = useCallback(async () => {
    const [exs, progs] = await Promise.all([fsGetExercises(), fsGetPrograms()]);
    setExercises(exs);
    setPrograms(progs);
  }, []);

  const loadTrainings = useCallback(async () => {
    const bDogs = behaviorystDogsRef.current;
    if (!bDogs?.length) { setTrainings({}); return; }
    const results = await Promise.all(bDogs.map(d => fsGetDogTraining(d.id)));
    const map = {};
    bDogs.forEach((d, i) => { if (results[i]) map[d.id] = results[i]; });
    setTrainings(map);
  }, []);

  const load = useCallback(async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true);
    setLoading(true);
    setLoadError(null);
    const doFetch = () => Promise.all([loadLibrary(), loadTrainings()]);
    try {
      try {
        await doFetch();
      } catch (e) {
        if (e?.code !== 'permission-denied') throw e;
        // Token may still be initializing — retry once after 1.5s
        await new Promise(r => setTimeout(r, 1500));
        await doFetch();
      }
    } catch (e) {
      console.error("Błąd ładowania Firestore:", e);
      setLoadError(e?.code || e?.message || "Nieznany błąd");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loadLibrary, loadTrainings]);

  // App.jsx confirms auth before rendering this component — call load() directly on mount
  useEffect(() => {
    load();
  }, [load]);

  if (!db) {
    return (
      <div style={{ ...S.page, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", padding: "2rem" }}>
          <div style={{ fontSize: "2rem" }}>⚠️</div>
          <p>Firestore nie jest skonfigurowany.</p>
        </div>
      </div>
    );
  }

  const handleNavigate = (tabKey) => {
    setSelectedDog(null);
    setTab(tabKey);
    loadTrainings().catch(() => {});
  };

  if (selectedDog) {
    return (
      <DogTrainingView
        dog={selectedDog}
        programs={programs}
        exercises={exercises}
        currentUser={currentUser}
        onBack={() => { setSelectedDog(null); loadTrainings().catch(() => {}); }}
        onNavigate={handleNavigate}
        onLogout={onLogout}
      />
    );
  }

  const todayCount = (behaviorystDogs || []).filter(dog => {
    const t = trainings[dog.id];
    if (!t?.lastSessionDate) return true;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const last = t.lastSessionDate instanceof Timestamp ? t.lastSessionDate.toDate() : new Date(t.lastSessionDate);
    return last < today;
  }).length;

  return (
    <div style={S.page}>
      <div style={S.header}>
        <button onClick={() => setCurrentView("home")} style={{ background: "none", border: "none", cursor: "pointer" }}>
          <ArrowLeft size={22} color="#374151" />
        </button>
        <div style={S.headerTitle}>Panel Behawiorysty</div>
        <button onClick={() => load(true)} disabled={refreshing}
          style={{ background: "none", border: "none", cursor: "pointer", opacity: refreshing ? 0.5 : 1 }}>
          <RefreshCw size={20} color="#6b7280" />
        </button>
        {onLogout && (
          <button onClick={onLogout} style={{ background: "none", border: "none", cursor: "pointer", padding: "0.25rem" }}>
            <LogOut size={20} color="#6b7280" />
          </button>
        )}
      </div>

      {loading ? (
        <div style={S.emptyState}>Ładowanie...</div>
      ) : loadError ? (
        <div style={{ ...S.content, textAlign: "center", paddingTop: "2rem" }}>
          <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>⚠️</div>
          <div style={{ fontWeight: "700", color: "#dc2626", marginBottom: "0.5rem" }}>
            Błąd połączenia z Firestore
          </div>
          <div style={{ fontSize: "0.85rem", color: "#6b7280", marginBottom: "0.75rem" }}>
            Kod błędu: <code>{loadError}</code>
          </div>
          {loadError.includes("permission") ? (
            <div style={{ fontSize: "0.85rem", color: "#6b7280", marginBottom: "1.25rem" }}>
              Spróbuj wylogować się i zalogować ponownie, aby odświeżyć sesję.
            </div>
          ) : (
            <div style={{ fontSize: "0.85rem", color: "#6b7280", marginBottom: "1.25rem" }}>
              Sprawdź połączenie z internetem i spróbuj ponownie.
            </div>
          )}
          <button onClick={() => load(true)} style={{ ...S.btn, ...S.btnPrimary }}>
            Spróbuj ponownie
          </button>
        </div>
      ) : (
        <>
          {tab === "dogs" && (
            <DogsTab
              dogs={behaviorystDogs || []}
              trainings={trainings}
              onSelectDog={setSelectedDog}
              onManage={() => setShowManage(true)}
            />
          )}
          {tab === "today" && <TodayTab dogs={behaviorystDogs || []} trainings={trainings} onSelectDog={setSelectedDog} />}
          {tab === "report" && (
            <ReportTab dogs={behaviorystDogs || []} programs={programs} currentUser={currentUser} />
          )}
          {tab === "library" && (
            <LibraryView
              exercises={exercises}
              programs={programs}
              currentUser={currentUser}
              onExerciseAdded={loadLibrary}
              onProgramAdded={loadLibrary}
            />
          )}
        </>
      )}

      <div style={S.bottomNav}>
        {PANEL_TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ ...S.navBtn, ...(tab === t.key ? S.navBtnActive : {}) }}>
            <span style={{ fontSize: "1.3rem", position: "relative" }}>
              {t.icon}
              {t.key === "today" && todayCount > 0 && (
                <span style={{ position: "absolute", top: "-4px", right: "-8px", backgroundColor: "#ef4444", color: "white", borderRadius: "999px", fontSize: "0.65rem", fontWeight: "700", padding: "1px 5px", minWidth: "16px", textAlign: "center" }}>
                  {todayCount}
                </span>
              )}
            </span>
            {t.label}
          </button>
        ))}
      </div>

      {showManage && (
        <ManageDogsModal
          allDogs={dogs || []}
          behaviorystDogs={behaviorystDogs || []}
          onToggle={onToggleBehaviorystDog}
          onClose={() => setShowManage(false)}
        />
      )}
    </div>
  );
}
