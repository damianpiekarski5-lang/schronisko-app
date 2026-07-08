import React, { useState, useEffect, useMemo } from "react";
import {
  collection, query, where, onSnapshot,
  doc, setDoc, deleteDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import { recordWalkFs, syncWalkToSheet } from "./lib/walksStore";

const POLAND_TZ = "Europe/Warsaw";

function toPolandDateStr(date) {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: POLAND_TZ }).format(date);
}

function dateWithOffset(offsetDays) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return toPolandDateStr(d);
}

function dayLabel(offset) {
  if (offset === 0) return "Dziś";
  if (offset === 1) return "Jutro";
  return "Pojutrze";
}

function friendlyError(e) {
  if (e?.code === "permission-denied") {
    return "Brak uprawnień zapisu — administrator musi wgrać aktualne reguły Firestore";
  }
  return "Nie udało się zapisać — sprawdź zasięg i spróbuj ponownie";
}

// Sekcja spacerów na karcie psa:
// - "Dziś wyprowadzi mnie: X" + potwierdzenie wykonania
// - "Dziś wyprowadził(a) mnie: X" po wykonaniu
// - planowanie spaceru (dziś/jutro/pojutrze) i odwoływanie własnych planów
export default function PlannedWalkToday({ dog, currentUser, isAdmin }) {
  const [plans, setPlans] = useState([]);
  const [doneEntry, setDoneEntry] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showPlanner, setShowPlanner] = useState(false);

  const todayStr = toPolandDateStr(new Date());

  // Wszystkie plany tego psa (jeden filtr równościowy — bez indeksu
  // złożonego); daty filtrujemy po stronie klienta
  useEffect(() => {
    if (!dog?.id || !db) return;
    const q = query(collection(db, "plannedWalks"), where("dogId", "==", dog.id));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const result = [];
        snap.forEach((d) => result.push({ docId: d.id, ...d.data() }));
        setPlans(result.filter((p) => p.date >= todayStr).sort((a, b) => a.date.localeCompare(b.date)));
      },
      (e) => console.error("Błąd pobierania planów spaceru:", e)
    );
    return () => unsub();
  }, [dog?.id, todayStr]);

  // Dzisiejszy wykonany spacer (dokument dnia w dailyWalks)
  useEffect(() => {
    if (!dog?.id || !db) return;
    const unsub = onSnapshot(
      doc(db, "dailyWalks", todayStr),
      (snap) => {
        setDoneEntry(snap.data()?.walks?.[dog.id] || null);
      },
      (e) => console.error("Błąd pobierania spacerów dnia:", e)
    );
    return () => unsub();
  }, [dog?.id, todayStr]);

  const planToday = useMemo(() => plans.find((p) => p.date === todayStr) || null, [plans, todayStr]);
  const futurePlans = useMemo(() => plans.filter((p) => p.date > todayStr), [plans, todayStr]);

  async function handleConfirm() {
    if (!currentUser || busy) return;
    setBusy(true);
    setError("");
    try {
      await recordWalkFs(todayStr, dog, currentUser, "spacer");
      if (planToday?.docId) {
        deleteDoc(doc(db, "plannedWalks", planToday.docId)).catch(() => {});
      }
      const synced = await syncWalkToSheet(dog, "spacer", currentUser);
      if (!synced) {
        setError("Spacer zapisany — synchronizacja z arkuszem nastąpi po odzyskaniu zasięgu");
      }
    } catch (e) {
      console.error("Błąd potwierdzania spaceru:", e);
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }

  async function handlePlan(dateStr) {
    if (!currentUser || busy) return;
    setBusy(true);
    setError("");
    try {
      await setDoc(doc(db, "plannedWalks", `${dog.id}_${dateStr}`), {
        dogId: dog.id,
        date: dateStr,
        volunteerId: currentUser.uid,
        volunteerName: currentUser.displayName || currentUser.email || "Wolontariusz",
        createdAt: new Date().toISOString(),
      });
      setShowPlanner(false);
    } catch (e) {
      console.error("Błąd planowania spaceru:", e);
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }

  async function handleCancelPlan(plan) {
    if (!currentUser || busy) return;
    const isOwner = plan.volunteerId === currentUser.uid;
    if (!isOwner && !isAdmin) return;
    if (!window.confirm(`Odwołać plan spaceru (${plan.date})?`)) return;
    setBusy(true);
    setError("");
    try {
      await deleteDoc(doc(db, "plannedWalks", plan.docId));
    } catch (e) {
      console.error("Błąd odwoływania planu:", e);
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }

  if (!currentUser && plans.length === 0 && !doneEntry) return null;

  const plannedDates = new Set(plans.map((p) => p.date));
  const plannerOptions = [0, 1, 2]
    .map((offset) => ({ offset, date: dateWithOffset(offset) }))
    .filter(({ offset, date }) => !plannedDates.has(date) && !(offset === 0 && doneEntry));

  return (
    <div style={{ padding: "0.75rem 1.5rem 0" }}>
      {/* Dziś — wykonany */}
      {doneEntry && (
        <div style={{
          padding: "0.75rem 1rem",
          borderRadius: "0.75rem",
          background: "#dcfce7",
          border: "1px solid #86efac",
          color: "#166534",
          fontSize: "0.9rem",
          fontWeight: 600,
        }}>
          ✅ Dziś wyprowadził(a) mnie: {doneEntry.volunteerName || "Wolontariusz"}
          {doneEntry.at && (
            <span style={{ fontWeight: 400, fontSize: "0.78rem", marginLeft: "0.4rem", color: "#15803d" }}>
              ({String(doneEntry.at).slice(11, 16)})
            </span>
          )}
        </div>
      )}

      {/* Dziś — zaplanowany, niewykonany */}
      {!doneEntry && planToday && (
        <div style={{
          padding: "0.75rem 1rem",
          borderRadius: "0.75rem",
          background: "#dbeafe",
          border: "1px solid #93c5fd",
          color: "#1e40af",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
            <span style={{ fontSize: "0.9rem", fontWeight: 700 }}>
              🦮 Dziś wyprowadzi mnie: {planToday.volunteerName || "Wolontariusz"}
            </span>
            {(planToday.volunteerId === currentUser?.uid || isAdmin) && (
              <button
                onClick={() => handleCancelPlan(planToday)}
                disabled={busy}
                style={{ background: "none", border: "none", color: "#6b7280", cursor: "pointer", fontSize: "0.75rem", textDecoration: "underline", whiteSpace: "nowrap" }}
              >
                odwołaj
              </button>
            )}
          </div>
          {currentUser && (
            <button
              onClick={handleConfirm}
              disabled={busy}
              style={{
                marginTop: "0.6rem",
                width: "100%",
                padding: "0.6rem",
                borderRadius: "0.5rem",
                border: "none",
                background: busy ? "#9ca3af" : "#16a34a",
                color: "white",
                fontWeight: 700,
                fontSize: "0.85rem",
                cursor: busy ? "not-allowed" : "pointer",
              }}
            >
              {busy ? "Zapisuję..." : "✅ Potwierdź — spacer wykonany"}
            </button>
          )}
        </div>
      )}

      {/* Przyszłe plany */}
      {futurePlans.map((plan) => (
        <div key={plan.docId} style={{
          marginTop: "0.5rem",
          padding: "0.5rem 0.75rem",
          borderRadius: "0.5rem",
          background: "#eff6ff",
          border: "1px solid #bfdbfe",
          color: "#1e40af",
          fontSize: "0.8rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "0.5rem",
        }}>
          <span>🗓 {plan.date === dateWithOffset(1) ? "Jutro" : plan.date} wyprowadzi: <strong>{plan.volunteerName}</strong></span>
          {(plan.volunteerId === currentUser?.uid || isAdmin) && (
            <button
              onClick={() => handleCancelPlan(plan)}
              disabled={busy}
              style={{ background: "none", border: "none", color: "#6b7280", cursor: "pointer", fontSize: "0.75rem", textDecoration: "underline", whiteSpace: "nowrap" }}
            >
              odwołaj
            </button>
          )}
        </div>
      ))}

      {/* Planowanie */}
      {currentUser && plannerOptions.length > 0 && (
        <div style={{ marginTop: doneEntry || planToday || futurePlans.length > 0 ? "0.5rem" : 0 }}>
          {!showPlanner ? (
            <button
              onClick={() => setShowPlanner(true)}
              style={{
                background: "#f3f4f6",
                border: "1px solid #e5e7eb",
                borderRadius: "9999px",
                color: "#374151",
                fontSize: "0.8rem",
                fontWeight: 600,
                padding: "0.4rem 0.9rem",
                cursor: "pointer",
              }}
            >
              🦮 Zaplanuj spacer
            </button>
          ) : (
            <div style={{
              padding: "0.6rem 0.75rem",
              borderRadius: "0.75rem",
              background: "#f9fafb",
              border: "1px solid #e5e7eb",
            }}>
              <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "#374151", marginBottom: "0.5rem" }}>
                Kiedy planujesz spacer?
              </div>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                {plannerOptions.map(({ offset, date }) => (
                  <button
                    key={date}
                    onClick={() => handlePlan(date)}
                    disabled={busy}
                    style={{
                      flex: 1,
                      minWidth: 80,
                      padding: "0.5rem",
                      borderRadius: "0.5rem",
                      border: "1px solid #93c5fd",
                      background: "#dbeafe",
                      color: "#1e40af",
                      fontWeight: 700,
                      fontSize: "0.8rem",
                      cursor: busy ? "not-allowed" : "pointer",
                      opacity: busy ? 0.6 : 1,
                    }}
                  >
                    {dayLabel(offset)}
                    <div style={{ fontWeight: 400, fontSize: "0.68rem" }}>{date.slice(8)}.{date.slice(5, 7)}</div>
                  </button>
                ))}
                <button
                  onClick={() => setShowPlanner(false)}
                  style={{ background: "none", border: "none", color: "#6b7280", cursor: "pointer", fontSize: "0.8rem" }}
                >
                  Anuluj
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <p style={{ margin: "0.5rem 0 0", fontSize: "0.75rem", color: "#92400e", fontWeight: 600 }}>
          ⚠️ {error}
        </p>
      )}
    </div>
  );
}
