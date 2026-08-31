import React, { useState, useMemo } from "react";
import { ArrowLeft, Plus, Undo2 } from "lucide-react";
import ExerciseContent from "./ExerciseContent";
import { activeStage, checkStageProgression, sessionSuccessRate } from "../lib/trainingStore";

// Prowadzenie sesji krok po kroku — jedno ćwiczenie naraz, z materiałem
// instruktażowym dla aktualnego poziomu i oceną w trzech stopniach.
// Ćwiczenie da się dopisać w trakcie; trafia do dzisiejszej sesji i do psa.

const S = {
  overlay: { position: "fixed", inset: 0, backgroundColor: "#f9fafb", zIndex: 250, display: "flex", flexDirection: "column" },
  header: {
    backgroundColor: "white", borderBottom: "1px solid #e5e7eb", padding: "0.85rem 1rem",
    display: "flex", alignItems: "center", gap: "0.6rem", flexShrink: 0,
  },
  body: { flex: 1, overflowY: "auto", padding: "1rem" },
  footer: { backgroundColor: "white", borderTop: "1px solid #e5e7eb", padding: "0.85rem 1rem", flexShrink: 0 },
  card: { backgroundColor: "white", borderRadius: "0.75rem", padding: "1rem", border: "1px solid #e5e7eb", marginBottom: "0.75rem" },
  title: { fontSize: "1.1rem", fontWeight: 800, color: "#111827", lineHeight: 1.2 },
  sub: { fontSize: "0.78rem", color: "#6b7280" },
  bar: { height: 6, backgroundColor: "#e5e7eb", borderRadius: 999, overflow: "hidden", marginTop: "0.5rem" },
  fill: { height: "100%", backgroundColor: "#7c3aed", transition: "width 0.25s" },
  btn: { padding: "0.75rem", borderRadius: "0.75rem", border: "none", cursor: "pointer", fontSize: "0.9rem", fontWeight: 700 },
  outcomeRow: { display: "flex", gap: "0.5rem" },
  outcome: { flex: 1, padding: "0.85rem 0.4rem", borderRadius: "0.75rem", border: "2px solid", cursor: "pointer", fontSize: "0.82rem", fontWeight: 700, background: "white" },
  ghost: { background: "none", border: "none", cursor: "pointer", color: "#6b7280", fontSize: "0.82rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.3rem" },
  input: { width: "100%", padding: "0.65rem 0.75rem", borderRadius: "0.75rem", border: "1px solid #d1d5db", fontSize: "0.9rem", boxSizing: "border-box" },
  label: { fontSize: "0.8rem", fontWeight: 600, color: "#374151", marginBottom: "0.25rem", display: "block" },
  summaryRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.4rem 0", borderBottom: "1px solid #f3f4f6", fontSize: "0.85rem" },
  advance: { backgroundColor: "#f5f3ff", border: "1px solid #ddd6fe", borderRadius: "0.6rem", padding: "0.6rem 0.7rem", marginTop: "0.5rem", fontSize: "0.85rem", color: "#5b21b6", fontWeight: 600 },
};

const OUTCOMES = [
  { key: "sukces", label: "Udało się", color: "#16a34a", bg: "#dcfce7" },
  { key: "częściowo", label: "Częściowo", color: "#ca8a04", bg: "#fef9c3" },
  { key: "nieudane", label: "Nie udało się", color: "#dc2626", bg: "#fee2e2" },
];

export default function GuidedSession({ dog, exercises, progressList, onClose, onFinish, onAddExercise }) {
  const [list, setList] = useState(exercises);
  const [idx, setIdx] = useState(0);
  const [results, setResults] = useState([]);
  const [notes, setNotes] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [done, setDone] = useState(null);

  const progressById = useMemo(
    () => Object.fromEntries((progressList || []).map((p) => [p.id, p])),
    [progressList]
  );

  const current = list[idx];
  const stage = current ? activeStage(current, progressById[current.id]) : null;
  const atEnd = idx >= list.length;

  const record = (outcome) => {
    setResults((r) => [...r, {
      exerciseId: current.id,
      exerciseName: current.name,
      result: outcome,
      stageIndex: stage ? stage.index : null,
    }]);
    setIdx((i) => i + 1);
  };

  const undo = () => {
    if (results.length === 0) return;
    setResults((r) => r.slice(0, -1));
    setIdx((i) => Math.max(0, i - 1));
  };

  const handleAdd = async () => {
    const name = newName.trim();
    if (!name) return;
    setAdding(true);
    try {
      const created = await onAddExercise({ name });
      if (created) {
        // Dopisane ćwiczenie trafia na koniec dzisiejszej sesji.
        setList((l) => [...l, created]);
        setNewName("");
        setShowAdd(false);
      }
    } catch (e) {
      console.error("Błąd dodawania ćwiczenia w trakcie sesji:", e);
      alert("Nie udało się dodać ćwiczenia.");
    } finally {
      setAdding(false);
    }
  };

  // Podgląd awansów jeszcze przed zapisem — ta sama reguła co przy zapisie.
  const advancements = useMemo(() => {
    const out = [];
    const byExercise = {};
    results.forEach((r) => {
      (byExercise[r.exerciseId] = byExercise[r.exerciseId] || []).push(r);
    });
    Object.entries(byExercise).forEach(([exId, rows]) => {
      const ex = list.find((e) => e.id === exId);
      const st = ex ? activeStage(ex, progressById[exId]) : null;
      if (!st || !ex?.stages?.length) return;
      const hasNext = ex.stages.length > st.index + 1;
      if (!hasNext) return;
      const rate = sessionSuccessRate(rows);
      const prog = progressById[exId];
      const check = checkStageProgression(st, rate, prog?.stageDaysMet, undefined);
      if (check.advance) out.push({ name: ex.name, from: st.index + 1, to: st.index + 2 });
    });
    return out;
  }, [results, list, progressById]);

  const handleFinish = async () => {
    setFinishing(true);
    try {
      const summary = await onFinish({ exercises: results, notes: notes.trim() });
      setDone(summary || { advanced: advancements });
    } catch (e) {
      console.error("Błąd zapisu sesji:", e);
      alert("Nie udało się zapisać sesji — sprawdź połączenie.");
      setFinishing(false);
    }
  };

  if (done) {
    const rate = sessionSuccessRate(results);
    return (
      <div style={S.overlay}>
        <div style={S.header}>
          <div style={{ flex: 1 }}>
            <div style={S.title}>Sesja zapisana</div>
            <div style={S.sub}>{dog.name}</div>
          </div>
        </div>
        <div style={S.body}>
          <div style={S.card}>
            <div style={{ ...S.summaryRow, borderBottom: "none" }}>
              <span>Skuteczność sesji</span>
              <strong style={{ fontSize: "1.3rem", color: rate >= 70 ? "#16a34a" : rate >= 40 ? "#ca8a04" : "#dc2626" }}>
                {rate}%
              </strong>
            </div>
            <div style={S.sub}>{results.length} ocen · {new Set(results.map((r) => r.exerciseId)).size} ćwiczeń</div>
          </div>

          {(done.advanced || []).length > 0 && (
            <div style={S.card}>
              <strong style={{ fontSize: "0.92rem" }}>🎉 Awans poziomu</strong>
              {(done.advanced || []).map((a, i) => (
                <div key={i} style={S.advance}>
                  {a.name}: poziom {a.from} → {a.to}
                </div>
              ))}
            </div>
          )}

          <div style={S.card}>
            {results.map((r, i) => {
              const o = OUTCOMES.find((x) => x.key === r.result);
              return (
                <div key={i} style={S.summaryRow}>
                  <span>{r.exerciseName}</span>
                  <span style={{ color: o?.color, fontWeight: 700 }}>{o?.label}</span>
                </div>
              );
            })}
          </div>
        </div>
        <div style={S.footer}>
          <button onClick={onClose} style={{ ...S.btn, backgroundColor: "#7c3aed", color: "white", width: "100%" }}>
            Zamknij
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={S.overlay}>
      <div style={S.header}>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: "0.2rem" }} aria-label="Przerwij">
          <ArrowLeft size={22} color="#374151" />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={S.title}>{dog.name}</div>
          <div style={S.sub}>
            {atEnd ? "Podsumowanie" : `Ćwiczenie ${idx + 1} z ${list.length}`}
          </div>
          <div style={S.bar}>
            <div style={{ ...S.fill, width: `${list.length ? Math.min(100, (idx / list.length) * 100) : 0}%` }} />
          </div>
        </div>
      </div>

      <div style={S.body}>
        {atEnd ? (
          <>
            <div style={S.card}>
              <strong style={{ fontSize: "0.95rem" }}>Wszystkie ćwiczenia ocenione</strong>
              <div style={{ ...S.sub, marginTop: "0.3rem" }}>
                Skuteczność sesji: <strong>{sessionSuccessRate(results)}%</strong>
              </div>
              {advancements.length > 0 && advancements.map((a, i) => (
                <div key={i} style={S.advance}>🎉 {a.name}: awans na poziom {a.to}</div>
              ))}
            </div>
            <div style={S.card}>
              <label style={S.label}>Notatka z sesji (opcjonalnie)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                style={{ ...S.input, minHeight: 90, resize: "vertical" }}
                placeholder="Obserwacje, na co zwrócić uwagę następnym razem..."
              />
            </div>
          </>
        ) : current ? (
          <div style={S.card}>
            <div style={S.title}>{current.name}</div>
            <div style={{ ...S.sub, marginBottom: "0.75rem" }}>
              {current.category}{current.difficulty ? ` · ${current.difficulty}` : ""}
            </div>
            <ExerciseContent exercise={current} stage={stage} />
          </div>
        ) : (
          <div style={{ ...S.card, textAlign: "center", color: "#6b7280" }}>
            Ten pies nie ma jeszcze ćwiczeń. Dodaj pierwsze poniżej.
          </div>
        )}

        {showAdd ? (
          <div style={S.card}>
            <label style={S.label}>Nazwa nowego ćwiczenia</label>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              style={S.input}
              placeholder="np. Spokojne mijanie innego psa"
              autoFocus
            />
            <div style={{ ...S.sub, margin: "0.4rem 0 0.6rem" }}>
              Trafi od razu do tej sesji i do planu psa. Instrukcje możesz dopisać później.
            </div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button onClick={() => { setShowAdd(false); setNewName(""); }}
                style={{ ...S.btn, backgroundColor: "#f3f4f6", color: "#374151", flex: 1 }}>
                Anuluj
              </button>
              <button onClick={handleAdd} disabled={adding || !newName.trim()}
                style={{ ...S.btn, backgroundColor: "#7c3aed", color: "white", flex: 2, opacity: adding || !newName.trim() ? 0.5 : 1 }}>
                {adding ? "Dodaję..." : "Dodaj i ćwicz"}
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowAdd(true)}
            style={{ ...S.btn, width: "100%", backgroundColor: "white", color: "#7c3aed", border: "2px dashed #c4b5fd", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem" }}>
            <Plus size={16} /> Dodaj ćwiczenie w trakcie
          </button>
        )}
      </div>

      <div style={S.footer}>
        {atEnd ? (
          <button onClick={handleFinish} disabled={finishing || results.length === 0}
            style={{ ...S.btn, backgroundColor: "#16a34a", color: "white", width: "100%", opacity: finishing || results.length === 0 ? 0.5 : 1 }}>
            {finishing ? "Zapisuję..." : "Zapisz sesję"}
          </button>
        ) : (
          <>
            <div style={S.outcomeRow}>
              {OUTCOMES.map((o) => (
                <button key={o.key} onClick={() => record(o.key)} disabled={!current}
                  style={{ ...S.outcome, borderColor: o.color, color: o.color, opacity: current ? 1 : 0.4 }}>
                  {o.label}
                </button>
              ))}
            </div>
            {results.length > 0 && (
              <button onClick={undo} style={{ ...S.ghost, margin: "0.6rem auto 0" }}>
                <Undo2 size={14} /> Cofnij ostatnią ocenę
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
