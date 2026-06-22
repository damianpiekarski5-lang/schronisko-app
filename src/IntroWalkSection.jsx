import React, { useState, useEffect } from "react";
import {
  collection, query, where, orderBy, onSnapshot,
  addDoc, deleteDoc, doc, serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import { Plus, Trash2, X } from "lucide-react";

const POLAND_TZ = "Europe/Warsaw";

function toPolandDateStr(date) {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: POLAND_TZ }).format(date);
}

function toPolandTimeStr(date) {
  return date.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit", timeZone: POLAND_TZ });
}

function nowDateTimeLocal() {
  const now = new Date();
  const date = toPolandDateStr(now);
  const time = toPolandTimeStr(now);
  return { date, time };
}

export default function IntroWalkSection({ dog, currentUser, isAdmin }) {
  const [todayEntries, setTodayEntries] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [interestedName, setInterestedName] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [error, setError] = useState("");

  const todayStr = toPolandDateStr(new Date());

  useEffect(() => {
    if (!dog?.id) return;
    const q = query(
      collection(db, "introWalks"),
      where("dogId", "==", dog.id),
      where("date", "==", todayStr),
      orderBy("time")
    );
    const unsub = onSnapshot(q, (snap) => {
      const result = [];
      snap.forEach((d) => result.push({ id: d.id, ...d.data() }));
      setTodayEntries(result);
    });
    return () => unsub();
  }, [dog?.id, todayStr]);

  function openForm() {
    const { date: d, time: t } = nowDateTimeLocal();
    setDate(d);
    setTime(t);
    setInterestedName("");
    setError("");
    setShowForm(true);
  }

  async function handleSave() {
    if (!interestedName.trim()) { setError("Podaj imię osoby zainteresowanej"); return; }
    if (!date) { setError("Podaj datę spaceru"); return; }
    if (!time) { setError("Podaj godzinę spaceru"); return; }
    if (!currentUser) { setError("Musisz być zalogowany"); return; }
    setSaving(true);
    setError("");
    try {
      await addDoc(collection(db, "introWalks"), {
        dogId: dog.id,
        dogName: dog.name,
        interestedName: interestedName.trim(),
        date,
        time,
        volunteerId: currentUser.uid,
        volunteerName: currentUser.displayName || currentUser.email || "Wolontariusz",
        createdAt: serverTimestamp(),
      });
      setShowForm(false);
    } catch (e) {
      setError("Błąd zapisu: " + (e?.message || "spróbuj ponownie"));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(entry) {
    const isOwner = entry.volunteerId === currentUser?.uid;
    if (!isOwner && !isAdmin) return;
    setDeleting(entry.id);
    try {
      await deleteDoc(doc(db, "introWalks", entry.id));
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div style={{
      margin: "0.75rem 0",
      padding: "0.75rem",
      borderRadius: "0.75rem",
      background: "#fefce8",
      border: "1px solid #fde68a",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: todayEntries.length > 0 || showForm ? "0.5rem" : 0 }}>
        <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "#92400e" }}>
          🐾 Spacer zapoznawczy
        </span>
        {!showForm && currentUser && (
          <button
            onClick={openForm}
            style={{
              background: "#f59e0b",
              border: "none",
              borderRadius: "9999px",
              color: "white",
              fontSize: "0.72rem",
              fontWeight: 700,
              padding: "0.25rem 0.6rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.25rem",
            }}
          >
            <Plus size={12} /> Dodaj
          </button>
        )}
      </div>

      {/* Dzisiejsze wpisy */}
      {todayEntries.map((entry) => {
        const isOwner = entry.volunteerId === currentUser?.uid;
        const canDelete = isOwner || isAdmin;
        return (
          <div key={entry.id} style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.4rem 0.5rem",
            background: "white",
            borderRadius: "0.5rem",
            marginBottom: "0.35rem",
            border: "1px solid #fde68a",
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: "0.82rem", color: "#111827" }}>
                {entry.interestedName}
              </div>
              <div style={{ fontSize: "0.7rem", color: "#6b7280" }}>
                🕐 {entry.time} · {entry.volunteerName}
              </div>
            </div>
            {canDelete && (
              <button
                onClick={() => handleDelete(entry)}
                disabled={deleting === entry.id}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  color: "#ef4444", padding: "0.2rem",
                  opacity: deleting === entry.id ? 0.4 : 1,
                }}
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        );
      })}

      {todayEntries.length === 0 && !showForm && (
        <p style={{ fontSize: "0.72rem", color: "#a16207", margin: 0 }}>
          Brak spacerów zapoznawczych dziś
        </p>
      )}

      {/* Formularz dodawania */}
      {showForm && (
        <div style={{
          background: "white",
          borderRadius: "0.5rem",
          padding: "0.6rem",
          border: "1px solid #fde68a",
          marginTop: "0.25rem",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#374151" }}>Nowy spacer zapoznawczy</span>
            <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#6b7280" }}>
              <X size={16} />
            </button>
          </div>
          <div style={{ marginBottom: "0.4rem" }}>
            <label style={labelStyle}>Imię osoby zainteresowanej *</label>
            <input
              type="text"
              placeholder="np. Anna"
              value={interestedName}
              onChange={(e) => setInterestedName(e.target.value)}
              style={inputStyle}
              autoFocus
            />
          </div>
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.4rem" }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Data *</label>
              <input
                type="date"
                value={date}
                min={todayStr}
                onChange={(e) => setDate(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Godzina *</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>
          {error && (
            <p style={{ color: "#dc2626", fontSize: "0.72rem", marginBottom: "0.4rem" }}>{error}</p>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              width: "100%",
              padding: "0.5rem",
              background: saving ? "#9ca3af" : "#f59e0b",
              border: "none",
              borderRadius: "0.5rem",
              color: "white",
              fontWeight: 700,
              fontSize: "0.82rem",
              cursor: saving ? "not-allowed" : "pointer",
            }}
          >
            {saving ? "Zapisuję..." : "Zapisz"}
          </button>
        </div>
      )}
    </div>
  );
}

const labelStyle = {
  display: "block",
  fontSize: "0.7rem",
  fontWeight: 600,
  color: "#374151",
  marginBottom: "0.2rem",
};

const inputStyle = {
  width: "100%",
  padding: "0.4rem 0.5rem",
  border: "1px solid #d1d5db",
  borderRadius: "0.375rem",
  fontSize: "0.82rem",
  boxSizing: "border-box",
};
