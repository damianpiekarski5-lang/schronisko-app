import React, { useState, useEffect, useCallback } from "react";
import { Home, MapPin, Star, Shield, Building2, RefreshCw, ArrowLeft } from "lucide-react";
import { useUserRole } from "./hooks/useUserRole";
import { canViewSector } from "./lib/roles";

const styles = {
  pageContainer: {
    minHeight: "100vh",
    backgroundColor: "#f9fafb",
    paddingBottom: "80px",
  },
  header: {
    backgroundColor: "white",
    borderBottom: "1px solid #e5e7eb",
    position: "sticky",
    top: 0,
    zIndex: 100,
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
  },
  headerContent: {
    padding: "1rem",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  title: {
    fontSize: "1.5rem",
    fontWeight: "bold",
    color: "#111827",
    marginBottom: "0.25rem",
  },
  subtitle: {
    color: "#6b7280",
    fontSize: "0.875rem",
  },
  content: {
    padding: "1rem",
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
  dogCard: {
    backgroundColor: "white",
    borderRadius: "0.75rem",
    padding: "1rem",
    marginBottom: "0.75rem",
    border: "1px solid #e5e7eb",
    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
    cursor: "pointer",
  },
  dogCardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: "0.5rem",
  },
  dogName: {
    fontSize: "1.1rem",
    fontWeight: "700",
    color: "#111827",
  },
  dogLocation: {
    fontSize: "0.85rem",
    color: "#6b7280",
  },
  flagRow: {
    fontSize: "0.875rem",
    fontWeight: "600",
    marginBottom: "0.3rem",
  },
  infoRow: {
    fontSize: "0.85rem",
    color: "#374151",
    marginBottom: "0.25rem",
  },
  select: {
    width: "100%",
    padding: "0.6rem 0.75rem",
    borderRadius: "0.75rem",
    border: "1px solid #d1d5db",
    fontSize: "0.9rem",
    backgroundColor: "white",
    marginBottom: "0.5rem",
    color: "#111827",
  },
  counterText: {
    fontSize: "0.8rem",
    color: "#6b7280",
    marginBottom: "1rem",
  },
};

function formatUntil(isoString) {
  if (!isoString) return null;
  const d = new Date(isoString);
  return d.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" });
}

function sortDogs(dogs) {
  return [...dogs].sort((a, b) => {
    const rankA = (a.noFood || a.walkBlocked) ? 0 : a.diet ? 1 : 2;
    const rankB = (b.noFood || b.walkBlocked) ? 0 : b.diet ? 1 : 2;
    if (rankA !== rankB) return rankA - rankB;
    return (a.name || "").localeCompare(b.name || "", "pl");
  });
}

const SectorView = ({ setCurrentView, setSelectedDog, setDogCardFrom, currentUser, isAdmin }) => {
  const { role } = useUserRole();
  const [dogs, setDogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [selectedPawilon, setSelectedPawilon] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const fetchDogs = useCallback(async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true);
    try {
      const res = await fetch("/api/gs?action=getSectorDogs");
      const result = await res.json();
      if (result?.ok && Array.isArray(result?.data)) {
        setDogs(result.data);
        setLastRefresh(new Date());
      }
    } catch {}
    setLoading(false);
    if (showSpinner) setRefreshing(false);
  }, []);

  useEffect(() => {
    fetchDogs();
    const id = setInterval(() => fetchDogs(), 60000);
    return () => clearInterval(id);
  }, [fetchDogs]);

  const pavilions = [...new Set(dogs.map((d) => d.pavilion).filter(Boolean))].sort();

  const filtered = selectedPawilon
    ? dogs.filter((d) => d.pavilion === selectedPawilon)
    : dogs;

  const sorted = sortDogs(filtered);

  const handleDogClick = (dog) => {
    // Find the full dog object — sector only has partial data, navigate to dogCard anyway
    setSelectedDog({
      id: dog.id,
      name: dog.name,
      pavilion: dog.pavilion,
      box: dog.box,
      diet: dog.diet,
      warnings: dog.caution,
    });
    setDogCardFrom("sector");
    setCurrentView("dogCard");
  };

  if (!canViewSector(role)) {
    return (
      <div style={styles.pageContainer}>
        <div style={{ padding: "2rem", textAlign: "center", color: "#6b7280" }}>
          Brak dostępu do widoku Sektor.
        </div>
      </div>
    );
  }

  return (
    <div style={styles.pageContainer}>
      <div style={styles.header}>
        <div style={styles.headerContent}>
          <div>
            <h1 style={styles.title}>🏢 Sektor</h1>
            <p style={styles.subtitle}>
              Psy z obostrzeniami
              {lastRefresh && ` · odświeżono o ${lastRefresh.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })}`}
            </p>
          </div>
          <button
            onClick={() => fetchDogs(true)}
            disabled={refreshing}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#2563eb", padding: "0.5rem", opacity: refreshing ? 0.5 : 1 }}
          >
            <RefreshCw size={22} style={{ animation: refreshing ? "spin 1s linear infinite" : "none" }} />
          </button>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); }}`}</style>

      <div style={styles.content}>
        <select
          value={selectedPawilon}
          onChange={(e) => setSelectedPawilon(e.target.value)}
          style={styles.select}
        >
          <option value="">Wszystkie pawilony</option>
          {pavilions.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>

        <p style={styles.counterText}>
          {loading ? "Ładowanie..." : `${sorted.length} psów z obostrzeniami${selectedPawilon ? ` · pawilon ${selectedPawilon}` : ` · ${dogs.length} łącznie`}`}
        </p>

        {!loading && sorted.length === 0 && (
          <div style={{ textAlign: "center", padding: "3rem 1rem", color: "#9ca3af" }}>
            <p style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>✅</p>
            <p style={{ fontWeight: 600 }}>Brak psów z obostrzeniami</p>
          </div>
        )}

        {sorted.map((dog) => (
          <div
            key={dog.id}
            style={styles.dogCard}
            onClick={() => handleDogClick(dog)}
          >
            <div style={styles.dogCardHeader}>
              <span style={styles.dogName}>{dog.name}</span>
              <span style={styles.dogLocation}>
                {dog.pavilion}{dog.box ? ` / boks ${dog.box}` : ""}
              </span>
            </div>

            {dog.noFood && (
              <div style={{ ...styles.flagRow, color: "#dc2626" }}>
                🔴 NIE KARMIĆ
                {dog.noFoodNote ? ` — ${dog.noFoodNote}` : ""}
                {dog.noFoodUntil ? ` do ${formatUntil(dog.noFoodUntil)}` : ""}
              </div>
            )}

            {dog.walkBlocked && (
              <div style={{ ...styles.flagRow, color: "#7c3aed" }}>
                🚫 ZAKAZ SPACERU
                {dog.walkBlockedNote ? ` — ${dog.walkBlockedNote}` : ""}
                {dog.walkBlockedUntil ? ` do ${formatUntil(dog.walkBlockedUntil)}` : ""}
              </div>
            )}

            {dog.diet && (
              <div style={styles.infoRow}>
                🥩 Dieta: {dog.diet}
              </div>
            )}

            {dog.caution && (
              <div style={{ ...styles.infoRow, color: "#92400e" }}>
                ⚠️ {dog.caution}
              </div>
            )}
          </div>
        ))}
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
