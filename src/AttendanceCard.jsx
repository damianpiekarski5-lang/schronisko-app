import React, { useEffect, useState, useCallback } from "react";
import { Clock, Play, Square } from "lucide-react";
import {
  subscribeOpenVisit, subscribeMonthVisits, startVisit, endVisit,
  visitMinutes, countedMinutes, formatMinutes, formatClock,
  monthKey, MAX_VISIT_HOURS,
} from "./lib/attendanceStore";

// Karta „Jestem w schronisku" — odbicie wejścia i wyjścia oraz licznik
// godzin w bieżącym miesiącu. Widoczna na ekranie startowym.

const S = {
  card: {
    backgroundColor: "white", borderRadius: "0.75rem", padding: "0.9rem 1rem",
    border: "1px solid #e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
    marginBottom: "1rem",
  },
  cardActive: { borderColor: "#16a34a", backgroundColor: "#f0fdf4" },
  row: { display: "flex", alignItems: "center", gap: "0.75rem" },
  btn: {
    padding: "0.7rem 1rem", borderRadius: "0.75rem", border: "none", cursor: "pointer",
    fontSize: "0.92rem", fontWeight: 700, display: "flex", alignItems: "center",
    justifyContent: "center", gap: "0.4rem", whiteSpace: "nowrap",
  },
  btnStart: { backgroundColor: "#2563eb", color: "white" },
  btnStop: { backgroundColor: "#dc2626", color: "white" },
  label: { fontSize: "0.78rem", color: "#6b7280" },
  big: { fontSize: "1.35rem", fontWeight: 800, color: "#111827", lineHeight: 1.1 },
  month: { fontSize: "0.82rem", color: "#374151", marginTop: "0.55rem", paddingTop: "0.55rem", borderTop: "1px solid #e5e7eb" },
  warn: { fontSize: "0.78rem", color: "#b45309", marginTop: "0.5rem", fontWeight: 600 },
  err: { fontSize: "0.78rem", color: "#dc2626", marginTop: "0.5rem", fontWeight: 600 },
  link: {
    background: "none", border: "none", padding: 0, cursor: "pointer",
    color: "#2563eb", fontSize: "0.8rem", fontWeight: 600,
  },
};

// Rozróżnienie przyczyn — "sprawdź połączenie" przy odmowie uprawnień
// wysyłało w złą stronę. permission-denied oznacza zwykle niewdrożone
// reguły Firestore dla kolekcji attendance.
function describeError(e, co) {
  const code = e?.code || "";
  if (code === "permission-denied") {
    return `Baza odrzuciła zapis ${co} (brak uprawnień). Reguły Firestore dla obecności `
      + "nie zostały jeszcze wdrożone — zgłoś to administratorowi aplikacji.";
  }
  if (code === "unavailable" || code === "failed-precondition") {
    return `Brak połączenia z bazą — nie udało się zapisać ${co}. Spróbuj ponownie za chwilę.`;
  }
  if (code === "unauthenticated") {
    return "Sesja wygasła. Wyloguj się i zaloguj ponownie.";
  }
  return `Nie udało się zapisać ${co}.` + (code ? ` (kod: ${code})` : "");
}

export default function AttendanceCard({ currentUser, onShowHours }) {
  const [openVisit, setOpenVisit] = useState(null);
  const [monthVisits, setMonthVisits] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [, setTick] = useState(0);

  const uid = currentUser?.uid;
  const month = monthKey();

  useEffect(() => {
    if (!uid) return undefined;
    const unsub = subscribeOpenVisit(
      uid,
      (v) => { setOpenVisit(v); setLoaded(true); },
      () => { setLoaded(true); setError("Nie udało się sprawdzić obecności."); }
    );
    return unsub;
  }, [uid]);

  useEffect(() => {
    if (!uid) return undefined;
    return subscribeMonthVisits(uid, month, setMonthVisits, () => {});
  }, [uid, month]);

  // Odświeżanie licznika trwającej wizyty.
  useEffect(() => {
    if (!openVisit) return undefined;
    const id = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(id);
  }, [openVisit]);

  const handleStart = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      await startVisit(currentUser);
    } catch (e) {
      console.error("Błąd rozpoczęcia obecności:", e);
      setError(describeError(e, "wejścia"));
    } finally {
      setBusy(false);
    }
  }, [currentUser]);

  const handleStop = useCallback(async () => {
    if (!openVisit) return;
    const mins = visitMinutes(openVisit);
    if (mins > MAX_VISIT_HOURS * 60
      && !window.confirm(
        `Ta obecność trwa już ${formatMinutes(mins)}. Wygląda na to, że nie została zakończona wcześniej.\n\n`
        + `Do miesięcznej sumy zaliczy się maksymalnie ${MAX_VISIT_HOURS} godz.\n\nZakończyć teraz?`
      )) return;

    setBusy(true);
    setError("");
    try {
      await endVisit(openVisit.id);
    } catch (e) {
      console.error("Błąd zakończenia obecności:", e);
      setError(describeError(e, "wyjścia"));
    } finally {
      setBusy(false);
    }
  }, [openVisit]);

  if (!uid) return null;

  const now = Date.now();
  const monthMinutes = monthVisits.reduce((sum, v) => sum + countedMinutes(v, now), 0);
  const elapsed = openVisit ? visitMinutes(openVisit, now) : 0;
  const tooLong = openVisit && elapsed > MAX_VISIT_HOURS * 60;

  return (
    <div style={{ ...S.card, ...(openVisit ? S.cardActive : {}) }}>
      <div style={S.row}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {!loaded ? (
            <div style={S.label}>Sprawdzam obecność…</div>
          ) : openVisit ? (
            <>
              <div style={S.label}>
                Jesteś w schronisku od {formatClock(openVisit.startAt)}
              </div>
              <div style={S.big}>{formatMinutes(elapsed)}</div>
            </>
          ) : (
            <>
              <div style={S.label}>Nie jesteś odbity w schronisku</div>
              <div style={{ ...S.big, fontSize: "1rem", color: "#374151" }}>
                Zaznacz, gdy zaczynasz
              </div>
            </>
          )}
        </div>

        {loaded && (openVisit ? (
          <button onClick={handleStop} disabled={busy}
            style={{ ...S.btn, ...S.btnStop, opacity: busy ? 0.6 : 1 }}>
            <Square size={16} /> {busy ? "…" : "Kończę"}
          </button>
        ) : (
          <button onClick={handleStart} disabled={busy}
            style={{ ...S.btn, ...S.btnStart, opacity: busy ? 0.6 : 1 }}>
            <Play size={16} /> {busy ? "…" : "Jestem"}
          </button>
        ))}
      </div>

      {tooLong && (
        <div style={S.warn}>
          ⚠️ Ta obecność trwa ponad {MAX_VISIT_HOURS} godz. Jeśli zapomniałeś zakończyć —
          zrób to teraz. Do sumy zaliczy się maksymalnie {MAX_VISIT_HOURS} godz.
        </div>
      )}

      {error && <div style={S.err}>{error}</div>}

      <div style={{ ...S.month, ...S.row, justifyContent: "space-between" }}>
        <span>
          <Clock size={13} style={{ verticalAlign: "-2px", marginRight: "0.3rem", opacity: 0.6 }} />
          W tym miesiącu: <strong>{formatMinutes(monthMinutes)}</strong>
        </span>
        {onShowHours && (
          <button onClick={onShowHours} style={S.link}>Szczegóły →</button>
        )}
      </div>
    </div>
  );
}
