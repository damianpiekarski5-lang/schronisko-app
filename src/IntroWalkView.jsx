import React, { useState, useEffect, useMemo } from "react";
import { collection, onSnapshot, query, where, orderBy, doc, deleteDoc } from "firebase/firestore";
import { db } from "./firebase";
import { Trash2 } from "lucide-react";

const POLAND_TZ = "Europe/Warsaw";

function toPolandDateStr(date) {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: POLAND_TZ }).format(date);
}

function formatDate(dateStr) {
  const [y, m, d] = dateStr.split("-");
  return `${d}.${m}.${y}`;
}

function dayLabel(dateStr) {
  const todayStr = toPolandDateStr(new Date());
  if (dateStr === todayStr) return "Dziś";
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("pl-PL", { weekday: "long", day: "2-digit", month: "2-digit", timeZone: POLAND_TZ });
}

export default function IntroWalkView({ currentUser, isAdmin, dogs }) {
  const [entries, setEntries] = useState([]);
  const [deleting, setDeleting] = useState(null);

  const todayStr = toPolandDateStr(new Date());

  useEffect(() => {
    const q = query(
      collection(db, "introWalks"),
      where("date", ">=", todayStr),
      orderBy("date"),
      orderBy("time")
    );
    const unsub = onSnapshot(q, (snap) => {
      const result = [];
      snap.forEach((d) => result.push({ id: d.id, ...d.data() }));
      setEntries(result);
    });
    return () => unsub();
  }, [todayStr]);

  const dogMap = useMemo(() => {
    const m = {};
    (dogs || []).forEach((d) => { m[d.id] = d; });
    return m;
  }, [dogs]);

  const grouped = useMemo(() => {
    const map = {};
    entries.forEach((e) => {
      if (!map[e.date]) map[e.date] = [];
      map[e.date].push(e);
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [entries]);

  async function handleDelete(entry) {
    if (!currentUser) return;
    const isOwner = entry.volunteerId === currentUser.uid;
    if (!isOwner && !isAdmin) return;
    setDeleting(entry.id);
    try {
      await deleteDoc(doc(db, "introWalks", entry.id));
    } finally {
      setDeleting(null);
    }
  }

  if (grouped.length === 0) {
    return (
      <div style={{ padding: "2rem", textAlign: "center", color: "#6b7280" }}>
        <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🐾</div>
        <p>Brak zaplanowanych spacerów zapoznawczych</p>
        <p style={{ fontSize: "0.8rem", marginTop: "0.5rem" }}>
          Dodaj spacer zapoznawczy z karty wybranego psa
        </p>
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: "5rem" }}>
      <div style={{ padding: "0.75rem 1rem 0.25rem", borderBottom: "1px solid #e5e7eb", background: "white" }}>
        <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "#111827", margin: 0 }}>
          🐾 Spacery zapoznawcze
        </h2>
        <p style={{ fontSize: "0.75rem", color: "#6b7280", margin: "0.25rem 0 0" }}>
          Nadchodzące spacery z osobami zainteresowanymi adopcją
        </p>
      </div>

      {grouped.map(([date, dayEntries]) => {
        const isToday = date === todayStr;
        return (
          <div key={date}>
            <div style={{
              padding: "0.4rem 1rem",
              background: isToday ? "#dcfce7" : "#f3f4f6",
              color: isToday ? "#166534" : "#374151",
              fontWeight: 700,
              fontSize: "0.8rem",
              borderBottom: "1px solid #e5e7eb",
            }}>
              {dayLabel(date)}
            </div>
            {dayEntries.map((entry) => {
              const dog = dogMap[entry.dogId];
              const isOwner = entry.volunteerId === currentUser?.uid;
              const canDelete = isOwner || isAdmin;
              const boks = dog ? `${dog.pavilion || ""}${dog.box || ""}` : "";

              return (
                <div key={entry.id} style={{
                  padding: "0.75rem 1rem",
                  borderBottom: "1px solid #f3f4f6",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  background: isToday ? "#f0fdf4" : "white",
                }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: "50%",
                    background: "#dbeafe", display: "flex", alignItems: "center",
                    justifyContent: "center", fontSize: "1.2rem", flexShrink: 0,
                  }}>
                    🐶
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "#111827" }}>
                      {entry.interestedName}
                    </div>
                    <div style={{ fontSize: "0.78rem", color: "#374151", marginTop: "0.15rem" }}>
                      🐾 {dog?.name || entry.dogName || entry.dogId}
                      {boks && <span style={{ color: "#6b7280", marginLeft: "0.4rem" }}>({boks})</span>}
                    </div>
                    <div style={{ fontSize: "0.72rem", color: "#6b7280", marginTop: "0.1rem" }}>
                      🕐 {entry.time} · zapisał/a: {entry.volunteerName}
                    </div>
                  </div>
                  {canDelete && (
                    <button
                      onClick={() => handleDelete(entry)}
                      disabled={deleting === entry.id}
                      style={{
                        background: "none", border: "none", cursor: "pointer",
                        color: "#ef4444", padding: "0.3rem", borderRadius: "0.5rem",
                        opacity: deleting === entry.id ? 0.4 : 1,
                        flexShrink: 0,
                      }}
                      title="Usuń spacer zapoznawczy"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
