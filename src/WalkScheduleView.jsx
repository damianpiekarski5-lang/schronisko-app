import React, { useState, useEffect, useCallback, useMemo } from "react";
import { collection, doc, getDoc, setDoc, deleteDoc, onSnapshot, query, where } from "firebase/firestore";
import { db } from "./firebase";
import {
  subscribeDailyWalks,
  recordWalkFs,
  undoWalkFs,
  syncWalkToSheet,
  syncUndoToSheet,
  flushSheetQueue,
} from "./lib/walksStore";

const POLAND_TZ = "Europe/Warsaw";

function toPolandDateStr(date) {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: POLAND_TZ }).format(date);
}

function getTodayStr() {
  return toPolandDateStr(new Date());
}

function buildDateWindow(todayStr) {
  const today = new Date();
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

const TABLE_CACHE_KEY = "walkTableCache_v1";

// Cache danych z arkusza (historia + opiekunowie) — tabela otwiera się
// natychmiast z ostatnich danych, świeże dociągają się w tle
function loadTableCache() {
  try {
    const raw = localStorage.getItem(TABLE_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveTableCache(walkHistory, opiekunowie) {
  try {
    localStorage.setItem(TABLE_CACHE_KEY, JSON.stringify({ ts: Date.now(), walkHistory, opiekunowie }));
  } catch {}
}

const CELL_STYLES = {
  past: { background: "#f3f4f6", cursor: "default" },
  today: { background: "#dcfce7", cursor: "pointer" },
  future: { background: "#fff", cursor: "pointer" },
  todayMarked: { background: "#16a34a", color: "#fff", cursor: "pointer" },
  pastMarked: { background: "#d1fae5", cursor: "default" },
  futureMarked: { background: "#bbf7d0", cursor: "pointer" },
};

export default function WalkScheduleView({ dogs, currentUser, isAdmin }) {
  const [walkHistory, setWalkHistory] = useState(() => loadTableCache()?.walkHistory || {});
  const [dailyWalks, setDailyWalks] = useState({});
  const [plannedWalks, setPlannedWalks] = useState({});
  // Pełne "Ładowanie..." tylko przy pierwszym otwarciu (brak cache)
  const [loading, setLoading] = useState(() => !loadTableCache());
  const [loadError, setLoadError] = useState(false);
  const [opiekunowie, setOpiekunowie] = useState(() => loadTableCache()?.opiekunowie || {});
  const [savingCell, setSavingCell] = useState(null);
  const [banner, setBanner] = useState(null); // {type: "error"|"warning", text}
  const [search, setSearch] = useState("");

  // todayStr jako stan — odświeża się po przekroczeniu północy
  // (PWA zostawiona na noc w telefonie nie zapisuje już pod wczorajszą datą)
  const [todayStr, setTodayStr] = useState(() => getTodayStr());
  useEffect(() => {
    const check = () => {
      const now = getTodayStr();
      setTodayStr((prev) => (prev === now ? prev : now));
    };
    document.addEventListener("visibilitychange", check);
    window.addEventListener("focus", check);
    const interval = setInterval(check, 60000);
    return () => {
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("focus", check);
      clearInterval(interval);
    };
  }, []);

  const days = useMemo(() => buildDateWindow(todayStr), [todayStr]);
  const startDate = days[0].str;
  const endDate = days[days.length - 1].str;

  const loadData = useCallback(async () => {
    setLoadError(false);
    try {
      const [history, opiek] = await Promise.all([
        fetchWalkHistory(startDate, endDate),
        fetchAllOpiekunowie(),
      ]);
      setWalkHistory(history);
      setOpiekunowie(opiek);
      saveTableCache(history, opiek);
    } catch (e) {
      console.error("Błąd ładowania tabeli spacerów:", e);
      // Ekran błędu tylko gdy nie mamy nic z cache
      setLoadError((prev) => prev || !loadTableCache());
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  // Plany na żywo — jednorazowy odczyt potrafił pokazywać nieświeże dane,
  // a próba zapisu na istniejący (niewidoczny) plan kończyła się
  // odmową uprawnień (reguły nie pozwalają nadpisywać planów)
  useEffect(() => {
    if (!db) return;
    const q = query(
      collection(db, "plannedWalks"),
      where("date", ">=", startDate),
      where("date", "<=", endDate)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const result = {};
        snap.forEach((d) => {
          const { dogId, date, volunteerId, volunteerName } = d.data();
          if (!result[dogId]) result[dogId] = {};
          result[dogId][date] = { volunteerId, volunteerName, docId: d.id };
        });
        setPlannedWalks(result);
      },
      (e) => {
        console.error("Błąd subskrypcji planów:", e);
        showBanner("error", `Nie udało się pobrać planów spacerów (${e?.code || "błąd"})`);
      }
    );
    return () => unsub();
  }, [startDate, endDate]);

  useEffect(() => { loadData(); }, [loadData]);

  // Subskrypcja dziennych spacerów z Firestore (na żywo + offline)
  useEffect(() => {
    if (!db) return;
    const unsub = subscribeDailyWalks(
      startDate,
      endDate,
      (data) => setDailyWalks(data),
      () => setBanner({ type: "error", text: "Błąd połączenia z bazą spacerów" })
    );
    return () => unsub();
  }, [startDate, endDate]);

  // Ponów zaległe zapisy do arkusza (start + powrót online)
  useEffect(() => {
    if (!currentUser) return;
    flushSheetQueue(currentUser);
    const onOnline = () => flushSheetQueue(currentUser);
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [currentUser]);

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

  const filteredDogs = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return sortedDogs;
    return sortedDogs.filter((dog) => {
      const boks = `${dog.pavilion || ""}${dog.box || ""}`.toLowerCase();
      const opiekun = (opiekunowie[dog.id] || []).join(" ").toLowerCase();
      return (
        String(dog.name || "").toLowerCase().includes(term) ||
        boks.includes(term) ||
        opiekun.includes(term)
      );
    });
  }, [sortedDogs, search, opiekunowie]);

  // Spacer wykonany (Firestore lub archiwum arkusza) — bez planów
  function hasDoneWalk(dogId, dateStr) {
    if (dailyWalks[dateStr]?.[dogId]) return true;
    if (walkHistory[dogId]?.includes(dateStr)) return true;
    return false;
  }

  function hasWalk(dogId, dateStr) {
    if (hasDoneWalk(dogId, dateStr)) return true;
    if (plannedWalks[dogId]?.[dateStr]) return true;
    return false;
  }

  function getPlannedEntry(dogId, dateStr) {
    return plannedWalks[dogId]?.[dateStr] || null;
  }

  function showBanner(type, text) {
    setBanner({ type, text });
    setTimeout(() => setBanner(null), 6000);
  }

  // Test zapisu do każdej kolekcji — pokazuje, która dokładnie odmawia
  // (diagnoza problemów z regułami Firestore; tylko dla admina)
  async function runWriteDiagnostics() {
    if (!currentUser) return;
    const results = [];

    try {
      await setDoc(
        doc(db, "dailyWalks", todayStr),
        { walks: { __diag: null } },
        { merge: true }
      );
      results.push("dailyWalks ✓");
    } catch (e) {
      results.push(`dailyWalks ✗ (${e?.code || e?.message})`);
    }

    const diagPlanId = `__diag_${currentUser.uid.slice(0, 8)}`;
    try {
      await setDoc(doc(db, "plannedWalks", diagPlanId), {
        dogId: "__diag",
        date: "1970-01-01",
        volunteerId: currentUser.uid,
        volunteerName: "diagnostyka",
        createdAt: new Date().toISOString(),
      });
      results.push("plannedWalks:create ✓");
      try {
        await deleteDoc(doc(db, "plannedWalks", diagPlanId));
        results.push("plannedWalks:delete ✓");
      } catch (e) {
        results.push(`plannedWalks:delete ✗ (${e?.code || e?.message})`);
      }
    } catch (e) {
      results.push(`plannedWalks:create ✗ (${e?.code || e?.message})`);
    }

    const pid = db?.app?.options?.projectId || "?";
    showBanner(
      results.some((r) => r.includes("✗")) ? "error" : "warning",
      `Diagnostyka (projekt ${pid}): ${results.join(" · ")}`
    );
  }

  async function handleCellClick(dog, day) {
    if (day.offset < 0) return; // przeszłe — tylko odczyt
    if (!currentUser) return;
    if (savingCell) return; // blokada podwójnego tapnięcia

    const { str: dateStr, isToday, offset } = day;
    const cellKey = `${dog.id}-${dateStr}`;
    setSavingCell(cellKey);

    try {
      if (isToday) {
        const fsEntry = dailyWalks[dateStr]?.[dog.id];
        const legacyWalked = walkHistory[dog.id]?.includes(dateStr);
        const plannedToday = getPlannedEntry(dog.id, dateStr);

        if (!fsEntry && !legacyWalked) {
          // Zapis spaceru: najpierw Firestore (natychmiastowe, działa offline),
          // potem arkusz w tle (przy błędzie ląduje w kolejce ponawiania)
          await recordWalkFs(dateStr, dog, currentUser, "spacer");
          // Jeśli był zaplanowany na dziś — plan staje się wykonany, sprzątamy
          if (plannedToday && (plannedToday.volunteerId === currentUser.uid || isAdmin)) {
            deleteDoc(doc(db, "plannedWalks", plannedToday.docId)).catch(() => {});
            setPlannedWalks((prev) => {
              const updated = { ...prev, [dog.id]: { ...(prev[dog.id] || {}) } };
              delete updated[dog.id][dateStr];
              return updated;
            });
          }
          const synced = await syncWalkToSheet(dog, "spacer", currentUser);
          if (!synced) {
            showBanner("warning", "Spacer zapisany — synchronizacja z arkuszem nastąpi po odzyskaniu zasięgu");
          }
        } else {
          // Cofnięcie dzisiejszego spaceru (prawdziwe — Firestore + arkusz)
          if (fsEntry && fsEntry.volunteerId !== currentUser.uid && !isAdmin) {
            showBanner("warning", `Ten spacer zapisał(a) ${fsEntry.volunteerName} — tylko ta osoba lub admin może go cofnąć`);
            return;
          }
          if (fsEntry) await undoWalkFs(dateStr, dog.id);
          if (legacyWalked) {
            setWalkHistory((prev) => ({
              ...prev,
              [dog.id]: (prev[dog.id] || []).filter((d) => d !== dateStr),
            }));
          }
          const synced = await syncUndoToSheet(dog.id, dateStr, currentUser);
          if (!synced) {
            showBanner("warning", "Cofnięto — synchronizacja z arkuszem nastąpi po odzyskaniu zasięgu");
          }
        }
      } else if (offset > 0) {
        // Przyszłość — planowanie w Firestore
        const existing = getPlannedEntry(dog.id, dateStr);
        if (existing) {
          // Tylko twórca lub admin może usunąć
          if (existing.volunteerId !== currentUser.uid && !isAdmin) {
            showBanner("warning", `Zaplanował(a) ${existing.volunteerName} — tylko ta osoba lub admin może odwołać`);
            return;
          }
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
          try {
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
          } catch (e) {
            // Reguły nie pozwalają nadpisać istniejącego planu — jeśli pod tym
            // id siedzi stary/niewidoczny dokument, pokaż go i pozwól odwołać
            if (e?.code === "permission-denied") {
              const snap = await getDoc(doc(db, "plannedWalks", docId));
              if (snap.exists()) {
                const d = snap.data();
                setPlannedWalks((prev) => ({
                  ...prev,
                  [dog.id]: {
                    ...(prev[dog.id] || {}),
                    [dateStr]: {
                      volunteerId: d.volunteerId || "",
                      volunteerName: d.volunteerName || "nieznany",
                      docId,
                    },
                  },
                }));
                showBanner("warning", `Ten termin miał już plan (${d.volunteerName || "nieznany"}) — kliknij ponownie, aby go odwołać`);
                return;
              }
            }
            throw e;
          }
        }
      }
    } catch (e) {
      console.error("Błąd zapisu:", e);
      if (e?.code === "permission-denied") {
        const pid = db?.app?.options?.projectId || "?";
        const who = currentUser?.uid ? `uid ${String(currentUser.uid).slice(0, 6)}…` : "NIEZALOGOWANY";
        showBanner("error", `Brak uprawnień zapisu (projekt: ${pid}, ${who}) — porównaj z projektem, w którym wgrano reguły Firestore`);
      } else if (e?.code === "unavailable") {
        showBanner("error", "Brak połączenia z bazą — zapis spróbuje się ponowić automatycznie");
      } else {
        showBanner("error", `Nie udało się zapisać (${e?.code || e?.message || "nieznany błąd"}) — spróbuj ponownie`);
      }
    } finally {
      setSavingCell(null);
    }
  }

  function getCellStyle(dog, day) {
    const done = hasDoneWalk(dog.id, day.str);
    const planned = !done && !!getPlannedEntry(dog.id, day.str);
    if (day.offset < 0) return done || planned ? CELL_STYLES.pastMarked : CELL_STYLES.past;
    if (day.isToday) {
      if (done) return CELL_STYLES.todayMarked;
      // zaplanowany, ale jeszcze nie wykonany — jasna zieleń jak plan
      if (planned) return CELL_STYLES.futureMarked;
      return CELL_STYLES.today;
    }
    return done || planned ? CELL_STYLES.futureMarked : CELL_STYLES.future;
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

  if (loadError) {
    return (
      <div style={{ padding: "2rem", textAlign: "center", color: "#6b7280" }}>
        <p style={{ marginBottom: "1rem" }}>⚠️ Nie udało się załadować tabeli spacerów</p>
        <button
          onClick={loadData}
          style={{
            padding: "0.6rem 1.5rem", borderRadius: "0.5rem", border: "none",
            background: "#2563eb", color: "white", fontWeight: 600, cursor: "pointer",
          }}
        >
          Spróbuj ponownie
        </button>
      </div>
    );
  }

  // >=48px — wygodne dla palca (także w rękawiczce)
  const colWidthPx = (day) => (day.isToday ? 64 : 48);

  return (
    <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch", paddingBottom: "1rem" }}>
      {banner && (
        <div style={{
          position: "sticky",
          left: 0,
          margin: "0 0 0.5rem",
          padding: "0.5rem 0.75rem",
          borderRadius: "0.5rem",
          fontSize: "0.8rem",
          fontWeight: 600,
          background: banner.type === "error" ? "#fee2e2" : "#fef3c7",
          color: banner.type === "error" ? "#991b1b" : "#92400e",
          border: `1px solid ${banner.type === "error" ? "#fca5a5" : "#fde68a"}`,
        }}>
          {banner.text}
        </div>
      )}
      <div style={{ position: "sticky", left: 0, padding: "0.25rem 0 0.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "#111827", margin: 0 }}>
            📋 Harmonogram wyjść
          </h2>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Szukaj: pies, boks, opiekun..."
            style={{
              flex: 1,
              minWidth: 160,
              padding: "0.45rem 0.6rem",
              border: "1px solid #d1d5db",
              borderRadius: "0.5rem",
              fontSize: "0.85rem",
              boxSizing: "border-box",
            }}
          />
          {isAdmin && (
            <button
              onClick={runWriteDiagnostics}
              title="Testuje zapis do każdej kolekcji Firestore i pokazuje, która odmawia"
              style={{
                padding: "0.45rem 0.7rem",
                border: "1px solid #d1d5db",
                borderRadius: "0.5rem",
                background: "#f9fafb",
                color: "#374151",
                fontSize: "0.78rem",
                fontWeight: 600,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              🔧 Test zapisu
            </button>
          )}
        </div>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", fontSize: "0.75rem", color: "#4b5563", marginTop: "0.4rem" }}>
          <span><span style={{ background: "#16a34a", color: "white", padding: "0 5px", borderRadius: 3, fontWeight: 700 }}>X</span> dziś wykonany</span>
          <span><span style={{ background: "#bbf7d0", padding: "0 5px", borderRadius: 3, fontWeight: 700 }}>P</span> zaplanowany</span>
          <span><span style={{ background: "#d1fae5", padding: "0 5px", borderRadius: 3, fontWeight: 700 }}>X</span> wykonany wcześniej</span>
          <span>Kliknij dziś/przyszłość aby zapisać lub cofnąć</span>
        </div>
      </div>
      <table style={{ borderCollapse: "collapse", fontSize: "0.8rem", minWidth: "max-content" }}>
        <thead>
          <tr>
            <th style={{ ...thStyle("#f9fafb", "#374151", 62), left: 0, zIndex: 4 }}>Boks</th>
            <th style={{ ...thStyle("#f9fafb", "#374151", 160), left: 62, zIndex: 4 }}>Opiekun (Pies)</th>
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
                <div style={{ fontWeight: 400, fontSize: "0.72rem" }}>{day.label}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filteredDogs.map((dog, idx) => {
            const prevDog = filteredDogs[idx - 1];
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
                <td style={{ ...tdStyle(62, rowBg), fontWeight: 700, color: "#374151", position: "sticky", left: 0, zIndex: 1 }}>
                  {boks}
                </td>
                <td style={{ ...tdStyle(160, rowBg), fontWeight: 500, position: "sticky", left: 62, zIndex: 1 }}>
                  {dogLabel}
                </td>
                {days.map((day) => {
                  const cellKey = `${dog.id}-${day.str}`;
                  const isSaving = savingCell === cellKey;
                  const done = hasDoneWalk(dog.id, day.str);
                  const planned = !done && !!getPlannedEntry(dog.id, day.str);
                  const walked = done || planned;
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
                      {isSaving ? "…" : done ? "X" : planned ? "P" : ""}
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
  padding: "0.55rem 0.25rem",
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
