import React, { useState, useEffect } from "react";
import {
  AlertCircle,
  TrendingUp,
  Calendar,
  CheckCircle,
  Clock,
  Home,
  MapPin,
  Briefcase,
} from "lucide-react";

const API_URL =
  "https://script.google.com/macros/s/AKfycbzBGx3FjEbJq8yz7wCNJF_GAPsKeclfkRFLt-kDVpxcesN8cKGxwz789DiDsOBnjeh1/exec";

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
    padding: "1.5rem 1rem",
  },
  title: {
    fontSize: "1.5rem",
    fontWeight: "bold",
    color: "#111827",
    marginBottom: "0.5rem",
  },
  subtitle: {
    color: "#6b7280",
    fontSize: "0.875rem",
  },
  content: {
    padding: "1rem",
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "0.75rem",
    marginBottom: "1.5rem",
  },
  statCard: {
    backgroundColor: "white",
    borderRadius: "0.75rem",
    padding: "1rem",
    textAlign: "center",
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
  },
  statNumber: {
    fontSize: "2rem",
    fontWeight: "bold",
    marginBottom: "0.25rem",
  },
  statLabel: {
    fontSize: "0.75rem",
    color: "#6b7280",
  },
  section: {
    marginBottom: "2rem",
  },
  sectionHeader: {
    display: "flex",
    alignItems: "center",
    marginBottom: "1rem",
    padding: "0.75rem",
    borderRadius: "0.75rem",
  },
  sectionHeaderUrgent: {
    backgroundColor: "#fee2e2",
    borderLeft: "4px solid #ef4444",
  },
  sectionHeaderImportant: {
    backgroundColor: "#fef3c7",
    borderLeft: "4px solid #eab308",
  },
  sectionHeaderToday: {
    backgroundColor: "#dbeafe",
    borderLeft: "4px solid #3b82f6",
  },
  sectionHeaderActive: {
    backgroundColor: "#dcfce7",
    borderLeft: "4px solid #22c55e",
  },
  sectionTitle: {
    fontSize: "1rem",
    fontWeight: "bold",
    color: "#111827",
    marginLeft: "0.5rem",
  },
  dogCard: {
    backgroundColor: "white",
    borderRadius: "0.75rem",
    padding: "1rem",
    marginBottom: "0.75rem",
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
    cursor: "pointer",
    transition: "all 0.2s",
  },
  dogCardHover: {
    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
    transform: "translateY(-2px)",
  },
  dogName: {
    fontSize: "1.125rem",
    fontWeight: "bold",
    color: "#111827",
    marginBottom: "0.5rem",
  },
  dogInfo: {
    fontSize: "0.875rem",
    color: "#6b7280",
    marginBottom: "0.25rem",
  },
  urgencyReasons: {
    marginTop: "0.5rem",
    display: "flex",
    flexWrap: "wrap",
    gap: "0.5rem",
  },
  urgencyBadge: {
    fontSize: "0.75rem",
    padding: "0.25rem 0.5rem",
    borderRadius: "0.25rem",
    backgroundColor: "#fee2e2",
    color: "#991b1b",
  },
  emptyState: {
    textAlign: "center",
    padding: "3rem 1rem",
    color: "#6b7280",
  },
  loadingContainer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
  },
  spinner: {
    border: "4px solid #f3f4f6",
    borderTop: "4px solid #2563eb",
    borderRadius: "50%",
    width: "3rem",
    height: "3rem",
    animation: "spin 1s linear infinite",
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

const DashboardView = ({ onDogClick, setCurrentView }) => {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hoveredCard, setHoveredCard] = useState(null);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}?action=getDashboard`);
      const data = await response.json();
      setDashboard(data);
    } catch (err) {
      console.error("Błąd ładowania dashboard:", err);
      setError("Nie udało się załadować danych");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); }}`}</style>
        <div style={styles.spinner}></div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.pageContainer}>
        <div style={styles.header}>
          <div style={styles.headerContent}>
            <h1 style={styles.title}>💼 Praca behawioralna</h1>
          </div>
        </div>
        <div style={styles.content}>
          <div style={styles.emptyState}>
            <p>{error}</p>
            <button
              onClick={fetchDashboard}
              style={{
                marginTop: "1rem",
                padding: "0.75rem 1.5rem",
                backgroundColor: "#3b82f6",
                color: "white",
                border: "none",
                borderRadius: "0.5rem",
                cursor: "pointer",
              }}
            >
              Spróbuj ponownie
            </button>
          </div>
        </div>
      </div>
    );
  }

  const {
    urgent = [],
    important = [],
    todaySessions = [],
    activeWork = [],
    stats = {},
  } = dashboard || {};

  return (
    <div style={styles.pageContainer}>
      <div style={styles.header}>
        <div style={styles.headerContent}>
          <h1 style={styles.title}>💼 Praca behawioralna</h1>
          <p style={styles.subtitle}>Priorytetyzacja i planowanie</p>
        </div>
      </div>

      <div style={styles.content}>
        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <div style={{ ...styles.statNumber, color: "#ef4444" }}>
              {stats.urgentCount || 0}
            </div>
            <div style={styles.statLabel}>Pilne</div>
          </div>
          <div style={styles.statCard}>
            <div style={{ ...styles.statNumber, color: "#22c55e" }}>
              {stats.activeCount || 0}
            </div>
            <div style={styles.statLabel}>W pracy</div>
          </div>
          <div style={styles.statCard}>
            <div style={{ ...styles.statNumber, color: "#6b7280" }}>
              {stats.stableCount || 0}
            </div>
            <div style={styles.statLabel}>Stabilni</div>
          </div>
        </div>

        {todaySessions.length > 0 && (
          <div style={styles.section}>
            <div
              style={{ ...styles.sectionHeader, ...styles.sectionHeaderToday }}
            >
              <Calendar size={20} color="#3b82f6" />
              <h2 style={styles.sectionTitle}>
                Zaplanowane dziś ({todaySessions.length})
              </h2>
            </div>
            {todaySessions.map((dog) => (
              <DogCard
                key={dog.id}
                dog={dog}
                onClick={onDogClick}
                hoveredCard={hoveredCard}
                setHoveredCard={setHoveredCard}
              />
            ))}
          </div>
        )}

        {urgent.length > 0 && (
          <div style={styles.section}>
            <div
              style={{ ...styles.sectionHeader, ...styles.sectionHeaderUrgent }}
            >
              <AlertCircle size={20} color="#ef4444" />
              <h2 style={styles.sectionTitle}>Pilne ({urgent.length})</h2>
            </div>
            {urgent.map((dog) => (
              <DogCard
                key={dog.id}
                dog={dog}
                onClick={onDogClick}
                hoveredCard={hoveredCard}
                setHoveredCard={setHoveredCard}
                showUrgency
              />
            ))}
          </div>
        )}

        {important.length > 0 && (
          <div style={styles.section}>
            <div
              style={{
                ...styles.sectionHeader,
                ...styles.sectionHeaderImportant,
              }}
            >
              <TrendingUp size={20} color="#eab308" />
              <h2 style={styles.sectionTitle}>Ważne ({important.length})</h2>
            </div>
            {important.map((dog) => (
              <DogCard
                key={dog.id}
                dog={dog}
                onClick={onDogClick}
                hoveredCard={hoveredCard}
                setHoveredCard={setHoveredCard}
              />
            ))}
          </div>
        )}

        {activeWork.length > 0 && (
          <div style={styles.section}>
            <div
              style={{ ...styles.sectionHeader, ...styles.sectionHeaderActive }}
            >
              <CheckCircle size={20} color="#22c55e" />
              <h2 style={styles.sectionTitle}>
                Praca aktywna ({activeWork.length})
              </h2>
            </div>
            {activeWork.map((dog) => (
              <DogCard
                key={dog.id}
                dog={dog}
                onClick={onDogClick}
                hoveredCard={hoveredCard}
                setHoveredCard={setHoveredCard}
              />
            ))}
          </div>
        )}

        {urgent.length === 0 &&
          important.length === 0 &&
          todaySessions.length === 0 &&
          activeWork.length === 0 && (
            <div style={styles.emptyState}>
              <p style={{ fontSize: "3rem", marginBottom: "1rem" }}>🎉</p>
              <p
                style={{
                  fontSize: "1.125rem",
                  fontWeight: "600",
                  marginBottom: "0.5rem",
                }}
              >
                Wszystko pod kontrolą!
              </p>
              <p>Nie ma pilnych psów wymagających uwagi.</p>
            </div>
          )}
      </div>

      <div style={styles.bottomNav}>
        <button
          style={styles.bottomNavButton}
          onClick={() => setCurrentView("home")}
        >
          <Home size={24} />
          <span style={{ marginTop: "0.25rem" }}>Home</span>
        </button>
        <button
          style={styles.bottomNavButton}
          onClick={() => setCurrentView("map")}
        >
          <MapPin size={24} />
          <span style={{ marginTop: "0.25rem" }}>Mapa</span>
        </button>
        <button
          style={{ ...styles.bottomNavButton, ...styles.bottomNavButtonActive }}
        >
          <Briefcase size={24} />
          <span style={{ marginTop: "0.25rem" }}>Praca</span>
        </button>
      </div>
    </div>
  );
};

const DogCard = ({
  dog,
  onClick,
  hoveredCard,
  setHoveredCard,
  showUrgency,
}) => {
  const getUrgencyReasons = () => {
    const reasons = [];
    if (dog.urgencyScore >= 60 && showUrgency) {
      if (dog.work?.priority >= 4) reasons.push("Wysoki priorytet");
      const daysSince = dog.lastWalk
        ? Math.floor(
            (new Date() - new Date(dog.lastWalk)) / (1000 * 60 * 60 * 24)
          )
        : 999;
      if (daysSince > 7) reasons.push(`${daysSince} dni bez spaceru`);
    }
    return reasons;
  };

  return (
    <div
      onClick={() => onClick(dog)}
      style={{
        ...styles.dogCard,
        ...(hoveredCard === dog.id ? styles.dogCardHover : {}),
      }}
      onTouchStart={() => setHoveredCard(dog.id)}
      onTouchEnd={() => setHoveredCard(null)}
    >
      <div style={styles.dogName}>{dog.name}</div>
      <div style={styles.dogInfo}>
        📍 {dog.pavilion} / Boks {dog.box}
      </div>
      <div style={styles.dogInfo}>🆔 {dog.id}</div>
      {dog.work?.goals && (
        <div style={{ ...styles.dogInfo, marginTop: "0.5rem" }}>
          🎯 {dog.work.goals.substring(0, 60)}
          {dog.work.goals.length > 60 && "..."}
        </div>
      )}
      {showUrgency && getUrgencyReasons().length > 0 && (
        <div style={styles.urgencyReasons}>
          {getUrgencyReasons().map((reason, i) => (
            <span key={i} style={styles.urgencyBadge}>
              {reason}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default DashboardView;

