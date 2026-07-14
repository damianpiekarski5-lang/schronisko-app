import React, { useEffect, useMemo, useState } from "react";
import { Shield, Home, MapPin, Star, Briefcase, ClipboardList, RefreshCw, ArrowLeft, Users, Database } from "lucide-react";
import { parseDogListPdf, normalizeDogId } from "./lib/pdfDogList";
import WalkImport from "./WalkImport";
import { ROLES, ROLE_LABELS } from "./lib/roles";

const styles = {
  page: { minHeight: "100vh", backgroundColor: "#f9fafb", paddingBottom: "90px" },
  header: { backgroundColor: "white", borderBottom: "1px solid #e5e7eb", padding: "1rem" },
  title: { display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: "800", fontSize: "1.2rem", color: "#111827" },
  subtitle: { color: "#6b7280", fontSize: "0.875rem", marginTop: "0.35rem" },
  content: { padding: "1rem" },
  tabs: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginBottom: "1rem" },
  tabButton: { border: "1px solid #d1d5db", background: "white", padding: "0.75rem", borderRadius: "0.75rem", fontWeight: 700, cursor: "pointer", color: "#374151" },
  tabButtonActive: { background: "#eff6ff", borderColor: "#3b82f6", color: "#1d4ed8" },
  dogCard: {
    backgroundColor: "white",
    borderRadius: "1rem",
    padding: "1.25rem",
    marginBottom: "1rem",
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
    transition: "all 0.2s",
  },
  dogCardHover: { boxShadow: "0 4px 12px rgba(0,0,0,0.15)", transform: "translateY(-2px)" },
  emptyCard: {
    backgroundColor: "white",
    borderRadius: "1rem",
    padding: "1.25rem",
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
    color: "#6b7280",
    textAlign: "center",
  },
  photo: {
    width: "100%",
    aspectRatio: "1 / 1",
    objectFit: "cover",
    borderRadius: "0.75rem",
    background: "#f3f4f6",
  },
  actionBtn: {
    border: "none",
    borderRadius: "0.7rem",
    padding: "0.7rem 1rem",
    fontWeight: 700,
    cursor: "pointer",
  },
  bottomNav: {
    position: "fixed",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "white",
    borderTop: "1px solid #e5e7eb",
    padding: "0.75rem 0.25rem",
    display: "flex",
    justifyContent: "space-around",
    alignItems: "center",
    zIndex: 100,
    boxShadow: "0 -2px 10px rgba(0,0,0,0.1)",
  },
  bottomNavButton: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "0.5rem",
    color: "#6b7280",
    fontSize: "0.75rem",
    minWidth: "60px",
    flex: 1,
  },
  bottomNavButtonActive: {
    color: "#2563eb",
    fontWeight: "600",
  },
};

const normalizeText = (value) => String(value || "").trim();

const getReportText = (report) => {
  const parts = [
    report?.reason,
    report?.incident3P,
    report?.description,
    report?.content,
    report?.text,
  ]
    .map(normalizeText)
    .filter(Boolean);

  return parts.join("\n\n");
};

const AdminPanelView = ({
  currentUser,
  behaviorystDogs,
  dogs,
  setCurrentView,
  setSelectedDog,
  setDogCardFrom,
  hoveredCard,
  setHoveredCard,
  onStartWork,
  onRefreshDogs,
}) => {
  const [activeTab, setActiveTab] = useState("reports");
  const [reports, setReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [reportsError, setReportsError] = useState("");
  const [selectedReport, setSelectedReport] = useState(null);
  const [processingReportId, setProcessingReportId] = useState("");

  const [usersList, setUsersList] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [usersError, setUsersError] = useState("");
  const [savingRole, setSavingRole] = useState("");

  const dogsById = useMemo(() => {
    const map = new Map();
    (dogs || []).forEach((dog) => map.set(String(dog.id), dog));
    return map;
  }, [dogs]);

  const sortedDogs = [...(behaviorystDogs || [])].sort((a, b) => a.name.localeCompare(b.name, "pl"));

  const fetchReports = async () => {
    if (!currentUser) return;

    setLoadingReports(true);
    setReportsError("");

    try {
      const token = await currentUser.getIdToken();
      const response = await fetch("/api/gs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: "adminGetBehaviorReports" }),
      });
      const result = await response.json();

      if (!response.ok || result?.ok !== true || !Array.isArray(result?.data)) {
        throw new Error(result?.error || "Nie udało się pobrać zgłoszeń");
      }

      setReports(result.data);
    } catch (error) {
      console.error("Błąd pobierania zgłoszeń:", error);
      setReportsError(String(error?.message || error));
    } finally {
      setLoadingReports(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [currentUser]);

  const pendingReports = useMemo(() => {
    return reports.filter((report) => {
      const resolvedValue = report?.resolved;
      const isResolved =
        resolvedValue === true ||
        normalizeText(resolvedValue).toLowerCase() === "true" ||
        normalizeText(resolvedValue).toLowerCase() === "1";
      return !isResolved;
    });
  }, [reports]);

  const updateReportStatus = async (report, status) => {
    if (!currentUser || !report) return false;

    const reportId = String(report?.idZgloszenia || report?.id || report?.reportId || "");
    setProcessingReportId(reportId);

    try {
      const token = await currentUser.getIdToken();
      const response = await fetch("/api/gs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: "adminUpdateBehaviorReport",
          idZgloszenia: reportId,
          idZgłoszenia: reportId,
          reportId,
          status,
          decision: status,
          dogId: String(report?.dogId || ""),
        }),
      });

      const result = await response.json();
      if (!response.ok || result?.ok !== true) {
        throw new Error(result?.error || "Nie udało się zapisać decyzji");
      }

      await fetchReports();
      return true;
    } catch (error) {
      console.error("Błąd aktualizacji zgłoszenia:", error);
      setReportsError(String(error?.message || error));
      return false;
    } finally {
      setProcessingReportId("");
    }
  };

  const handleStartWork = async () => {
    if (!selectedReport) return;

    const dogId = String(selectedReport?.dogId || "");
    const saved = await updateReportStatus(selectedReport, "ZAAKCEPTOWANE");
    if (!saved) return;

    if (dogId && onStartWork) {
      await onStartWork(dogId);
    }

    setSelectedReport(null);
    setActiveTab("work");
  };

  const handleReject = async () => {
    if (!selectedReport) return;

    const saved = await updateReportStatus(selectedReport, "ODRZUCONE");
    if (saved) {
      setSelectedReport(null);
    }
  };

  const fetchUsers = async () => {
    if (!currentUser) return;
    setLoadingUsers(true);
    setUsersError("");
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch("/api/gs", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "listUsersForAdmin" }),
      });
      const result = await res.json();
      if (!res.ok || result?.ok !== true || !Array.isArray(result?.data)) {
        throw new Error(result?.error || "Nie udało się pobrać użytkowników");
      }
      setUsersList(result.data);
    } catch (err) {
      setUsersError(String(err?.message || err));
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleRoleChange = async (email, newRole) => {
    if (!currentUser) return;
    setSavingRole(email);
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch("/api/gs", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "setUserRole", email, role: newRole }),
      });
      const result = await res.json();
      if (!res.ok || result?.ok !== true) {
        throw new Error(result?.error || "Nie udało się zapisać roli");
      }
      setUsersList((prev) =>
        prev.map((u) => (u.email === email ? { ...u, role: newRole } : u))
      );
    } catch (err) {
      setUsersError(String(err?.message || err));
    } finally {
      setSavingRole("");
    }
  };

  const selectedDog = selectedReport ? dogsById.get(String(selectedReport?.dogId || "")) : null;

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div style={styles.title}><Shield size={20} /> Panel Behawiorysty</div>
        <p style={styles.subtitle}>Zalogowano: {currentUser?.email || "-"}</p>
      </div>

      <div style={styles.content}>
        {!selectedReport && (
          <>
            <div style={{ ...styles.tabs, gridTemplateColumns: "1fr 1fr" }}>
              <button
                onClick={() => setActiveTab("reports")}
                style={{ ...styles.tabButton, ...(activeTab === "reports" ? styles.tabButtonActive : {}) }}
              >
                <ClipboardList size={16} style={{ marginRight: 6, verticalAlign: "text-bottom" }} /> Zgłoszenia ({pendingReports.length})
              </button>
              <button
                onClick={() => setActiveTab("work")}
                style={{ ...styles.tabButton, ...(activeTab === "work" ? styles.tabButtonActive : {}) }}
              >
                <Briefcase size={16} style={{ marginRight: 6, verticalAlign: "text-bottom" }} /> Psy w pracy ({sortedDogs.length})
              </button>
              <button
                onClick={() => { setActiveTab("users"); fetchUsers(); }}
                style={{ ...styles.tabButton, ...(activeTab === "users" ? styles.tabButtonActive : {}) }}
              >
                <Users size={16} style={{ marginRight: 6, verticalAlign: "text-bottom" }} /> Użytkownicy
              </button>
              <button
                onClick={() => setActiveTab("database")}
                style={{ ...styles.tabButton, ...(activeTab === "database" ? styles.tabButtonActive : {}) }}
              >
                <Database size={16} style={{ marginRight: 6, verticalAlign: "text-bottom" }} /> Baza
              </button>
            </div>

            {reportsError && <div style={{ ...styles.emptyCard, color: "#991b1b", marginBottom: "1rem" }}>{reportsError}</div>}

            {activeTab === "reports" && (
              <>
                <button onClick={fetchReports} style={{ ...styles.tabButton, width: "100%", marginBottom: "1rem" }}>
                  <RefreshCw size={16} style={{ marginRight: 6, verticalAlign: "text-bottom" }} /> Odśwież zgłoszenia
                </button>

                {loadingReports ? (
                  <div style={styles.emptyCard}>Ładowanie zgłoszeń...</div>
                ) : pendingReports.length === 0 ? (
                  <div style={styles.emptyCard}>Brak nowych zgłoszeń od wolontariuszy.</div>
                ) : (
                  pendingReports.map((report, index) => {
                    const dog = dogsById.get(String(report?.dogId || ""));
                    const reportText = getReportText(report);
                    const reportKey = String(report?.idZgloszenia || report?.id || index);

                    return (
                      <div key={reportKey} style={styles.dogCard}>
                        <div style={{ display: "grid", gridTemplateColumns: "96px 1fr", gap: "1rem", alignItems: "start" }}>
                          {dog?.photo ? (
                            <img
                              src={dog.photo}
                              alt={dog?.name || "Pies"}
                              style={{ ...styles.photo, cursor: "pointer" }}
                              onClick={() => setSelectedReport(report)}
                              onError={(e) => { e.currentTarget.style.display = "none"; }}
                            />
                          ) : (
                            <div style={{ ...styles.photo, display: "flex", alignItems: "center", justifyContent: "center", background: "#f3f4f6", cursor: "pointer" }} onClick={() => setSelectedReport(report)}>🐶</div>
                          )}
                          <div>
                            <h3 style={{ fontSize: "1.1rem", margin: 0 }}>{dog?.name || "Nieznany pies"}</h3>
                            <p style={{ color: "#374151", margin: "0.35rem 0 0" }}>ID: {report?.dogId || "-"}</p>
                            <p style={{ color: "#374151", margin: "0.35rem 0 0" }}>Boks: {dog?.box || "-"}</p>
                            <p style={{ color: "#6b7280", margin: "0.5rem 0 0" }}>{reportText || "Brak treści zgłoszenia."}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </>
            )}

            {activeTab === "database" && (
              <>
                <DatabaseUpdateTab dogs={dogs} currentUser={currentUser} onRefreshDogs={onRefreshDogs} />
                <WalkImport dogs={dogs} currentUser={currentUser} onRefreshDogs={onRefreshDogs} />
              </>
            )}

            {activeTab === "users" && (
              <div>
                <button onClick={fetchUsers} style={{ ...styles.tabButton, width: "100%", marginBottom: "1rem" }}>
                  <RefreshCw size={16} style={{ marginRight: 6, verticalAlign: "text-bottom" }} /> Odśwież listę
                </button>
                {usersError && (
                  <div style={{ ...styles.emptyCard, color: "#991b1b", marginBottom: "1rem" }}>{usersError}</div>
                )}
                {loadingUsers ? (
                  <div style={styles.emptyCard}>Ładowanie użytkowników...</div>
                ) : usersList.length === 0 ? (
                  <div style={styles.emptyCard}>
                    Brak zapisanych użytkowników w arkuszu Roles.<br />
                    Użytkownicy pojawiają się tutaj po pierwszym logowaniu (rola domyślna: Wolontariusz).
                  </div>
                ) : (
                  usersList.map((u) => (
                    <div key={u.email} style={{ ...styles.dogCard, display: "flex", alignItems: "center", gap: "1rem" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontWeight: 700, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {u.email}
                        </p>
                        {u.updatedAt && (
                          <p style={{ color: "#9ca3af", fontSize: "0.75rem", margin: "0.2rem 0 0" }}>
                            Zmieniono: {u.updatedAt}
                          </p>
                        )}
                      </div>
                      <select
                        value={u.role}
                        disabled={savingRole === u.email}
                        onChange={(e) => handleRoleChange(u.email, e.target.value)}
                        style={{
                          border: "1px solid #d1d5db",
                          borderRadius: "0.5rem",
                          padding: "0.4rem 0.6rem",
                          fontWeight: 600,
                          cursor: "pointer",
                          background: "white",
                          flexShrink: 0,
                          opacity: savingRole === u.email ? 0.5 : 1,
                        }}
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                        ))}
                      </select>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === "work" && (
              sortedDogs.length === 0 ? (
                <div style={styles.emptyCard}>Brak psów dodanych przez „Rozpocznij pracę".</div>
              ) : (
                sortedDogs.map((dog) => (
                  <div
                    key={dog.id}
                    onClick={() => {
                      setSelectedDog(dog);
                      setDogCardFrom?.("panel");
                      setCurrentView("dogCard");
                    }}
                    style={{
                      ...styles.dogCard,
                      cursor: "pointer",
                      ...(hoveredCard === `panel-${dog.id}` ? styles.dogCardHover : {}),
                    }}
                    onTouchStart={() => setHoveredCard(`panel-${dog.id}`)}
                    onTouchEnd={() => setHoveredCard(null)}
                  >
                    <div style={{ display: "grid", gridTemplateColumns: "96px 1fr", gap: "1rem", alignItems: "start" }}>
                      {dog.photo ? <img src={dog.photo} alt={dog.name || "Pies"} style={styles.photo} onError={(e) => { e.currentTarget.style.display = "none"; }} /> : <div style={{ ...styles.photo, display: "flex", alignItems: "center", justifyContent: "center", background: "#f3f4f6" }}>🐶</div>}
                      <div>
                        <h3 style={{ fontSize: "1.25rem", fontWeight: "bold", color: "#111827", margin: 0 }}>{dog.name || "Bez imienia"}</h3>
                        <p style={{ color: "#6b7280", marginTop: "0.35rem", marginBottom: 0 }}>{dog.breed || "-"}</p>
                        <p style={{ color: "#374151", marginTop: "0.35rem", marginBottom: 0 }}>
                          {dog.pavilion || "-"} / Boks {dog.box || "-"}
                        </p>
                        <p style={{ color: "#6b7280", marginTop: "0.35rem", marginBottom: 0 }}>ID: {dog.id}</p>
                      </div>
                    </div>
                  </div>
                ))
              )
            )}
          </>
        )}

        {selectedReport && (
          <div style={styles.dogCard}>
            <button onClick={() => setSelectedReport(null)} style={{ ...styles.tabButton, marginBottom: "0.75rem" }}>
              <ArrowLeft size={16} style={{ marginRight: 6, verticalAlign: "text-bottom" }} /> Powrót do zgłoszeń
            </button>
            <div style={{ display: "grid", gridTemplateColumns: "96px 1fr", gap: "1rem", alignItems: "start" }}>
              {selectedDog?.photo ? <img src={selectedDog.photo} alt={selectedDog?.name || "Pies"} style={styles.photo} onError={(e) => { e.currentTarget.style.display = "none"; }} /> : <div style={{ ...styles.photo, display: "flex", alignItems: "center", justifyContent: "center", background: "#f3f4f6" }}>🐶</div>}
              <div>
                <h3 style={{ margin: 0 }}>{selectedDog?.name || "Nieznany pies"}</h3>
                <p style={{ margin: "0.35rem 0 0", color: "#374151" }}>ID: {selectedReport?.dogId || "-"}</p>
                <p style={{ margin: "0.35rem 0 0", color: "#374151" }}>{selectedDog?.pavilion || "-"} / Boks {selectedDog?.box || "-"}</p>
              </div>
            </div>
            <div style={{ marginTop: "1rem", background: "#f9fafb", borderRadius: "0.75rem", padding: "0.75rem", whiteSpace: "pre-wrap" }}>
              {getReportText(selectedReport) || "Brak treści zgłoszenia."}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginTop: "1rem" }}>
              <button
                onClick={handleStartWork}
                disabled={!!processingReportId}
                style={{ ...styles.actionBtn, background: "#16a34a", color: "white", opacity: processingReportId ? 0.7 : 1 }}
              >
                Zaakceptuj
              </button>
              <button
                onClick={handleReject}
                disabled={!!processingReportId}
                style={{ ...styles.actionBtn, background: "#dc2626", color: "white", opacity: processingReportId ? 0.7 : 1 }}
              >
                Odrzuć
              </button>
            </div>
          </div>
        )}
      </div>

      
    </div>
  );
};

// ─── Zbiorcza aktualizacja bazy z rejestru PDF ────────────────────────────────
// Admin wgrywa PDF "Rejestr zwierząt przebywających"; narzędzie porównuje go
// z bazą aplikacji i po zatwierdzeniu wykonuje jedną zbiorczą aktualizację:
// nowe psy, przenosiny (pawilon/boks), archiwizacja nieobecnych.
function DatabaseUpdateTab({ dogs, currentUser, onRefreshDogs }) {
  const [parsing, setParsing] = useState(false);
  const [diff, setDiff] = useState(null);
  const [checks, setChecks] = useState(null);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const box = { background: "white", border: "1px solid #e5e7eb", borderRadius: "0.75rem", padding: "1rem", marginBottom: "0.75rem" };
  const secTitle = { fontWeight: 700, fontSize: "0.95rem", marginBottom: "0.5rem", color: "#111827" };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setParsing(true);
    setError("");
    setDiff(null);
    setResult(null);
    try {
      const rows = await parseDogListPdf(file);
      if (rows.length === 0) {
        setError("Nie znaleziono psów w tym pliku — upewnij się, że to PDF rejestru zwierząt.");
        return;
      }
      // Dopasowanie WYŁĄCZNIE po znormalizowanym ID (bez spacji) po OBU
      // stronach — "P 96/07/23" i "P96/07/23" to ten sam pies
      const appById = new Map(
        (dogs || []).filter((d) => d.id).map((d) => [normalizeDogId(d.id), d])
      );
      const pdfById = new Map(rows.map((r) => [normalizeDogId(r.id), r]));

      const toAdd = rows.filter((r) => !appById.has(normalizeDogId(r.id)));
      const toArchive = (dogs || []).filter((d) => d.id && !pdfById.has(normalizeDogId(d.id)));
      const toRelocate = rows
        .map((r) => {
          const d = appById.get(normalizeDogId(r.id));
          if (!d) return null;
          const samePav = String(d.pavilion || "").toUpperCase() === r.pavilion;
          const sameBox = Number(d.box) === Number(r.box);
          if (samePav && sameBox) return null;
          return { pdf: r, app: d };
        })
        .filter(Boolean);

      // Uzupełnienia: istniejące psy z PUSTYMI polami wiek/chip/rasa,
      // dla których rejestr ma wartość (nie nadpisujemy wypełnionych)
      const toFill = rows
        .map((r) => {
          const d = appById.get(normalizeDogId(r.id));
          if (!d) return null;
          const fields = {};
          if (!String(d.age || "").trim() && r.age) fields.age = r.age;
          if (!String(d.chip || "").trim() && r.chip) fields.chip = r.chip;
          if (!String(d.breed || "").trim() && r.breed) fields.breed = r.breed;
          if (Object.keys(fields).length === 0) return null;
          return { app: d, fields };
        })
        .filter(Boolean);

      const unmatchable = (dogs || []).filter((d) => !d.id);

      setDiff({ fileName: file.name, count: rows.length, toAdd, toArchive, toRelocate, toFill, unmatchable });
      setChecks({
        add: Object.fromEntries(toAdd.map((r) => [r.id, true])),
        relocate: Object.fromEntries(toRelocate.map((r) => [r.pdf.id, true])),
        archive: Object.fromEntries(toArchive.map((d) => [normalizeDogId(d.id), true])),
        fill: Object.fromEntries(toFill.map((f) => [normalizeDogId(f.app.id), true])),
      });
    } catch (err) {
      console.error("Błąd parsowania PDF:", err);
      setError("Nie udało się odczytać PDF: " + (err?.message || "nieznany błąd"));
    } finally {
      setParsing(false);
    }
  };

  const toggle = (group, key) =>
    setChecks((c) => ({ ...c, [group]: { ...c[group], [key]: !c[group][key] } }));

  const selCount = (group, list) => list.filter((k) => checks?.[group]?.[k]).length;

  const execute = async () => {
    if (!diff || !currentUser || running) return;
    const add = diff.toAdd.filter((r) => checks.add[r.id]).map((r) => ({ id: r.id, name: r.name, pavilion: r.pavilion, box: r.box, age: r.age || "", chip: r.chip || "", breed: r.breed || "" }));
    const relocate = diff.toRelocate.filter((r) => checks.relocate[r.pdf.id]).map((r) => ({ dogId: r.app.id, pavilion: r.pdf.pavilion, box: r.pdf.box }));
    const archive = diff.toArchive.filter((d) => checks.archive[normalizeDogId(d.id)]).map((d) => ({ dogId: d.id }));
    const fill = (diff.toFill || []).filter((f) => checks.fill[normalizeDogId(f.app.id)]).map((f) => ({ dogId: f.app.id, ...f.fields }));
    const total = add.length + relocate.length + archive.length + fill.length;
    if (total === 0) { setError("Nie zaznaczono żadnych zmian."); return; }
    if (!window.confirm(`Wykonać aktualizację bazy?\n\n• nowe psy: ${add.length}\n• przenosiny: ${relocate.length}\n• uzupełnienia danych: ${fill.length}\n• do archiwum: ${archive.length}\n\nZmiany trafią do arkusza Google.`)) return;

    setRunning(true);
    setError("");
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch("/api/gs", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "bulkUpdateDogs", add, relocate, archive, fill }),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) throw new Error(json?.error || `HTTP ${res.status}`);
      setResult(json.data);
      setDiff(null);
      onRefreshDogs?.();
    } catch (err) {
      console.error("Błąd aktualizacji bazy:", err);
      setError("Aktualizacja nie powiodła się: " + (err?.message || "nieznany błąd"));
    } finally {
      setRunning(false);
    }
  };

  const CheckRow = ({ checked, onChange, children }) => (
    <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.35rem 0", borderBottom: "1px solid #f3f4f6", fontSize: "0.85rem", cursor: "pointer" }}>
      <input type="checkbox" checked={checked} onChange={onChange} style={{ width: 18, height: 18, flexShrink: 0 }} />
      <span style={{ flex: 1 }}>{children}</span>
    </label>
  );

  return (
    <div>
      <div style={box}>
        <div style={secTitle}>📄 Aktualizacja bazy z rejestru PDF</div>
        <p style={{ fontSize: "0.82rem", color: "#6b7280", margin: "0 0 0.75rem" }}>
          Wgraj PDF „Rejestr zwierząt przebywających". Narzędzie porówna go z bazą aplikacji
          i pokaże zmiany do zatwierdzenia — nic nie dzieje się automatycznie.
        </p>
        <label style={{ display: "inline-block", padding: "0.65rem 1.25rem", borderRadius: "0.5rem", background: "#2563eb", color: "white", fontWeight: 700, fontSize: "0.9rem", cursor: "pointer" }}>
          {parsing ? "Czytam PDF..." : "Wybierz plik PDF"}
          <input type="file" accept="application/pdf" onChange={handleFile} disabled={parsing} style={{ display: "none" }} />
        </label>
        {error && (
          <p style={{ marginTop: "0.6rem", color: "#991b1b", fontSize: "0.85rem", fontWeight: 600 }}>⚠️ {error}</p>
        )}
      </div>

      {result && (
        <div style={{ ...box, background: "#dcfce7", border: "1px solid #86efac" }}>
          <div style={{ fontWeight: 700, color: "#166534", marginBottom: "0.3rem" }}>✅ Aktualizacja wykonana</div>
          <div style={{ fontSize: "0.85rem", color: "#166534" }}>
            Dodano: {result.added} · przeniesiono: {result.relocated} · uzupełniono: {result.filled ?? 0} · zarchiwizowano: {result.archived}
          </div>
          {result.errors?.length > 0 && (
            <div style={{ fontSize: "0.78rem", color: "#92400e", marginTop: "0.4rem" }}>
              Uwagi: {result.errors.join("; ")}
            </div>
          )}
        </div>
      )}

      {diff && (
        <>
          <div style={{ ...box, background: "#eff6ff", border: "1px solid #bfdbfe" }}>
            <div style={{ fontSize: "0.85rem", color: "#1e40af" }}>
              <strong>{diff.fileName}</strong> — {diff.count} psów w rejestrze, {(dogs || []).length} w aplikacji.
            </div>
          </div>

          {diff.toAdd.length > 0 && (
            <div style={box}>
              <div style={secTitle}>🆕 Nowe psy ({selCount("add", diff.toAdd.map((r) => r.id))}/{diff.toAdd.length})</div>
              {diff.toAdd.map((r) => (
                <CheckRow key={r.id} checked={!!checks.add[r.id]} onChange={() => toggle("add", r.id)}>
                  <strong>{r.name || "(bez imienia)"}</strong> · {r.id} · {r.pavilion}{r.box ?? ""}
                  {(r.age || r.breed || r.chip) && (
                    <span style={{ color: "#6b7280" }}> · {[r.age, r.breed, r.chip].filter(Boolean).join(" · ")}</span>
                  )}
                </CheckRow>
              ))}
            </div>
          )}

          {diff.toRelocate.length > 0 && (
            <div style={box}>
              <div style={secTitle}>📦 Przenosiny ({selCount("relocate", diff.toRelocate.map((r) => r.pdf.id))}/{diff.toRelocate.length})</div>
              {diff.toRelocate.map((r) => (
                <CheckRow key={r.pdf.id} checked={!!checks.relocate[r.pdf.id]} onChange={() => toggle("relocate", r.pdf.id)}>
                  <strong>{r.app.name}</strong> · {r.pdf.id}: {String(r.app.pavilion || "?")}{r.app.box ?? "?"} → <strong>{r.pdf.pavilion}{r.pdf.box ?? ""}</strong>
                </CheckRow>
              ))}
            </div>
          )}

          {(diff.toFill || []).length > 0 && (
            <div style={box}>
              <div style={secTitle}>📋 Uzupełnienia danych ({selCount("fill", diff.toFill.map((f) => normalizeDogId(f.app.id)))}/{diff.toFill.length})</div>
              <p style={{ fontSize: "0.75rem", color: "#6b7280", margin: "0 0 0.4rem" }}>
                Tylko puste pola — wypełnione dane nie będą nadpisywane.
              </p>
              {diff.toFill.map((f) => (
                <CheckRow key={f.app.id} checked={!!checks.fill[normalizeDogId(f.app.id)]} onChange={() => toggle("fill", normalizeDogId(f.app.id))}>
                  <strong>{f.app.name}</strong> · {f.app.id} →{" "}
                  {Object.entries(f.fields).map(([k, v]) => `${k === "age" ? "wiek" : k === "chip" ? "chip" : "rasa"}: ${v}`).join(" · ")}
                </CheckRow>
              ))}
            </div>
          )}

          {diff.toArchive.length > 0 && (
            <div style={{ ...box, border: "1px solid #fca5a5" }}>
              <div style={{ ...secTitle, color: "#991b1b" }}>
                🗄 Do archiwum — brak w rejestrze ({selCount("archive", diff.toArchive.map((d) => normalizeDogId(d.id)))}/{diff.toArchive.length})
              </div>
              {diff.toArchive.map((d) => (
                <CheckRow key={d.id} checked={!!checks.archive[normalizeDogId(d.id)]} onChange={() => toggle("archive", normalizeDogId(d.id))}>
                  <strong>{d.name}</strong> · {d.id} · {d.pavilion}{d.box ?? ""}
                </CheckRow>
              ))}
            </div>
          )}

          {diff.unmatchable.length > 0 && (
            <div style={{ ...box, background: "#fef3c7", border: "1px solid #fde68a" }}>
              <div style={{ fontSize: "0.8rem", color: "#92400e" }}>
                ⚠️ {diff.unmatchable.length} psów w aplikacji nie ma ID — nie można ich porównać z rejestrem:
                {" "}{diff.unmatchable.map((d) => d.name).join(", ")}
              </div>
            </div>
          )}

          {diff.toAdd.length === 0 && diff.toRelocate.length === 0 && diff.toArchive.length === 0 && (diff.toFill || []).length === 0 ? (
            <div style={{ ...box, background: "#dcfce7", border: "1px solid #86efac", color: "#166534", fontWeight: 600 }}>
              ✅ Baza jest zgodna z rejestrem — nic do zrobienia.
            </div>
          ) : (
            <button
              onClick={execute}
              disabled={running}
              style={{ width: "100%", padding: "0.9rem", borderRadius: "0.75rem", border: "none", background: running ? "#9ca3af" : "#16a34a", color: "white", fontWeight: 700, fontSize: "1rem", cursor: running ? "not-allowed" : "pointer", marginBottom: "1rem" }}
            >
              {running ? "Aktualizuję bazę..." : "✅ Wykonaj aktualizację bazy"}
            </button>
          )}
        </>
      )}
    </div>
  );
}

export default AdminPanelView;
