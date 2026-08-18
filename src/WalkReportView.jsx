import React, { useState, useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { postGs } from "./api/behawiorystaApi";
import { useUserRole } from "./hooks/useUserRole";
import { canViewWalkReport } from "./lib/roles";

// Miesięczny raport spacerów — kto i kiedy wyprowadzał danego psa.
// Dane pochodzą wyłącznie z arkusza "Spacery", w którym imię psa i wolontariusz
// zapisywane są w chwili spaceru. Dzięki temu raport obejmuje również psy,
// które od tego czasu opuściły schronisko.

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
  label: { fontSize: "0.82rem", fontWeight: 600, color: "#374151", marginBottom: "0.3rem", display: "block" },
  input: {
    width: "100%", padding: "0.65rem 0.75rem", borderRadius: "0.75rem", border: "1px solid #d1d5db",
    fontSize: "0.9rem", backgroundColor: "white", color: "#111827", boxSizing: "border-box",
  },
  btn: { padding: "0.65rem 1.2rem", borderRadius: "0.75rem", border: "none", cursor: "pointer", fontSize: "0.9rem", fontWeight: 600 },
  btnPrimary: { backgroundColor: "#2563eb", color: "white" },
  btnSecondary: { backgroundColor: "#f3f4f6", color: "#374151" },
  row: { display: "flex", alignItems: "center", gap: "0.5rem" },
  emptyState: { textAlign: "center", padding: "2rem 1rem", color: "#9ca3af" },
  error: { fontSize: "0.82rem", color: "#dc2626", marginTop: "0.5rem", fontWeight: 600 },
};

const MONTH_NAMES = [
  "styczeń", "luty", "marzec", "kwiecień", "maj", "czerwiec",
  "lipiec", "sierpień", "wrzesień", "październik", "listopad", "grudzień",
];

function monthLabel(m) {
  const [y, mm] = String(m).split("-");
  const idx = Number(mm) - 1;
  return `${MONTH_NAMES[idx] || mm} ${y}`;
}

function dayAndTime(stamp) {
  // "YYYY-MM-DD HH:mm:ss" → { day: "05.03", time: "14:30" }
  const [datePart, timePart] = String(stamp).split(" ");
  const [, mm, dd] = (datePart || "").split("-");
  return {
    day: dd && mm ? `${dd}.${mm}` : datePart || "—",
    time: timePart ? timePart.slice(0, 5) : "",
  };
}

export default function WalkReportView({ currentUser, onBack }) {
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Widok może zostać przywrócony z sessionStorage po zmianie konta —
  // rola bez uprawnień wraca na start. Serwer i tak weryfikuje niezależnie.
  const { role, loading: roleLoading } = useUserRole();
  const allowed = canViewWalkReport(role);

  useEffect(() => {
    if (!roleLoading && !allowed && onBack) onBack();
  }, [roleLoading, allowed, onBack]);

  if (!roleLoading && !allowed) return null;

  const generate = async () => {
    setLoading(true);
    setError("");
    setReport(null);
    try {
      const res = await postGs("getWalksReport", { month }, () => currentUser.getIdToken());
      if (!res.ok) {
        setError(res.error || "Nie udało się pobrać raportu");
        return;
      }
      const entries = res.data?.entries || [];

      // Grupowanie po psie — klucz to dogId, ale nazwę bierzemy z najnowszego
      // wpisu, bo pies mógł zostać przemianowany w trakcie pobytu.
      const byDog = new Map();
      entries.forEach((e) => {
        const key = e.dogId || e.dogName;
        if (!byDog.has(key)) {
          byDog.set(key, { dogId: e.dogId, dogName: e.dogName, pavilion: e.pavilion, box: e.box, walks: [] });
        }
        const g = byDog.get(key);
        g.walks.push(e);
        if (e.dogName) g.dogName = e.dogName;
        if (e.pavilion) g.pavilion = e.pavilion;
        if (e.box) g.box = e.box;
      });

      const dogs = [...byDog.values()].sort((a, b) =>
        String(a.dogName).localeCompare(String(b.dogName), "pl")
      );

      const volunteers = new Set(entries.map((e) => e.volunteer).filter(Boolean));

      setReport({
        month,
        dogs,
        totalWalks: entries.length,
        volunteerCount: volunteers.size,
        generatedAt: new Date(),
      });
    } catch (e) {
      console.error("Błąd generowania raportu spacerów:", e);
      setError("Nie udało się wygenerować raportu — sprawdź połączenie i spróbuj ponownie.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={S.page}>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #walk-report, #walk-report * { visibility: visible; }
          #walk-report {
            position: absolute; left: 0; top: 0; width: 100%;
            padding: 0 !important; border: none !important;
          }
          .wr-dog { break-inside: avoid; page-break-inside: avoid; }
        }
      `}</style>

      <div style={S.header}>
        {onBack && (
          <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", padding: "0.25rem" }}>
            <ArrowLeft size={22} color="#374151" />
          </button>
        )}
        <div style={S.headerTitle}>Raport spacerów</div>
      </div>

      <div style={S.content}>
        <div style={S.card}>
          <label style={S.label}>Miesiąc raportu</label>
          <div style={{ ...S.row, gap: "0.6rem" }}>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              style={{ ...S.input, flex: 1 }}
            />
            <button
              onClick={generate}
              disabled={loading || !month}
              style={{ ...S.btn, ...S.btnPrimary, whiteSpace: "nowrap", opacity: loading || !month ? 0.6 : 1 }}
            >
              {loading ? "Generuję..." : "Generuj"}
            </button>
          </div>
          <div style={{ fontSize: "0.78rem", color: "#6b7280", marginTop: "0.5rem" }}>
            Raport obejmuje wszystkie psy, które miały spacer w wybranym miesiącu — również te,
            które opuściły już schronisko.
          </div>
          {error && <div style={S.error}>{error}</div>}
        </div>

        {report && report.dogs.length === 0 && (
          <div style={S.emptyState}>
            <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>📭</div>
            <div>Brak spacerów w {monthLabel(report.month)}</div>
          </div>
        )}

        {report && report.dogs.length > 0 && (
          <>
            <button
              onClick={() => window.print()}
              style={{ ...S.btn, ...S.btnSecondary, width: "100%", marginBottom: "0.75rem" }}
            >
              🖨 Drukuj / zapisz jako PDF
            </button>

            <div id="walk-report" style={{ background: "white", borderRadius: "0.75rem", border: "1px solid #e5e7eb", padding: "1.25rem" }}>
              <div style={{ borderBottom: "2px solid #2563eb", paddingBottom: "0.75rem", marginBottom: "1rem" }}>
                <div style={{ fontSize: "1.15rem", fontWeight: 800, color: "#111827" }}>
                  Raport spacerów — {monthLabel(report.month)}
                </div>
                <div style={{ fontSize: "0.8rem", color: "#6b7280", marginTop: "0.25rem" }}>
                  Psów: {report.dogs.length} · spacerów: {report.totalWalks} ·
                  wolontariuszy: {report.volunteerCount} ·
                  wygenerowano {report.generatedAt.toLocaleDateString("pl-PL")}
                </div>
              </div>

              {report.dogs.map((dog) => (
                <div key={dog.dogId || dog.dogName} className="wr-dog" style={{ marginBottom: "1.25rem" }}>
                  <div style={{ fontWeight: 700, fontSize: "1rem", color: "#111827", marginBottom: "0.1rem" }}>
                    {dog.dogName || "(bez nazwy)"}
                    {dog.dogId && (
                      <span style={{ fontWeight: 400, fontSize: "0.85rem", color: "#6b7280", marginLeft: "0.4rem" }}>
                        ({dog.dogId})
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "#6b7280", marginBottom: "0.4rem" }}>
                    {dog.pavilion ? `Pawilon ${dog.pavilion}` : ""}
                    {dog.box ? ` · Boks ${dog.box}` : ""}
                    {dog.pavilion || dog.box ? " · " : ""}
                    spacerów: {dog.walks.length}
                  </div>

                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                        <th style={{ textAlign: "left", padding: "0.25rem 0.4rem 0.25rem 0", width: "18%" }}>Data</th>
                        <th style={{ textAlign: "left", padding: "0.25rem 0.4rem", width: "14%" }}>Godz.</th>
                        <th style={{ textAlign: "left", padding: "0.25rem 0.4rem" }}>Wolontariusz</th>
                        <th style={{ textAlign: "left", padding: "0.25rem 0 0.25rem 0.4rem", width: "18%" }}>Typ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dog.walks.map((w, i) => {
                        const { day, time } = dayAndTime(w.date);
                        return (
                          <tr key={i} style={{ borderBottom: "1px solid #f3f4f6" }}>
                            <td style={{ padding: "0.25rem 0.4rem 0.25rem 0" }}>{day}</td>
                            <td style={{ padding: "0.25rem 0.4rem", color: "#6b7280" }}>{time}</td>
                            <td style={{ padding: "0.25rem 0.4rem" }}>{w.volunteer || "—"}</td>
                            <td style={{ padding: "0.25rem 0 0.25rem 0.4rem", color: "#6b7280" }}>
                              {w.typ === "wybieg" ? "wybieg" : "spacer"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
