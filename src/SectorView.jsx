import React, { useState, useEffect, useCallback } from "react";
import { Home, MapPin, Star, Shield, Building2, RefreshCw } from "lucide-react";
import { authFetch } from "./lib/apiFetch";
import { useUserRole } from "./hooks/useUserRole";
import { canViewSector, canSetMedicalFlags } from "./lib/roles";

const styles = {
  pageContainer: { minHeight: "100vh", backgroundColor: "#f9fafb", paddingBottom: "80px" },
  header: { backgroundColor: "white", borderBottom: "1px solid #e5e7eb", position: "sticky", top: 0, zIndex: 100, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" },
  headerContent: { padding: "1rem", display: "flex", justifyContent: "space-between", alignItems: "flex-start" },
  title: { fontSize: "1.5rem", fontWeight: "bold", color: "#111827", marginBottom: "0.25rem" },
  subtitle: { color: "#6b7280", fontSize: "0.875rem" },
  content: { padding: "1rem" },
  bottomNav: { position: "fixed", bottom: 0, left: 0, right: 0, backgroundColor: "white", borderTop: "1px solid #e5e7eb", padding: "0.75rem 0.25rem", display: "flex", justifyContent: "space-around", alignItems: "center", zIndex: 100, boxShadow: "0 -2px 10px rgba(0,0,0,0.1)" },
  bottomNavButton: { display: "flex", flexDirection: "column", alignItems: "center", background: "none", border: "none", cursor: "pointer", padding: "0.5rem", color: "#6b7280", fontSize: "0.75rem", minWidth: "60px", flex: 1 },
  bottomNavButtonActive: { color: "#2563eb", fontWeight: "600" },
  dogCard: { backgroundColor: "white", borderRadius: "0.75rem", padding: "1rem", marginBottom: "0.75rem", border: "1px solid #e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", cursor: "pointer" },
  dogCardHeader: { display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.5rem" },
  dogName: { fontSize: "1.1rem", fontWeight: "700", color: "#111827" },
  dogLocation: { fontSize: "0.85rem", color: "#6b7280" },
  flagRow: { fontSize: "0.875rem", fontWeight: "600", marginBottom: "0.3rem" },
  infoRow: { fontSize: "0.85rem", color: "#374151", marginBottom: "0.25rem" },
  select: { width: "100%", padding: "0.6rem 0.75rem", borderRadius: "0.75rem", border: "1px solid #d1d5db", fontSize: "0.9rem", backgroundColor: "white", marginBottom: "0.5rem", color: "#111827" },
  counterText: { fontSize: "0.8rem", color: "#6b7280", marginBottom: "1rem" },
};

function formatUntil(isoString) {
  if (!isoString) return null;
  const d = new Date(isoString);
  return d.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" });
}

function formatDateTime(isoString) {
  if (!isoString) return "";
  const d = new Date(isoString);
  return d.toLocaleString("pl-PL", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function sortDogs(dogs) {
  return [...dogs].sort((a, b) => {
    const rankA = (a.noFood || a.walkBlocked) ? 0 : 1;
    const rankB = (b.noFood || b.walkBlocked) ? 0 : 1;
    if (rankA !== rankB) return rankA - rankB;
    return (a.name || "").localeCompare(b.name || "", "pl");
  });
}

const STATUS_ICON = { nowe: "🔴", w_trakcie: "🟡", zamknięte: "✅" };
const STATUS_LABEL = { nowe: "Nowe", w_trakcie: "W trakcie", zamknięte: "Zamknięte" };

const SectorView = ({ setCurrentView, setSelectedDog, setDogCardFrom, currentUser, isAdmin, allDogs }) => {
  const { role } = useUserRole();

  const [activeTab, setActiveTab] = useState("restrictions");

  // --- ZAKŁADKA: PSY Z OBOSTRZENIAMI ---
  const [dogs, setDogs] = useState([]);
  const [loadingDogs, setLoadingDogs] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [selectedPawilon, setSelectedPawilon] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const fetchDogs = useCallback(async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true);
    try {
      const res = await authFetch("/api/gs?action=getSectorDogs");
      const result = await res.json();
      if (result?.ok && Array.isArray(result?.data)) {
        setDogs(result.data);
        setLastRefresh(new Date());
      }
    } catch {}
    setLoadingDogs(false);
    if (showSpinner) setRefreshing(false);
  }, []);

  // --- ZAKŁADKA: ZGŁOSZENIA ---
  const [reports, setReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [reportFilter, setReportFilter] = useState("nowe");
  const [updatingId, setUpdatingId] = useState(null);
  const [closeModal, setCloseModal] = useState(null); // { id, dogName }
  const [closeNote, setCloseNote] = useState("");
  const [closingReport, setClosingReport] = useState(false);

  const fetchReports = useCallback(async () => {
    if (!currentUser) return;
    setLoadingReports(true);
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch("/api/gs", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "getMedicalReports" }),
      });
      const result = await res.json();
      if (result?.ok && Array.isArray(result?.data)) setReports(result.data);
    } catch {}
    setLoadingReports(false);
  }, [currentUser]);

  useEffect(() => {
    fetchDogs();
    const id = setInterval(() => fetchDogs(), 60000);
    return () => clearInterval(id);
  }, [fetchDogs]);

  useEffect(() => {
    fetchReports();
    const id = setInterval(() => fetchReports(), 60000);
    return () => clearInterval(id);
  }, [fetchReports]);

  const handleUpdateStatus = async (reportId, newStatus, note = "") => {
    if (!currentUser || updatingId) return;
    setUpdatingId(reportId);
    try {
      const token = await currentUser.getIdToken();
      await fetch("/api/gs", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          action: "updateMedicalReportStatus",
          id: reportId,
          status: newStatus,
          note,
          updatedBy: currentUser.displayName || currentUser.email || "Nieznany",
        }),
      });
      await fetchReports();
    } catch {}
    setUpdatingId(null);
  };

  const handleCloseReport = async () => {
    if (!closeModal || closingReport) return;
    setClosingReport(true);
    await handleUpdateStatus(closeModal.id, "zamknięte", closeNote.trim());
    setCloseModal(null);
    setCloseNote("");
    setClosingReport(false);
  };

  // Licznik aktywnych zgłoszeń (nowe + w_trakcie) do badge na zakładce
  const activeReportsCount = reports.filter(r => r.status === "nowe").length;

  const pavilions = [...new Set(dogs.map((d) => d.pavilion).filter(Boolean))].sort();
  const filtered = selectedPawilon ? dogs.filter((d) => d.pavilion === selectedPawilon) : dogs;
  const hasMedTask = (d) => !!(d.próbkaKału || d.pobranieKrwi || d.zakropienieOczu || d.inne);
  const sorted = [...filtered].sort((a, b) => {
    const rankA = (a.noFood || a.walkBlocked) ? 0 : (hasMedTask(a) ? 1 : 2);
    const rankB = (b.noFood || b.walkBlocked) ? 0 : (hasMedTask(b) ? 1 : 2);
    if (rankA !== rankB) return rankA - rankB;
    return (a.name || "").localeCompare(b.name || "", "pl");
  });

  const filteredReports = reportFilter
    ? reports.filter(r => r.status === reportFilter)
    : reports;

  const findFullDog = (id) => (allDogs || []).find((d) => d.id === id);

  const handleDogClick = (dog) => {
    setSelectedDog(findFullDog(dog.id) || { id: dog.id, name: dog.name, pavilion: dog.pavilion, box: dog.box, diet: dog.diet });
    setDogCardFrom("sector");
    setCurrentView("dogCard");
  };

  const handleReportDogClick = (report) => {
    setSelectedDog(findFullDog(report.dogId) || { id: report.dogId, name: report.dogName, pavilion: report.pawilon, box: report.boks });
    setDogCardFrom("sector");
    setCurrentView("dogCard");
  };

  if (!canViewSector(role)) {
    return (
      <div style={styles.pageContainer}>
        <div style={{ padding: "2rem", textAlign: "center", color: "#6b7280" }}>Brak dostępu do widoku Sektor.</div>
      </div>
    );
  }

  return (
    <div style={styles.pageContainer}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); }}`}</style>

      <div style={styles.header}>
        <div style={styles.headerContent}>
          <div>
            <h1 style={styles.title}>🏢 Sektor</h1>
            <p style={styles.subtitle}>
              {activeTab === "restrictions"
                ? lastRefresh ? `Odświeżono o ${lastRefresh.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })}` : "Ładowanie..."
                : "Zgłoszenia medyczne"}
            </p>
          </div>
          <button
            onClick={() => activeTab === "restrictions" ? fetchDogs(true) : fetchReports()}
            disabled={refreshing || loadingReports}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#2563eb", padding: "0.5rem", opacity: (refreshing || loadingReports) ? 0.5 : 1 }}
          >
            <RefreshCw size={22} style={{ animation: (refreshing || loadingReports) ? "spin 1s linear infinite" : "none" }} />
          </button>
        </div>

        {/* Zakładki */}
        <div style={{ display: "flex", borderTop: "1px solid #e5e7eb" }}>
          <button
            onClick={() => setActiveTab("restrictions")}
            style={{ flex: 1, padding: "0.65rem 0.5rem", border: "none", cursor: "pointer", fontSize: "0.85rem", fontWeight: activeTab === "restrictions" ? 700 : 400, color: activeTab === "restrictions" ? "#2563eb" : "#6b7280", backgroundColor: "white", borderBottom: activeTab === "restrictions" ? "2px solid #2563eb" : "2px solid transparent" }}
          >
            Psy z obostrzeniami
          </button>
          <button
            onClick={() => setActiveTab("reports")}
            style={{ flex: 1, padding: "0.65rem 0.5rem", border: "none", cursor: "pointer", fontSize: "0.85rem", fontWeight: activeTab === "reports" ? 700 : 400, color: activeTab === "reports" ? "#dc2626" : "#6b7280", backgroundColor: "white", borderBottom: activeTab === "reports" ? "2px solid #dc2626" : "2px solid transparent" }}
          >
            Zgłoszenia{activeReportsCount > 0 ? ` (${activeReportsCount})` : ""}
          </button>
        </div>
      </div>

      <div style={styles.content}>
        {/* =================== ZAKŁADKA: PSY Z OBOSTRZENIAMI =================== */}
        {activeTab === "restrictions" && (
          <>
            <select value={selectedPawilon} onChange={(e) => setSelectedPawilon(e.target.value)} style={styles.select}>
              <option value="">Wszystkie pawilony</option>
              {pavilions.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <p style={styles.counterText}>
              {loadingDogs ? "Ładowanie..." : `${sorted.length} psów z obostrzeniami${selectedPawilon ? ` · pawilon ${selectedPawilon}` : ` · ${dogs.length} łącznie`}`}
            </p>
            {!loadingDogs && sorted.length === 0 && (
              <div style={{ textAlign: "center", padding: "3rem 1rem", color: "#9ca3af" }}>
                <p style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>✅</p>
                <p style={{ fontWeight: 600 }}>Brak psów z obostrzeniami</p>
              </div>
            )}
            {sorted.map((dog) => (
              <div key={dog.id} style={styles.dogCard} onClick={() => handleDogClick(dog)}>
                <div style={styles.dogCardHeader}>
                  <span style={styles.dogName}>{dog.name}</span>
                  <span style={styles.dogLocation}>{dog.pavilion}{dog.box ? ` / boks ${dog.box}` : ""}</span>
                </div>
                {dog.noFood && (
                  <div style={{ ...styles.flagRow, color: "#dc2626" }}>
                    🔴 NIE KARMIĆ{dog.noFoodNote ? ` — ${dog.noFoodNote}` : ""}{dog.noFoodUntil ? ` do ${formatUntil(dog.noFoodUntil)}` : ""}
                  </div>
                )}
                {dog.walkBlocked && (
                  <div style={{ ...styles.flagRow, color: "#7c3aed" }}>
                    🚫 ZAKAZ SPACERU{dog.walkBlockedNote ? ` — ${dog.walkBlockedNote}` : ""}{dog.walkBlockedUntil ? ` do ${formatUntil(dog.walkBlockedUntil)}` : ""}
                  </div>
                )}
                {dog.próbkaKału && (
                  <div style={{ ...styles.flagRow, color: "#0369a1" }}>
                    🧪 PRÓBKA KAŁU{dog.próbkaKałuNote ? ` — ${dog.próbkaKałuNote}` : ""}{dog.próbkaKałuUntil ? ` do ${formatUntil(dog.próbkaKałuUntil)}` : ""}
                  </div>
                )}
                {dog.pobranieKrwi && (
                  <div style={{ ...styles.flagRow, color: "#0369a1" }}>
                    💉 POBRANIE KRWI{dog.pobranieKrwiNote ? ` — ${dog.pobranieKrwiNote}` : ""}{dog.pobranieKrwiUntil ? ` do ${formatUntil(dog.pobranieKrwiUntil)}` : ""}
                  </div>
                )}
                {dog.zakropienieOczu && (
                  <div style={{ ...styles.flagRow, color: "#0369a1" }}>
                    👁️ ZAKROPIENIE OCZU{dog.zakropienieOczuNote ? ` — ${dog.zakropienieOczuNote}` : ""}{dog.zakropienieOczuUntil ? ` do ${formatUntil(dog.zakropienieOczuUntil)}` : ""}
                  </div>
                )}
                {dog.inne && (
                  <div style={{ ...styles.flagRow, color: "#0369a1" }}>
                    🩺 INNE{dog.inneNote ? ` — ${dog.inneNote}` : ""}{dog.inneUntil ? ` do ${formatUntil(dog.inneUntil)}` : ""}
                  </div>
                )}
                {dog.diet && <div style={styles.infoRow}>🥩 Dieta: {dog.diet}</div>}
              </div>
            ))}
          </>
        )}

        {/* =================== ZAKŁADKA: ZGŁOSZENIA =================== */}
        {activeTab === "reports" && (
          <>
            {/* Filtry statusu */}
            <div style={{ display: "flex", gap: "0.4rem", marginBottom: "0.75rem", flexWrap: "wrap" }}>
              {[
                { value: "nowe", label: `Nowe (${reports.filter(r => r.status === "nowe").length})` },
                { value: "w_trakcie", label: `W trakcie (${reports.filter(r => r.status === "w_trakcie").length})` },
                { value: "zamknięte", label: "Zamknięte" },
                { value: "", label: "Wszystkie" },
              ].map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setReportFilter(value)}
                  style={{ padding: "0.4rem 0.75rem", borderRadius: "1rem", border: "1px solid", fontSize: "0.8rem", fontWeight: reportFilter === value ? 700 : 400, cursor: "pointer", backgroundColor: reportFilter === value ? "#1e293b" : "white", color: reportFilter === value ? "white" : "#374151", borderColor: reportFilter === value ? "#1e293b" : "#d1d5db" }}
                >
                  {label}
                </button>
              ))}
            </div>

            <p style={styles.counterText}>
              {loadingReports ? "Ładowanie..." : `${filteredReports.length} zgłoszeń`}
            </p>

            {!loadingReports && filteredReports.length === 0 && (
              <div style={{ textAlign: "center", padding: "3rem 1rem", color: "#9ca3af" }}>
                <p style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>📋</p>
                <p style={{ fontWeight: 600 }}>Brak zgłoszeń</p>
              </div>
            )}

            {filteredReports.map((report) => (
              <div key={report.id} style={{ backgroundColor: "white", borderRadius: "0.75rem", padding: "1rem", marginBottom: "0.75rem", border: "1px solid #e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.4rem" }}>
                  <button
                    onClick={() => handleReportDogClick(report)}
                    style={{ background: "none", border: "none", cursor: "pointer", padding: 0, textAlign: "left" }}
                  >
                    <span style={{ fontSize: "1rem", fontWeight: 700, color: "#111827" }}>
                      {STATUS_ICON[report.status] || "⚪"} {report.dogName}
                    </span>
                    <span style={{ fontSize: "0.8rem", color: "#6b7280", marginLeft: "0.5rem" }}>
                      {report.pawilon}{report.boks ? ` / boks ${report.boks}` : ""}
                    </span>
                  </button>
                  <span style={{ fontSize: "0.75rem", color: "#6b7280", whiteSpace: "nowrap", marginLeft: "0.5rem" }}>
                    {STATUS_LABEL[report.status] || report.status}
                  </span>
                </div>

                <p style={{ fontSize: "0.875rem", color: "#374151", marginBottom: "0.5rem", lineHeight: "1.5", fontStyle: "italic" }}>
                  „{report.description}"
                </p>

                <p style={{ fontSize: "0.75rem", color: "#9ca3af", marginBottom: report.statusNote ? "0.25rem" : "0" }}>
                  Zgłosił: {report.reportedBy} · {formatDateTime(report.reportedAt)}
                </p>

                {report.statusNote && (
                  <p style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0" }}>
                    📝 {report.statusNote}
                  </p>
                )}

                {/* Przyciski akcji — tylko ambulatorium + admin */}
                {canSetMedicalFlags(role) && report.status !== "zamknięte" && (
                  <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}>
                    {report.status === "nowe" && (
                      <button
                        onClick={() => handleUpdateStatus(report.id, "w_trakcie")}
                        disabled={!!updatingId}
                        style={{ flex: 1, padding: "0.45rem 0.5rem", borderRadius: "0.5rem", border: "1px solid #f59e0b", backgroundColor: "#fef3c7", color: "#92400e", fontWeight: 600, fontSize: "0.8rem", cursor: "pointer", opacity: updatingId === report.id ? 0.5 : 1 }}
                      >
                        🟡 W trakcie
                      </button>
                    )}
                    <button
                      onClick={() => { setCloseModal({ id: report.id, dogName: report.dogName }); setCloseNote(""); }}
                      disabled={!!updatingId}
                      style={{ flex: 1, padding: "0.45rem 0.5rem", borderRadius: "0.5rem", border: "1px solid #10b981", backgroundColor: "#d1fae5", color: "#065f46", fontWeight: 600, fontSize: "0.8rem", cursor: "pointer" }}
                    >
                      ✅ Zamknij zgłoszenie
                    </button>
                  </div>
                )}
              </div>
            ))}
          </>
        )}
      </div>

      {/* Modal zamknięcia zgłoszenia */}
      {closeModal && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <div style={{ backgroundColor: "white", borderRadius: "1rem", padding: "1.5rem", width: "100%", maxWidth: "400px", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
            <h3 style={{ fontWeight: 700, color: "#111827", marginBottom: "0.25rem" }}>Zamknij zgłoszenie</h3>
            <p style={{ color: "#6b7280", fontSize: "0.875rem", marginBottom: "1rem" }}>Pies: <strong>{closeModal.dogName}</strong></p>
            <label style={{ fontWeight: 600, fontSize: "0.875rem", color: "#374151", display: "block", marginBottom: "0.4rem" }}>Notatka (opcjonalnie):</label>
            <textarea
              value={closeNote}
              onChange={(e) => setCloseNote(e.target.value)}
              placeholder="Np. pies zbadany, przepisano leczenie..."
              rows={3}
              style={{ width: "100%", padding: "0.6rem", borderRadius: "0.5rem", border: "1px solid #d1d5db", fontSize: "0.875rem", resize: "vertical", boxSizing: "border-box", fontFamily: "inherit", marginBottom: "1rem" }}
            />
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button
                onClick={() => setCloseModal(null)}
                disabled={closingReport}
                style={{ flex: 1, padding: "0.7rem", borderRadius: "0.75rem", border: "1px solid #d1d5db", backgroundColor: "white", color: "#374151", fontWeight: 600, cursor: "pointer" }}
              >
                Anuluj
              </button>
              <button
                onClick={handleCloseReport}
                disabled={closingReport}
                style={{ flex: 1, padding: "0.7rem", borderRadius: "0.75rem", border: "none", backgroundColor: "#059669", color: "white", fontWeight: 700, cursor: "pointer", opacity: closingReport ? 0.6 : 1 }}
              >
                {closingReport ? "Zamykanie..." : "Zamknij zgłoszenie"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={styles.bottomNav}>
        <button style={styles.bottomNavButton} onClick={() => setCurrentView("home")}>
          <Home size={24} />
          <span style={{ marginTop: "0.25rem" }}>Home</span>
        </button>
        <button style={styles.bottomNavButton} onClick={() => setCurrentView("map")}>
          <MapPin size={24} />
          <span style={{ marginTop: "0.25rem" }}>Mapa</span>
        </button>
        <button style={styles.bottomNavButton} onClick={() => setCurrentView("myDogs")}>
          <Star size={24} />
          <span style={{ marginTop: "0.25rem" }}>Moje psy</span>
        </button>
        <button style={{ ...styles.bottomNavButton, ...styles.bottomNavButtonActive }}>
          <Building2 size={24} />
          <span style={{ marginTop: "0.25rem" }}>Sektor</span>
        </button>
        {isAdmin && (
          <button style={styles.bottomNavButton} onClick={() => setCurrentView("panel")}>
            <Shield size={24} />
            <span style={{ marginTop: "0.25rem" }}>Panel</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default SectorView;
