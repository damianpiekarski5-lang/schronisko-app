import React, { useState, useEffect, useCallback, useMemo } from "react";
import { collection, doc, setDoc, deleteDoc, onSnapshot, query, where } from "firebase/firestore";
import { db } from "./firebase";
import { ChevronLeft, ChevronRight } from "lucide-react";

const POLAND_TZ = "Europe/Warsaw";

function toPolandDateStr(date) {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: POLAND_TZ }).format(date);
}

function getWeekStart(offset = 0) {
  const now = new Date();
  const polandStr = toPolandDateStr(now);
  const today = new Date(polandStr + "T12:00:00");
  const dow = today.getDay(); // 0=Sun, 1=Mon...
  const daysToMon = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(today);
  monday.setDate(today.getDate() + daysToMon + offset * 7);
  return monday;
}

function buildWeekDays(weekStart) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    const str = toPolandDateStr(d);
    const dayName = d.toLocaleDateString("pl-PL", { weekday: "short", timeZone: POLAND_TZ });
    const label = d.toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit", timeZone: POLAND_TZ });
    const dow = d.getDay();
    const isWeekend = dow === 0 || dow === 6;
    const todayStr = toPolandDateStr(new Date());
    return { str, dayName, label, isWeekend, isToday: str === todayStr };
  });
}

const SECTIONS = [
  { id: "morning",        label: "GODZ. 08:00–14:00",         slots: 25, color: "#e0f7fa", textColor: "#006064" },
  { id: "afternoon",      label: "GODZ. 15:00–20:00",         slots: 15, color: "#fffde7", textColor: "#f57f17" },
  { id: "hospital_morning",  label: "SZPITAL  08:00–14:00",   slots: 3,  color: "#b2ebf2", textColor: "#00838f" },
  { id: "hospital_afternoon", label: "SZPITAL  15:00–20:00",  slots: 5,  color: "#fff9c4", textColor: "#f9a825" },
];

function slotDocId(section, date, slotIndex) {
  return `${section}_${date}_${slotIndex}`;
}

export default function ScheduleView({ currentUser, isAdmin }) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [entries, setEntries] = useState({});
  const [saving, setSaving] = useState(null);
  const [banner, setBanner] = useState(null);

  function showBanner(text) {
    setBanner(text);
    setTimeout(() => setBanner(null), 6000);
  }

  const weekStart = useMemo(() => getWeekStart(weekOffset), [weekOffset]);
  const days = useMemo(() => buildWeekDays(weekStart), [weekStart]);

  const startDate = days[0].str;
  const endDate = days[6].str;

  useEffect(() => {
    const q = query(
      collection(db, "scheduleEntries"),
      where("date", ">=", startDate),
      where("date", "<=", endDate)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const result = {};
        snap.forEach((d) => {
          result[d.id] = d.data();
        });
        setEntries(result);
      },
      (error) => {
        console.error("Błąd subskrypcji grafiku:", error);
        showBanner("Błąd połączenia z grafikiem — odśwież stronę lub sprawdź zasięg");
      }
    );
    return () => unsub();
  }, [startDate, endDate]);

  const handleSlotClick = useCallback(async (section, date, slotIndex) => {
    if (!currentUser) return;
    if (saving) return; // blokada podwójnego tapnięcia
    const docId = slotDocId(section, date, slotIndex);
    const existing = entries[docId];

    if (existing) {
      const isOwner = existing.volunteerId === currentUser.uid;
      if (!isOwner && !isAdmin) return;
      // Potwierdzenie — przypadkowe tapnięcie nie może cicho skasować dyżuru
      const who = isOwner ? "swój wpis" : `wpis „${existing.volunteerName}"`;
      if (!window.confirm(`Usunąć ${who} z grafiku (${date})?`)) return;
      setSaving(docId);
      try {
        await deleteDoc(doc(db, "scheduleEntries", docId));
      } catch (e) {
        console.error("Błąd usuwania wpisu:", e);
        showBanner("Nie udało się usunąć wpisu — spróbuj ponownie");
      } finally {
        setSaving(null);
      }
    } else {
      setSaving(docId);
      try {
        await setDoc(doc(db, "scheduleEntries", docId), {
          section,
          date,
          slotIndex,
          volunteerId: currentUser.uid,
          volunteerName: currentUser.displayName || currentUser.email || "Wolontariusz",
          createdAt: new Date().toISOString(),
        });
      } catch (e) {
        // Reguły Firestore blokują nadpisanie — ktoś był szybszy
        console.error("Błąd zapisu do grafiku:", e);
        if (e?.code === "permission-denied") {
          showBanner("Ktoś właśnie zapisał się w ten slot — wybierz inny");
        } else {
          showBanner("Nie udało się zapisać — sprawdź zasięg i spróbuj ponownie");
        }
      } finally {
        setSaving(null);
      }
    }
  }, [currentUser, entries, isAdmin, saving]);

  const todayStr = toPolandDateStr(new Date());

  return (
    <div style={{ paddingBottom: "5rem" }}>
      {banner && (
        <div style={{
          margin: "0.5rem 1rem 0",
          padding: "0.5rem 0.75rem",
          borderRadius: "0.5rem",
          fontSize: "0.8rem",
          fontWeight: 600,
          background: "#fef3c7",
          color: "#92400e",
          border: "1px solid #fde68a",
        }}>
          {banner}
        </div>
      )}
      {/* Nagłówek z nawigacją */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0.75rem 5rem 0.25rem 1rem",
        background: "white",
        borderBottom: "1px solid #e5e7eb",
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}>
        <button
          onClick={() => setWeekOffset((o) => o - 1)}
          disabled={weekOffset <= 0}
          style={navBtnStyle(weekOffset <= 0)}
        >
          <ChevronLeft size={18} />
        </button>
        <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "#111827" }}>
          {days[0].label} – {days[6].label}
          {weekOffset === 0 && <span style={{ color: "#16a34a", marginLeft: "0.5rem", fontSize: "0.8rem" }}> bieżący tydzień</span>}
          {weekOffset === 1 && <span style={{ color: "#2563eb", marginLeft: "0.5rem", fontSize: "0.8rem" }}> następny tydzień</span>}
          {weekOffset === 2 && <span style={{ color: "#7c3aed", marginLeft: "0.5rem", fontSize: "0.8rem" }}> za dwa tygodnie</span>}
        </span>
        <button
          onClick={() => setWeekOffset((o) => o + 1)}
          disabled={weekOffset >= 2}
          style={navBtnStyle(weekOffset >= 2)}
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Tabela */}
      <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
        <table style={{ borderCollapse: "collapse", fontSize: "0.75rem", minWidth: "max-content", width: "100%" }}>
          <thead>
            <tr>
              <th style={sectionThStyle}></th>
              {days.map((day) => (
                <th key={day.str} style={{
                  ...dayThStyle,
                  background: day.isToday ? "#166534" : day.isWeekend ? "#fce7f3" : "#f0fdf4",
                  color: day.isToday ? "white" : day.isWeekend ? "#9d174d" : "#166534",
                  fontWeight: day.isToday ? 700 : 600,
                  minWidth: day.isToday ? 90 : 75,
                  width: day.isToday ? 90 : 75,
                }}>
                  <div>{day.dayName}</div>
                  <div style={{ fontWeight: 400, fontSize: "0.65rem" }}>{day.label}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SECTIONS.map((section) => (
              Array.from({ length: section.slots }, (_, slotIdx) => {
                const isFirstRow = slotIdx === 0;
                return (
                  <tr key={`${section.id}-${slotIdx}`} style={{
                    borderTop: isFirstRow ? "3px solid #6b7280" : undefined,
                  }}>
                    {/* Etykieta sekcji tylko w pierwszym wierszu */}
                    <td style={{
                      ...sectionLabelStyle,
                      background: section.color,
                      color: section.textColor,
                      borderTop: isFirstRow ? "3px solid #6b7280" : "1px solid #e5e7eb",
                      fontWeight: isFirstRow ? 700 : 400,
                      fontSize: isFirstRow ? "0.7rem" : "0.7rem",
                    }}>
                      {isFirstRow ? (
                        <span>{section.label}</span>
                      ) : (
                        <span style={{ color: "#9ca3af" }}>{slotIdx + 1}.</span>
                      )}
                    </td>
                    {days.map((day) => {
                      const docId = slotDocId(section.id, day.str, slotIdx);
                      const entry = entries[docId];
                      const isSaving = saving === docId;
                      const isOwner = entry?.volunteerId === currentUser?.uid;
                      const canDelete = isOwner || isAdmin;
                      const isPast = day.str < todayStr;

                      return (
                        <td
                          key={day.str}
                          onClick={() => !isPast && handleSlotClick(section.id, day.str, slotIdx)}
                          style={{
                            ...slotCellStyle,
                            background: entry
                              ? (isOwner ? "#bbf7d0" : "#dbeafe")
                              : section.color,
                            cursor: isPast ? "default" : entry && !canDelete ? "default" : "pointer",
                            borderLeft: day.isToday ? "2px solid #16a34a" : undefined,
                            borderRight: day.isToday ? "2px solid #16a34a" : undefined,
                            opacity: isSaving ? 0.5 : 1,
                            fontWeight: entry ? 600 : 400,
                            color: entry ? "#1e3a5f" : "#9ca3af",
                            fontSize: entry ? "0.72rem" : "0.7rem",
                            minWidth: day.isToday ? 90 : 75,
                            width: day.isToday ? 90 : 75,
                          }}
                          title={entry ? `${entry.volunteerName}${canDelete ? " — kliknij aby usunąć" : ""}` : isPast ? "" : "Kliknij aby się wpisać"}
                        >
                          {isSaving ? "…" : entry ? shortenName(entry.volunteerName) : ""}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            ))}
          </tbody>
        </table>
      </div>

      {/* Legenda */}
      <div style={{ padding: "0.75rem 1rem", display: "flex", gap: "1rem", flexWrap: "wrap", fontSize: "0.72rem", color: "#6b7280" }}>
        <span><span style={{ background: "#bbf7d0", padding: "0 4px", borderRadius: 3 }}>Zielone</span> — Twój wpis</span>
        <span><span style={{ background: "#dbeafe", padding: "0 4px", borderRadius: 3 }}>Niebieskie</span> — inny wolontariusz</span>
        <span>Kliknij wolny slot aby się wpisać</span>
      </div>
    </div>
  );
}

function shortenName(name) {
  if (!name) return "";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

const navBtnStyle = (disabled) => ({
  background: "none",
  border: "1px solid #e5e7eb",
  borderRadius: "9999px",
  padding: "0.3rem 0.6rem",
  cursor: disabled ? "not-allowed" : "pointer",
  color: disabled ? "#d1d5db" : "#374151",
  display: "flex",
  alignItems: "center",
});

const sectionThStyle = {
  padding: "0.4rem 0.5rem",
  border: "1px solid #d1d5db",
  background: "#f9fafb",
  minWidth: 130,
  width: 130,
  position: "sticky",
  left: 0,
  zIndex: 5,
  top: 0,
};

const dayThStyle = {
  padding: "0.3rem 0.25rem",
  border: "1px solid #d1d5db",
  textAlign: "center",
  whiteSpace: "nowrap",
  position: "sticky",
  top: 0,
  zIndex: 4,
};

const sectionLabelStyle = {
  padding: "0.25rem 0.5rem",
  border: "1px solid #d1d5db",
  whiteSpace: "nowrap",
  position: "sticky",
  left: 0,
  zIndex: 3,
  minWidth: 130,
  width: 130,
};

const slotCellStyle = {
  padding: "0.2rem 0.3rem",
  border: "1px solid #e5e7eb",
  textAlign: "center",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  maxWidth: 90,
  height: 24,
};
