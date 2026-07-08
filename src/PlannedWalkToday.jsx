import React, { useState, useEffect } from "react";
import {
  collection, query, where, onSnapshot,
  doc, deleteDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import { recordWalkFs, syncWalkToSheet } from "./lib/walksStore";

const POLAND_TZ = "Europe/Warsaw";

function toPolandDateStr(date) {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: POLAND_TZ }).format(date);
}

// Baner na karcie psa: "Dziś wyprowadzi mnie: ..." gdy ktoś zaplanował
// spacer na dziś, z potwierdzeniem wykonania. Po wykonaniu (z banera
// albo z tabeli) pokazuje kto wyprowadził.
export default function PlannedWalkToday({ dog, currentUser, isAdmin }) {
  const [planned, setPlanned] = useState(null);
  const [doneEntry, setDoneEntry] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");

  const todayStr = toPolandDateStr(new Date());

  // Plan na dziś dla tego psa (filtry równościowe — bez indeksu złożonego)
  useEffect(() => {
    if (!dog?.id || !db) return;
    const q = query(
      collection(db, "plannedWalks"),
      where("dogId", "==", dog.id),
      where("date", "==", todayStr)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        let entry = null;
        snap.forEach((d) => { entry = { docId: d.id, ...d.data() }; });
        setPlanned(entry);
      },
      (e) => console.error("Błąd pobierania planu spaceru:", e)
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

  async function handleConfirm() {
    if (!currentUser || confirming) return;
    setConfirming(true);
    setError("");
    try {
      await recordWalkFs(todayStr, dog, currentUser, "spacer");
      if (planned?.docId) {
        deleteDoc(doc(db, "plannedWalks", planned.docId)).catch(() => {});
      }
      const synced = await syncWalkToSheet(dog, "spacer", currentUser);
      if (!synced) {
        setError("Spacer zapisany — synchronizacja z arkuszem nastąpi po odzyskaniu zasięgu");
      }
    } catch (e) {
      console.error("Błąd potwierdzania spaceru:", e);
      setError("Nie udało się zapisać — sprawdź zasięg i spróbuj ponownie");
    } finally {
      setConfirming(false);
    }
  }

  // Nic do pokazania
  if (!planned && !doneEntry) return null;

  const canConfirm =
    currentUser &&
    (planned?.volunteerId === currentUser.uid || isAdmin || !planned?.volunteerId);

  return (
    <div style={{ padding: "0.75rem 1.5rem 0" }}>
      {doneEntry ? (
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
      ) : (
        <div style={{
          padding: "0.75rem 1rem",
          borderRadius: "0.75rem",
          background: "#dbeafe",
          border: "1px solid #93c5fd",
          color: "#1e40af",
        }}>
          <div style={{ fontSize: "0.9rem", fontWeight: 700 }}>
            🦮 Dziś wyprowadzi mnie: {planned.volunteerName || "Wolontariusz"}
          </div>
          {canConfirm && (
            <button
              onClick={handleConfirm}
              disabled={confirming}
              style={{
                marginTop: "0.6rem",
                width: "100%",
                padding: "0.6rem",
                borderRadius: "0.5rem",
                border: "none",
                background: confirming ? "#9ca3af" : "#16a34a",
                color: "white",
                fontWeight: 700,
                fontSize: "0.85rem",
                cursor: confirming ? "not-allowed" : "pointer",
              }}
            >
              {confirming ? "Zapisuję..." : "✅ Potwierdź — spacer wykonany"}
            </button>
          )}
          {error && (
            <p style={{ margin: "0.5rem 0 0", fontSize: "0.75rem", color: "#92400e", fontWeight: 600 }}>
              ⚠️ {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
