import React, { useState } from "react";
import { Plus, Check, Trash2, Pencil } from "lucide-react";

// Cele pracy z psem — „nad czym pracujemy". Widoczne od razu pod nagłówkiem
// karty psa, żeby sens pracy był pierwszą rzeczą, którą widać.

const S = {
  card: { backgroundColor: "white", borderRadius: "0.75rem", padding: "1rem", border: "1px solid #e5e7eb", marginBottom: "0.75rem" },
  head: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.6rem" },
  title: { fontSize: "1rem", fontWeight: 800, color: "#111827" },
  row: { display: "flex", alignItems: "flex-start", gap: "0.55rem", padding: "0.45rem 0", borderBottom: "1px solid #f3f4f6" },
  check: {
    width: 22, height: 22, borderRadius: "0.4rem", border: "2px solid #d1d5db", background: "white",
    cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: 0,
  },
  checkDone: { backgroundColor: "#16a34a", borderColor: "#16a34a" },
  text: { flex: 1, fontSize: "0.88rem", color: "#111827", lineHeight: 1.4, wordBreak: "break-word" },
  textDone: { color: "#9ca3af", textDecoration: "line-through" },
  icon: { background: "none", border: "none", cursor: "pointer", padding: "0.2rem", color: "#9ca3af", flexShrink: 0 },
  input: { width: "100%", padding: "0.6rem 0.7rem", borderRadius: "0.6rem", border: "1px solid #d1d5db", fontSize: "0.88rem", boxSizing: "border-box" },
  addBtn: {
    width: "100%", marginTop: "0.6rem", padding: "0.65rem", borderRadius: "0.6rem",
    border: "2px dashed #c4b5fd", background: "white", color: "#7c3aed",
    fontSize: "0.85rem", fontWeight: 700, cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center", gap: "0.35rem",
  },
  empty: { fontSize: "0.85rem", color: "#6b7280", padding: "0.4rem 0" },
};

export default function GoalsCard({ goals, onAdd, onToggle, onEdit, onDelete }) {
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState("");
  const [editId, setEditId] = useState(null);
  const [editText, setEditText] = useState("");
  const [busy, setBusy] = useState(false);

  const submitNew = async () => {
    const t = text.trim();
    if (!t) return;
    setBusy(true);
    try {
      await onAdd(t);
      setText("");
      setAdding(false);
    } catch (e) {
      console.error("Błąd dodawania celu:", e);
      alert("Nie udało się dodać celu.");
    } finally {
      setBusy(false);
    }
  };

  const submitEdit = async () => {
    const t = editText.trim();
    if (!t) return;
    setBusy(true);
    try {
      await onEdit(editId, t);
      setEditId(null);
    } catch (e) {
      console.error("Błąd zapisu celu:", e);
      alert("Nie udało się zapisać celu.");
    } finally {
      setBusy(false);
    }
  };

  const openCount = goals.filter((g) => !g.done).length;

  return (
    <div style={S.card}>
      <div style={S.head}>
        <div style={S.title}>🎯 Nad czym pracujemy</div>
        {goals.length > 0 && (
          <span style={{ fontSize: "0.78rem", color: "#6b7280" }}>
            {openCount} z {goals.length} w toku
          </span>
        )}
      </div>

      {goals.length === 0 && !adding && (
        <div style={S.empty}>Nie ustalono jeszcze celów dla tego psa.</div>
      )}

      {goals.map((g) => (
        <div key={g.id} style={S.row}>
          <button
            onClick={() => onToggle(g.id, !g.done)}
            style={{ ...S.check, ...(g.done ? S.checkDone : {}) }}
            aria-label={g.done ? "Oznacz jako w toku" : "Oznacz jako osiągnięty"}
          >
            {g.done && <Check size={14} color="white" />}
          </button>

          {editId === g.id ? (
            <div style={{ flex: 1 }}>
              <input
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") submitEdit(); if (e.key === "Escape") setEditId(null); }}
                style={S.input}
                autoFocus
              />
              <div style={{ display: "flex", gap: "0.4rem", marginTop: "0.4rem" }}>
                <button onClick={() => setEditId(null)}
                  style={{ ...S.addBtn, marginTop: 0, borderStyle: "solid", borderColor: "#e5e7eb", color: "#374151" }}>
                  Anuluj
                </button>
                <button onClick={submitEdit} disabled={busy || !editText.trim()}
                  style={{ ...S.addBtn, marginTop: 0, backgroundColor: "#7c3aed", color: "white", borderColor: "#7c3aed", borderStyle: "solid", opacity: busy || !editText.trim() ? 0.5 : 1 }}>
                  Zapisz
                </button>
              </div>
            </div>
          ) : (
            <>
              <div style={{ ...S.text, ...(g.done ? S.textDone : {}) }}>{g.text}</div>
              <button onClick={() => { setEditId(g.id); setEditText(g.text); }} style={S.icon} aria-label="Edytuj cel">
                <Pencil size={15} />
              </button>
              <button
                onClick={() => {
                  if (window.confirm(`Usunąć cel „${g.text}"?`)) onDelete(g.id);
                }}
                style={S.icon}
                aria-label="Usuń cel"
              >
                <Trash2 size={15} />
              </button>
            </>
          )}
        </div>
      ))}

      {adding ? (
        <div style={{ marginTop: "0.6rem" }}>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") submitNew(); if (e.key === "Escape") { setAdding(false); setText(""); } }}
            placeholder="np. Spokojne mijanie innych psów na spacerze"
            style={S.input}
            autoFocus
          />
          <div style={{ display: "flex", gap: "0.4rem", marginTop: "0.5rem" }}>
            <button onClick={() => { setAdding(false); setText(""); }}
              style={{ ...S.addBtn, marginTop: 0, borderStyle: "solid", borderColor: "#e5e7eb", color: "#374151" }}>
              Anuluj
            </button>
            <button onClick={submitNew} disabled={busy || !text.trim()}
              style={{ ...S.addBtn, marginTop: 0, backgroundColor: "#7c3aed", color: "white", borderColor: "#7c3aed", borderStyle: "solid", opacity: busy || !text.trim() ? 0.5 : 1 }}>
              {busy ? "Dodaję..." : "Dodaj cel"}
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAdding(true)} style={S.addBtn}>
          <Plus size={15} /> Dodaj cel
        </button>
      )}
    </div>
  );
}
