import React, { useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import { parseWalkSchedule, matchWalks } from "./lib/xlsxWalks";

const POLAND_TZ = "Europe/Warsaw";

function todayStr() {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: POLAND_TZ }).format(new Date());
}

// Import historii spacerów z harmonogramu wolontariuszy (XLSX).
// Tylko jednoznaczne oznaczenia; podgląd przed zapisem; deduplikacja
// z arkuszem Spacery i z Firestore.
export default function WalkImport({ dogs, currentUser, onRefreshDogs }) {
  const [fromDate, setFromDate] = useState("2026-07-04");
  const [toDate, setToDate] = useState(() => todayStr());
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [showAmbiguous, setShowAmbiguous] = useState(false);

  const box = { background: "white", border: "1px solid #e5e7eb", borderRadius: "0.75rem", padding: "1rem", marginBottom: "0.75rem" };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    setError("");
    setPreview(null);
    setResult(null);
    try {
      const { rows } = await parseWalkSchedule(file, fromDate, toDate);
      const { walks, ambiguous } = matchWalks(rows, dogs || []);

      // Deduplikacja z istniejącą historią w arkuszu
      let existing = {};
      try {
        const res = await fetch(`/api/gs?action=getWalksByDateRange&startDate=${fromDate}&endDate=${toDate}`);
        const json = await res.json();
        if (json?.ok && json.data) existing = json.data;
      } catch {
        // brak historii = zaimportujemy, backend i tak deduplikuje
      }
      const fresh = walks.filter((w) => !(existing[w.dogId] || []).includes(w.date));
      const already = walks.length - fresh.length;

      const perDate = {};
      fresh.forEach((w) => { perDate[w.date] = (perDate[w.date] || 0) + 1; });

      setPreview({ fileName: file.name, walks: fresh, already, ambiguous, perDate });
    } catch (err) {
      console.error("Błąd importu harmonogramu:", err);
      setError(err?.message || "Nie udało się odczytać pliku");
    } finally {
      setBusy(false);
    }
  };

  const execute = async () => {
    if (!preview || !currentUser || busy) return;
    if (!window.confirm(`Zaimportować ${preview.walks.length} spacerów (${fromDate} – ${toDate})?\n\nWpisy trafią do arkusza Spacery i do aplikacji.`)) return;
    setBusy(true);
    setError("");
    try {
      // 1. Arkusz (jeden wsad, backend deduplikuje i aktualizuje Ostatni spacer)
      const token = await currentUser.getIdToken();
      const res = await fetch("/api/gs", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "bulkImportWalks", walks: preview.walks }),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) throw new Error(json?.error || `HTTP ${res.status}`);

      // 2. Firestore (dokumenty dzienne — tabela widzi wpisy na żywo);
      //    nie nadpisujemy istniejących wpisów
      const byDate = {};
      preview.walks.forEach((w) => {
        if (!byDate[w.date]) byDate[w.date] = [];
        byDate[w.date].push(w);
      });
      let fsWritten = 0;
      for (const [date, list] of Object.entries(byDate)) {
        const ref = doc(db, "dailyWalks", date);
        let existingWalks = {};
        try {
          const snap = await getDoc(ref);
          existingWalks = snap.data()?.walks || {};
        } catch {}
        const updates = {};
        for (const w of list) {
          if (existingWalks[w.dogId]) continue;
          updates[w.dogId] = {
            volunteerId: currentUser.uid,
            volunteerName: "Harmonogram (import)",
            type: "spacer",
            at: `${date} 12:00:00`,
          };
          fsWritten++;
        }
        if (Object.keys(updates).length > 0) {
          await setDoc(ref, { walks: updates }, { merge: true });
        }
      }

      setResult({ ...json.data, fsWritten });
      setPreview(null);
      onRefreshDogs?.();
    } catch (err) {
      console.error("Błąd zapisu importu:", err);
      setError("Import nie powiódł się: " + (err?.message || "nieznany błąd"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={box}>
      <div style={{ fontWeight: 700, fontSize: "0.95rem", marginBottom: "0.5rem", color: "#111827" }}>
        📅 Import spacerów z harmonogramu (XLSX)
      </div>
      <p style={{ fontSize: "0.82rem", color: "#6b7280", margin: "0 0 0.75rem" }}>
        Wgraj plik harmonogramu (zakładka WYJŚCIA). Boks z jednym psem: każde
        niepuste oznaczenie (X, emoji, godzina, inicjał) = spacer. Boks z wieloma
        psami: X = wszystkie psy, litery imion = konkretne psy; inne oznaczenia
        są pomijane, bo nie wiadomo, którego psa dotyczą.
      </p>

      <div style={{ display: "flex", gap: "0.6rem", marginBottom: "0.6rem", flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 130 }}>
          <label style={{ fontSize: "0.72rem", fontWeight: 600, color: "#374151", display: "block" }}>Od</label>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
            style={{ width: "100%", padding: "0.45rem", border: "1px solid #d1d5db", borderRadius: "0.375rem", boxSizing: "border-box" }} />
        </div>
        <div style={{ flex: 1, minWidth: 130 }}>
          <label style={{ fontSize: "0.72rem", fontWeight: 600, color: "#374151", display: "block" }}>Do</label>
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)}
            style={{ width: "100%", padding: "0.45rem", border: "1px solid #d1d5db", borderRadius: "0.375rem", boxSizing: "border-box" }} />
        </div>
      </div>

      <label style={{ display: "inline-block", padding: "0.65rem 1.25rem", borderRadius: "0.5rem", background: busy ? "#9ca3af" : "#2563eb", color: "white", fontWeight: 700, fontSize: "0.9rem", cursor: busy ? "wait" : "pointer" }}>
        {busy ? "Przetwarzam..." : "Wybierz plik XLSX"}
        <input type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={handleFile} disabled={busy} style={{ display: "none" }} />
      </label>

      {error && <p style={{ marginTop: "0.6rem", color: "#991b1b", fontSize: "0.85rem", fontWeight: 600 }}>⚠️ {error}</p>}

      {result && (
        <div style={{ marginTop: "0.75rem", padding: "0.75rem", borderRadius: "0.5rem", background: "#dcfce7", border: "1px solid #86efac", color: "#166534", fontSize: "0.85rem" }}>
          <strong>✅ Import wykonany.</strong> Do arkusza: {result.imported} (pominięte duplikaty: {result.skipped}),
          zaktualizowany „Ostatni spacer": {result.lastWalkUpdated} psów, do aplikacji: {result.fsWritten} wpisów.
          {result.errors?.length > 0 && <div style={{ color: "#92400e", marginTop: "0.3rem" }}>Uwagi: {result.errors.join("; ")}</div>}
        </div>
      )}

      {preview && (
        <div style={{ marginTop: "0.75rem" }}>
          <div style={{ padding: "0.6rem 0.75rem", borderRadius: "0.5rem", background: "#eff6ff", border: "1px solid #bfdbfe", color: "#1e40af", fontSize: "0.85rem", marginBottom: "0.6rem" }}>
            <strong>{preview.fileName}</strong>: do importu <strong>{preview.walks.length}</strong> spacerów
            {preview.already > 0 && <> · już w bazie: {preview.already}</>}
            {" "}· pominięte (niejednoznaczne): {preview.ambiguous.length}
          </div>

          <div style={{ fontSize: "0.78rem", color: "#374151", marginBottom: "0.6rem" }}>
            {Object.entries(preview.perDate).sort().map(([d, n]) => (
              <span key={d} style={{ display: "inline-block", margin: "0 0.5rem 0.25rem 0", padding: "0.15rem 0.5rem", background: "#f3f4f6", borderRadius: "9999px" }}>
                {d.slice(8)}.{d.slice(5, 7)}: <strong>{n}</strong>
              </span>
            ))}
          </div>

          {preview.ambiguous.length > 0 && (
            <div style={{ marginBottom: "0.6rem" }}>
              <button onClick={() => setShowAmbiguous((v) => !v)}
                style={{ background: "none", border: "none", color: "#92400e", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer", textDecoration: "underline", padding: 0 }}>
                {showAmbiguous ? "Ukryj pominięte ▲" : `Pokaż pominięte (${preview.ambiguous.length}) ▼`}
              </button>
              {showAmbiguous && (
                <div style={{ maxHeight: 200, overflowY: "auto", marginTop: "0.4rem", fontSize: "0.72rem", color: "#6b7280", border: "1px solid #fde68a", background: "#fefce8", borderRadius: "0.375rem", padding: "0.5rem" }}>
                  {preview.ambiguous.map((a, i) => (
                    <div key={i}>{a.date.slice(8)}.{a.date.slice(5, 7)} · {a.boks} · „{a.mark}" — {a.reason}</div>
                  ))}
                </div>
              )}
            </div>
          )}

          {preview.walks.length > 0 ? (
            <button onClick={execute} disabled={busy}
              style={{ width: "100%", padding: "0.9rem", borderRadius: "0.75rem", border: "none", background: busy ? "#9ca3af" : "#16a34a", color: "white", fontWeight: 700, fontSize: "1rem", cursor: busy ? "not-allowed" : "pointer" }}>
              {busy ? "Importuję..." : `✅ Importuj ${preview.walks.length} spacerów`}
            </button>
          ) : (
            <div style={{ padding: "0.6rem", borderRadius: "0.5rem", background: "#dcfce7", border: "1px solid #86efac", color: "#166534", fontSize: "0.85rem", fontWeight: 600 }}>
              Wszystkie jednoznaczne spacery z tego zakresu są już w bazie.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
