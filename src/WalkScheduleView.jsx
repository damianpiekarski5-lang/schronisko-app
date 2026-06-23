import React, { useState, useEffect, useCallback, useMemo } from "react";
import { collection, doc, setDoc, deleteDoc, getDocs, query, where } from "firebase/firestore";
import { db } from "./firebase";

const POLAND_TZ = "Europe/Warsaw";

function toPolandDateStr(date) {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: POLAND_TZ }).format(date);
}

function getTodayStr() {
  return toPolandDateStr(new Date());
}

function buildDateWindow() {
  const today = new Date();
  const todayStr = getTodayStr();
  const days = [];
  for (let i = -7; i <= 2; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const str = toPolandDateStr(d);
    const dow = d.toLocaleDateString("pl-PL", { weekday: "short", timeZone: POLAND_TZ });
    const label = d.toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit", timeZone: POLAND_TZ });
    const dayOfWeek = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: POLAND_TZ }).format(d);
    const isWeekend = dayOfWeek === "Sat" || dayOfWeek === "Sun";
    days.push({ str, label, dow, isWeekend, isToday: str === todayStr, offset: i });
  }
  return days;
}

async function fetchWalkHistory(startDate, endDate) {
  const res = await fetch(
    `/api/gs?action=getWalksByDateRange&startDate=${startDate}&endDate=${endDate}`
  );
  const result = await res.json();
  return result?.ok ? result.data : {};
}

async function fetchAllOpiekunowie() {
  const res = await fetch("/api/gs?action=getAllOpiekunowie");
  const result = await res.json();
  return result?.ok ? result.data : {};
}

const CELL_STYLES = {
  past: { background: "#f3f4f6", cursor: "default" },
  today: { background: "#dcfce7", cursor: "pointer" },
  future: { background: "#fff", cursor: "pointer" },
  todayMarked: { background: "#16a34a", color: "#fff", cursor: "pointer" },
  pastMarked: { background: "#d1fae5", cursor: "default" },
  futureMarked: { background: "#bbf7d0", cursor: "pointer" },
};

export default function WalkScheduleView({ dogs, currentUser, onSaveWalk, isAdmin }) {
  const [walkHistory, setWalkHistory] = useState({});
  const [plannedWalks, setPlannedWalks] = useState({});
  const [loading, setLoading] = useState(true);
  const [opiekunowie, setOpiekunowie] = useState({});
  const [savingCell, setSavingCell] = useState(null);

  const days = useMemo(() => buildDateWindow(), []);
  const todayStr = useMemo(() => getTodayStr(), []);
  const startDate = days[0].str;
  const endDate = days[days.length - 1].str;

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [history, opiek, planned] = await Promise.all([
        fetchWalkHistory(startDate, endDate),
        fetchAllOpiekunowie(),
        loadPlannedWalks(startDate, endDate),
      ]);
      setWalkHistory(history);
      setOpiekunowie(opiek);
      setPlannedWalks(planned);
    } catch (e) {
      console.error("Błąd ładowania tabeli spacerów:", e);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => { loadData(); }, [loadData]);

  async function loadPlannedWalks(start, end) {
    const q = query(
      collection(db, "plannedWalks"),
      where("date", ">=", start),
      where("date", "<=", end)
    );
    const snap = await getDocs(q);
    const result = {};
    snap.forEach((d) => {
      const { dogId, date, volunteerId, volunteerName } = d.data();
      if (!result[dogId]) result[dogId] = {};
      result[dogId][date] = { volunteerId, volunteerName, docId: d.id };
    });
    return result;
  }

  const SECTOR_COLORS = {
    A:  "#a8d5a2",
    B:  "#d4edd4",
    C:  "#fce584",
    D:  "#f9b4d0",
    E:  "#f2b8c0",
    F:  "#d5c3a0",
    G:  "#a8d8d8",
    H:  "#a8c4e8",
    ZE: "#b8c8dc",
    ZF: "#c8b8dc",
    ZH: "#fde0ec",
    ZG: "#f4b8c8",
    P:  "#fcd8c0",
    R:  "#f8c090",
    V:  "#fffde7",
    T:  "#fff9a0",
    U:  "#fff4c4",
    L:  "#f4a8c0",
    X:  "#e88898",
    Y:  "#80d0c8",
    I:  "#d4b080",
    O:  "#a0b8d8",
    S:  "#e08080",
  };

  function getSectorColor(pavilion) {
    if (!pavilion) return "#ffffff";
    const pav = String(pavilion).toUpperCase();
    if (SECTOR_COLORS[pav]) return SECTOR_COLORS[pav];
    // dopasuj prefix (np. ZF → ZF, ZG → ZG)
    for (const key of Object.keys(SECTOR_COLORS)) {
      if (pav.startsWith(key)) return SECTOR_COLORS[key];
    }
    return "#ffffff";
  }

  function getSectorBorderColor(pavilion) {
    const color = getSectorColor(pavilion);
    // ciemniejsza wersja dla obramowania sekcji
    return color === "#ffffff" ? "#e5e7eb" : color.replace(/f/gi, "d");
  }

  const sortedDogs = useMemo(() => {
    const SECTOR_ORDER = ["A","B","C","D","E","F","G","H","ZE","ZF","ZH","ZG","P","R","V","T","U","L","X","Y","I","O","S"];
    function sectorIndex(p) {
      const pav = String(p || "").toUpperCase();
      const idx = SECTOR_ORDER.findIndex((s) => pav === s || pav.startsWith(s));
      return idx === -1 ? 99 : idx;
    }
    return [...dogs]
      .filter((d) => !d.archived)
      .sort((a, b) => {
        const ai = sectorIndex(a.pavilion);
        const bi = sectorIndex(b.pavilion);
        if (ai !== bi) return ai - bi;
        const aBox = String(a.box || "").padStart(3, "0");
        const bBox = String(b.box || "").padStart(3, "0");
        return aBox.localeCompare(bBox);
      });
  }, [dogs]);

  function hasWalk(dogId, dateStr) {
    if (walkHistory[dogId]?.includes(dateStr)) return true;
    if (plannedWalks[dogId]?.[dateStr]) return true;
    return false;
  }

  function getPlannedEntry(dogId, dateStr) {
    return plannedWalks[dogId]?.[dateStr] || null;
  }

  async function handleCellClick(dog, day) {
    if (day.offset < 0) return; // przeszłe — tylko odczyt
    if (!currentUser) return;

    const { str: dateStr, isToday, offset } = day;
    const cellKey = `${dog.id}-${dateStr}`;
    setSavingCell(cellKey);

    try {
      if (isToday) {
        // Dzisiaj — zapis przez istniejący mechanizm (App.jsx)
        const alreadyWalked = walkHistory[dog.id]?.includes(dateStr);
        if (!alreadyWalked) {
          await onSaveWalk(dog, "spacer");
          setWalkHistory((prev) => ({
            ...prev,
            [dog.id]: [...(prev[dog.id] || []), dateStr],
          }));
        } else {
          // cofnięcie dzisiejszego — tylko usuwa z lokalnego stanu (brak API do usunięcia)
          setWalkHistory((prev) => ({
            ...prev,
            [dog.id]: (prev[dog.id] || []).filter((d) => d !== dateStr),
          }));
        }
      } else if (offset > 0) {
        // Przyszłość — Firestore
        const existing = getPlannedEntry(dog.id, dateStr);
        if (existing) {
          // Tylko twórca lub admin może usunąć
          if (existing.volunteerId !== currentUser.uid && !isAdmin) return;
          await deleteDoc(doc(db, "plannedWalks", existing.docId));
          setPlannedWalks((prev) => {
            const updated = { ...prev };
            if (updated[dog.id]) {
              updated[dog.id] = { ...updated[dog.id] };
              delete updated[dog.id][dateStr];
            }
            return updated;
          });
        } else {
          const docId = `${dog.id}_${dateStr}`;
          await setDoc(doc(db, "plannedWalks", docId), {
            dogId: dog.id,
            date: dateStr,
            volunteerId: currentUser.uid,
            volunteerName: currentUser.displayName || currentUser.email,
            createdAt: new Date().toISOString(),
          });
          setPlannedWalks((prev) => ({
            ...prev,
            [dog.id]: {
              ...(prev[dog.id] || {}),
              [dateStr]: {
                volunteerId: currentUser.uid,
                volunteerName: currentUser.displayName || currentUser.email,
                docId,
              },
            },
          }));
        }
      }
    } catch (e) {
      console.error("Błąd zapisu:", e);
    } finally {
      setSavingCell(null);
    }
  }

  function getCellStyle(dog, day) {
    const walked = hasWalk(dog.id, day.str);
    if (day.offset < 0) return walked ? CELL_STYLES.pastMarked : CELL_STYLES.past;
    if (day.isToday) return walked ? CELL_STYLES.todayMarked : CELL_STYLES.today;
    return walked ? CELL_STYLES.futureMarked : CELL_STYLES.future;
  }

  const headerDayColor = (day) => {
    if (day.isToday) return "#166534";
    if (day.isWeekend) return "#fce7f3";
    return "#dcfce7";
  };

  const headerDayTextColor = (day) => {
    if (day.isToday) return "#fff";
    if (day.isWeekend) return "#9d174d";
    return "#166534";
  };

  if (loading) {
    return (
      <div style={{ padding: "2rem", textAlign: "center", color: "#6b7280" }}>
        Ładowanie tabeli spacerów...
      </div>
    );
  }

  const colWidthPx = (day) => (day.isToday ? 56 : 36);

  return (
    <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch", paddingBottom: "1rem" }}>
      <table style={{ borderCollapse: "collapse", fontSize: "0.75rem", minWidth: "max-content" }}>
        <thead>
          <tr>
            <th style={thStyle("#f9fafb", "#374151", 54)}>Boks</th>
            <th style={thStyle("#f9fafb", "#374151", 160)}>Opiekun (Pies)</th>
            {days.map((day) => (
              <th
                key={day.str}
                style={{
                  ...thBase,
                  width: colWidthPx(day),
                  minWidth: colWidthPx(day),
                  background: headerDayColor(day),
                  color: headerDayTextColor(day),
                  fontWeight: day.isToday ? 700 : 600,
                }}
              >
                <div>{day.dow}</div>
                <div style={{ fontWeight: 400, fontSize: "0.65rem" }}>{day.label}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedDogs.map((dog, idx) => {
            const prevDog = sortedDogs[idx - 1];
            const sectorChanged = prevDog && prevDog.pavilion !== dog.pavilion;
            const opiekunList = opiekunowie[dog.id] || [];
            const opiekunFull = opiekunList.length > 0 ? opiekunList[0] : "";
            const opiekunLabel = opiekunFull
              ? opiekunFull.trim().split(/\s+/).pop()
              : "";
            const dogLabel = opiekunLabel
              ? `${opiekunLabel} (${dog.name})`
              : `(${dog.name})`;
            const rowBg = getSectorColor(dog.pavilion);
            const boks = `${dog.pavilion || ""}${dog.box || ""}`;

            return (
              <tr
                key={dog.id}
                style={{
                  background: rowBg,
                  borderTop: sectorChanged ? "2px solid #9ca3af" : undefined,
                }}
              >
                <td style={{ ...tdStyle(54, rowBg), fontWeight: 700, color: "#374151" }}>
                  {boks}
                </td>
                <td style={{ ...tdStyle(160, rowBg), fontWeight: 500 }}>
                  {dogLabel}
                </td>
                {days.map((day) => {
                  const cellKey = `${dog.id}-${day.str}`;
                  const isSaving = savingCell === cellKey;
                  const walked = hasWalk(dog.id, day.str);
                  const cellStyle = getCellStyle(dog, day);
                  const isClickable = day.offset >= 0;

                  return (
                    <td
                      key={day.str}
                      onClick={() => isClickable && handleCellClick(dog, day)}
                      style={{
                        ...tdBase,
                        width: colWidthPx(day),
                        minWidth: colWidthPx(day),
                        textAlign: "center",
                        fontWeight: 700,
                        fontSize: "0.8rem",
                        userSelect: "none",
                        border: day.isToday ? "2px solid #16a34a" : "1px solid #e5e7eb",
                        ...cellStyle,
                        opacity: isSaving ? 0.5 : 1,
                      }}
                      title={
                        day.offset > 0 && walked
                          ? `Zaplanowany: ${getPlannedEntry(dog.id, day.str)?.volunteerName || ""}`
                          : undefined
                      }
                    >
                      {isSaving ? "…" : walked ? "X" : ""}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const thBase = {
  padding: "0.3rem 0.25rem",
  border: "1px solid #d1d5db",
  textAlign: "center",
  whiteSpace: "nowrap",
  position: "sticky",
  top: 0,
  zIndex: 2,
};

const tdBase = {
  padding: "0.2rem 0.25rem",
  border: "1px solid #e5e7eb",
};

function thStyle(bg, color, width) {
  return {
    ...thBase,
    background: bg,
    color,
    width,
    minWidth: width,
    textAlign: "left",
  };
}

function tdStyle(width, bg) {
  return {
    ...tdBase,
    width,
    minWidth: width,
    background: bg,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    maxWidth: width,
  };
}
