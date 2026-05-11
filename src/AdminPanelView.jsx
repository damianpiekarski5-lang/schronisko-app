import React, { useEffect, useMemo, useState } from "react";
import { Shield, Home, MapPin, Star, Briefcase, ClipboardList, RefreshCw, ArrowLeft, Users } from "lucide-react";
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
  hoveredCard,
  setHoveredCard,
  onStartWork,
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
            <div style={{ ...styles.tabs, gridTemplateColumns: "1fr 1fr 1fr" }}>
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
                          <img
                            src={dog?.photo || ""}
                            alt={dog?.name || "Pies"}
                            style={{ ...styles.photo, cursor: "pointer" }}
                            onClick={() => setSelectedReport(report)}
                            onError={(e) => { e.currentTarget.style.display = "none"; }}
                          />
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

            {activeTab === “users” && (
              <div>
                <button onClick={fetchUsers} style={{ ...styles.tabButton, width: “100%”, marginBottom: “1rem” }}>
                  <RefreshCw size={16} style={{ marginRight: 6, verticalAlign: “text-bottom” }} /> Odśwież listę
                </button>
                {usersError && (
                  <div style={{ ...styles.emptyCard, color: “#991b1b”, marginBottom: “1rem” }}>{usersError}</div>
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
                    <div key={u.email} style={{ ...styles.dogCard, display: “flex”, alignItems: “center”, gap: “1rem” }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontWeight: 700, margin: 0, overflow: “hidden”, textOverflow: “ellipsis”, whiteSpace: “nowrap” }}>
                          {u.email}
                        </p>
                        {u.updatedAt && (
                          <p style={{ color: “#9ca3af”, fontSize: “0.75rem”, margin: “0.2rem 0 0” }}>
                            Zmieniono: {u.updatedAt}
                          </p>
                        )}
                      </div>
                      <select
                        value={u.role}
                        disabled={savingRole === u.email}
                        onChange={(e) => handleRoleChange(u.email, e.target.value)}
                        style={{
                          border: “1px solid #d1d5db”,
                          borderRadius: “0.5rem”,
                          padding: “0.4rem 0.6rem”,
                          fontWeight: 600,
                          cursor: “pointer”,
                          background: “white”,
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

            {activeTab === “work” && (
              sortedDogs.length === 0 ? (
                <div style={styles.emptyCard}>Brak psów dodanych przez „Rozpocznij pracę”.</div>
              ) : (
                sortedDogs.map((dog) => (
                  <div
                    key={dog.id}
                    onClick={() => {
                      setSelectedDog(dog);
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
                      <img src={dog.photo || ""} alt={dog.name || "Pies"} style={styles.photo} onError={(e) => { e.currentTarget.style.display = "none"; }} />
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
              <img src={selectedDog?.photo || ""} alt={selectedDog?.name || "Pies"} style={styles.photo} onError={(e) => { e.currentTarget.style.display = "none"; }} />
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
          <Shield size={24} />
          <span style={{ marginTop: "0.25rem" }}>Panel</span>
        </button>
      </div>
    </div>
  );
};

export default AdminPanelView;
