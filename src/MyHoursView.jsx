import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Trash2 } from "lucide-react";
import {
  subscribeMonthVisits, deleteVisit, toDate,
  visitMinutes, countedMinutes, formatMinutes, formatClock,
  monthKey, isCapped, MAX_VISIT_HOURS,
} from "./lib/attendanceStore";

// „Moje godziny" — miesięczne podsumowanie obecności wolontariusza
// wraz z listą pojedynczych wizyt.

const S = {
  page: { minHeight: "100vh", backgroundColor: "#f9fafb", paddingBottom: "90px" },
  header: {
    backgroundColor: "white", borderBottom: "1px solid #e5e7eb", position: "sticky", top: 0,
    zIndex: 100, padding: "1rem", display: "flex", alignItems: "center", gap: "0.75rem",
  },
  headerTitle: { fontSize: "1.2rem", fontWeight: 700, color: "#111827", flex: 1 },
  content: { padding: "1rem" },
  card: {
    backgroundColor: "white", borderRadius: "0.75rem", padding: "1rem",
    marginBottom: "0.75rem", border: "1px solid #e5e7eb",
  },
  row: { display: "flex", alignItems: "center", gap: "0.5rem" },
  input: {
    padding: "0.6rem 0.7rem", borderRadius: "0.75rem", border: "1px solid #d1d5db",
    fontSize: "0.9rem", backgroundColor: "white", color: "#111827", boxSizing: "border-box",
  },
  summaryNum: { fontSize: "2rem", fontWeight: 800, color: "#2563eb", lineHeight: 1.1 },
  label: { fontSize: "0.8rem", color: "#6b7280" },
  empty: { textAlign: "center", padding: "2rem 1rem", color: "#9ca3af" },
  visitRow: {
    display: "flex", alignItems: "center", gap: "0.6rem",
    padding: "0.55rem 0", borderBottom: "1px solid #f3f4f6", fontSize: "0.86rem",
  },
  iconBtn: { background: "none", border: "none", cursor: "pointer", padding: "0.25rem", color: "#9ca3af" },
  badgeOpen: {
    fontSize: "0.7rem", fontWeight: 700, color: "#16a34a",
    backgroundColor: "#dcfce7", padding: "0.1rem 0.45rem", borderRadius: "999px",
  },
};

const MONTHS = [
  "styczeń", "luty", "marzec", "kwiecień", "maj", "czerwiec",
  "lipiec", "sierpień", "wrzesień", "październik", "listopad", "grudzień",
];

function monthLabel(m) {
  const [y, mm] = String(m).split("-");
  return `${MONTHS[Number(mm) - 1] || mm} ${y}`;
}

function dayLabel(ts) {
  const d = toDate(ts);
  if (!d) return "—";
  return d.toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit" });
}

export default function MyHoursView({ currentUser, onBack }) {
  const [month, setMonth] = useState(() => monthKey());
  const [visits, setVisits] = useState([]);
  const [loaded, setLoaded] = useState(false);

  const uid = currentUser?.uid;

  useEffect(() => {
    if (!uid) return undefined;
    setLoaded(false);
    return subscribeMonthVisits(
      uid,
      month,
      (rows) => { setVisits(rows); setLoaded(true); },
      () => setLoaded(true)
    );
  }, [uid, month]);

  const now = Date.now();

  const { totalMin, days, openCount } = useMemo(() => {
    const uniqueDays = new Set(visits.map((v) => v.date).filter(Boolean));
    return {
      totalMin: visits.reduce((sum, v) => sum + countedMinutes(v, now), 0),
      days: uniqueDays.size,
      openCount: visits.filter((v) => !v.endAt).length,
    };
  }, [visits, now]);

  const handleDelete = async (visit) => {
    if (!window.confirm(
      `Usunąć wpis z ${dayLabel(visit.startAt)} (${formatClock(visit.startAt)})?\n\nTej operacji nie można cofnąć.`
    )) return;
    try {
      await deleteVisit(visit.id);
    } catch (e) {
      console.error("Błąd usuwania wpisu obecności:", e);
      alert("Nie udało się usunąć wpisu.");
    }
  };

  return (
    <div style={S.page}>
      <div style={S.header}>
        {onBack && (
          <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", padding: "0.25rem" }}>
            <ArrowLeft size={22} color="#374151" />
          </button>
        )}
        <div style={S.headerTitle}>Moje godziny</div>
      </div>

      <div style={S.content}>
        <div style={S.card}>
          <label style={S.label}>Miesiąc</label>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value || monthKey())}
            style={{ ...S.input, width: "100%", marginTop: "0.3rem" }}
          />
        </div>

        <div style={S.card}>
          <div style={S.label}>{monthLabel(month)}</div>
          <div style={S.summaryNum}>{formatMinutes(totalMin)}</div>
          <div style={{ ...S.label, marginTop: "0.35rem" }}>
            {visits.length === 0
              ? "brak wizyt"
              : `${visits.length} ${visits.length === 1 ? "wizyta" : "wizyt"} · ${days} ${days === 1 ? "dzień" : "dni"} w schronisku`}
          </div>
          {openCount > 0 && (
            <div style={{ fontSize: "0.78rem", color: "#16a34a", marginTop: "0.35rem", fontWeight: 600 }}>
              Trwająca obecność jest doliczana na bieżąco.
            </div>
          )}
        </div>

        {!loaded ? (
          <div style={S.empty}>Ładowanie…</div>
        ) : visits.length === 0 ? (
          <div style={S.empty}>
            <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🕒</div>
            <div>Brak zapisanych obecności w tym miesiącu</div>
            <div style={{ fontSize: "0.82rem", marginTop: "0.25rem" }}>
              Odbij wejście przyciskiem „Jestem" na ekranie startowym
            </div>
          </div>
        ) : (
          <div style={S.card}>
            {visits.map((v) => {
              const open = !v.endAt;
              const mins = visitMinutes(v, now);
              const capped = isCapped(v, now);
              return (
                <div key={v.id} style={S.visitRow}>
                  <div style={{ width: 48, color: "#6b7280" }}>{dayLabel(v.startAt)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {formatClock(v.startAt)} – {open ? "trwa" : formatClock(v.endAt)}
                    {capped && (
                      <div style={{ fontSize: "0.72rem", color: "#b45309" }}>
                        liczone jako {MAX_VISIT_HOURS} godz
                      </div>
                    )}
                  </div>
                  <div style={{ fontWeight: 700, color: "#111827" }}>{formatMinutes(mins)}</div>
                  {open ? (
                    <span style={S.badgeOpen}>trwa</span>
                  ) : (
                    <button onClick={() => handleDelete(v)} style={S.iconBtn} title="Usuń wpis">
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
