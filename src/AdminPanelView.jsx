import React from "react";
import { Shield, Home, MapPin, Star } from "lucide-react";

const styles = {
  page: { minHeight: "100vh", backgroundColor: "#f9fafb", paddingBottom: "90px" },
  header: { backgroundColor: "white", borderBottom: "1px solid #e5e7eb", padding: "1rem" },
  title: { display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: "800", fontSize: "1.2rem", color: "#111827" },
  subtitle: { color: "#6b7280", fontSize: "0.875rem", marginTop: "0.35rem" },
  content: { padding: "1rem" },
  dogCard: {
    backgroundColor: "white",
    borderRadius: "1rem",
    padding: "1.25rem",
    marginBottom: "1rem",
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
    transition: "all 0.2s",
    cursor: "pointer",
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

const AdminPanelView = ({
  currentUser,
  behaviorystDogs,
  setCurrentView,
  setSelectedDog,
  hoveredCard,
  setHoveredCard,
}) => {
  const sortedDogs = [...(behaviorystDogs || [])].sort((a, b) => a.name.localeCompare(b.name, "pl"));

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div style={styles.title}><Shield size={20} /> Panel Behawiorysty</div>
        <p style={styles.subtitle}>Psy w pracy: {sortedDogs.length} • {currentUser?.email || "-"}</p>
      </div>

      <div style={styles.content}>
        {sortedDogs.length === 0 ? (
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
