import React, { useState } from "react";
import {
  Search,
  X,
  Clock,
  AlertCircle,
  MapPin,
  Hash,
  Home,
  Star,
  Shield,
  Building2,
  Dumbbell,
} from "lucide-react";
import { getLastWalkPresentation } from "./utils/dateTime";

// Sektory z zakazem wyprowadzania (kwarantanna) — psy stamtąd nie trafiają
// na listę "Potrzebują spaceru" i nie dostają plakietki pilności
const NO_WALK_PAVILIONS = new Set(["KP", "U"]);
import { useUserRole } from "./hooks/useUserRole";
import { canViewSector } from "./lib/roles";
import AttendanceCard from "./AttendanceCard";

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
  searchContainer: {
    marginTop: "1rem",
    position: "relative",
  },
  searchInput: {
    width: "100%",
    paddingLeft: "3rem",
    paddingRight: "3rem",
    paddingTop: "1rem",
    paddingBottom: "1rem",
    backgroundColor: "white",
    border: "2px solid #e5e7eb",
    borderRadius: "0.75rem",
    fontSize: "1rem",
    outline: "none",
  },
  searchIcon: {
    position: "absolute",
    left: "1rem",
    top: "50%",
    transform: "translateY(-50%)",
    color: "#9ca3af",
  },
  clearButton: {
    position: "absolute",
    right: "1rem",
    top: "50%",
    transform: "translateY(-50%)",
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "#9ca3af",
    padding: "0.5rem",
  },
  content: {
    padding: "1rem",
  },
  section: {
    marginBottom: "2rem",
  },
  sectionHeader: {
    display: "flex",
    alignItems: "center",
    marginBottom: "1rem",
    padding: "0.75rem",
    backgroundColor: "#fef3c7",
    borderRadius: "0.75rem",
    borderLeft: "4px solid #eab308",
  },
  sectionHeaderUrgent: {
    backgroundColor: "#fee2e2",
    borderLeft: "4px solid #ef4444",
  },
  sectionTitle: {
    fontSize: "1rem",
    fontWeight: "bold",
    color: "#111827",
    marginLeft: "0.5rem",
  },
  dogCard: {
    backgroundColor: "white",
    border: "2px solid #e5e7eb",
    borderRadius: "1rem",
    padding: "1.25rem",
    cursor: "pointer",
    transition: "all 0.2s",
    marginBottom: "1rem",
  },
  dogCardHover: {
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
    borderColor: "#3b82f6",
    transform: "translateY(-2px)",
  },
  dogPhoto: {
    width: "100%",
    aspectRatio: "1 / 1",
    objectFit: "cover",
    borderRadius: "0.75rem",
    backgroundColor: "#f3f4f6",
    marginBottom: "1rem",
  },
  emptyState: {
    textAlign: "center",
    padding: "3rem 1rem",
    color: "#6b7280",
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

const DogPhoto = ({ photo, name }) => {
  const [imgError, setImgError] = useState(false);
  const hasValidPhoto = typeof photo === "string" && photo.trim().length > 5;

  if (!hasValidPhoto || imgError) {
    return (
      <div
        style={{
          ...styles.dogPhoto,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f3f4f6",
        }}
      >
        <img src="/icon-192.png" alt="pies" style={{ width: "60%", opacity: 0.25 }} />
      </div>
    );
  }

  return (
    <img
      src={photo}
      alt={name}
      style={styles.dogPhoto}
      onError={() => setImgError(true)}
    />
  );
};


const HomeView = ({
  dogs,
  onDogClick,
  hoveredCard,
  setHoveredCard,
  setCurrentView,
  isAdmin,
  isBehavioryst,
  currentUser,
  quarantineDogIds,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const { role: userRole } = useUserRole();

  const filterDogs = () => {
    if (!searchTerm) return dogs;
    const term = searchTerm.toLowerCase().trim();

    // Smart search: rozpoznaj pattern "pawilon + numer boksu" (np. "zg3", "e5", "p2")
    const pavilionBoxPattern = /^([a-z]+)(\d+)$/i;
    const match = term.match(pavilionBoxPattern);

    if (match) {
      const pavilion = match[1].toUpperCase();
      const box = parseInt(match[2]);
      return dogs.filter(
        (dog) => dog.pavilion?.toUpperCase() === pavilion && dog.box === box
      );
    }

    // Standardowe wyszukiwanie
    return dogs.filter(
      (dog) =>
        dog.name?.toLowerCase().includes(term) ||
        dog.breed?.toLowerCase().includes(term) ||
        dog.pavilion?.toLowerCase() === term || // Exact match dla pawilonu
        dog.pavilion?.toLowerCase().includes(term) || // Partial match
        dog.box?.toString() === term ||
        dog.id?.toLowerCase().includes(term)
    );
  };

  // Kwarantanna: pawilon KP/U albo ręczne oznaczenie z terminem "od-do"
  const isQuarantined = (dog) =>
    NO_WALK_PAVILIONS.has(String(dog.pavilion || "").toUpperCase())
    || !!(quarantineDogIds && quarantineDogIds.has(String(dog.id)));

  const getDogsNeedingWalk = () => {
    return dogs
      .filter((dog) => !isQuarantined(dog))
      .filter((dog) => (getLastWalkPresentation(dog.lastWalk).daysSince ?? 999) >= 5)
      .sort((a, b) => (getLastWalkPresentation(b.lastWalk).daysSince ?? 999) - (getLastWalkPresentation(a.lastWalk).daysSince ?? 999));
  };

  const getAllDogsSorted = () => {
    return [...dogs].sort(
      (a, b) => (getLastWalkPresentation(b.lastWalk).daysSince ?? 999) - (getLastWalkPresentation(a.lastWalk).daysSince ?? 999)
    );
  };

  const filteredDogs = filterDogs();
  const dogsNeedingWalk = getDogsNeedingWalk();
  const allDogsSorted = getAllDogsSorted();
  // Sekcja pilnych ograniczona do 10 — bez tego strona renderowała
  // ~200 kart w sekcji pilnych i drugie tyle w "Wszystkie psy"
  const [showAllUrgent, setShowAllUrgent] = useState(false);
  const urgentShown = showAllUrgent ? dogsNeedingWalk : dogsNeedingWalk.slice(0, 10);

  return (
    <div style={styles.pageContainer}>
      <style>{`input:focus { border-color: #3b82f6 !important; }`}</style>

      <div style={styles.header}>
        <div style={styles.headerContent}>
          <h1 style={{ ...styles.title, display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <img src="/icon-192.png" alt="logo" style={{ width: "2rem", height: "2rem", borderRadius: "6px" }} />
            Psy w schronisku
          </h1>
          <p style={styles.subtitle}>{dogs.length} psów czeka na spacer</p>

          <div style={styles.searchContainer}>
            <Search style={styles.searchIcon} size={20} />
            <input
              type="text"
              placeholder="Szukaj: imię, pawilon, boks, ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={styles.searchInput}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                style={styles.clearButton}
              >
                <X size={20} />
              </button>
            )}
          </div>
        </div>
      </div>

      <div style={styles.content}>
        <AttendanceCard
          currentUser={currentUser}
          onShowHours={() => setCurrentView("myHours")}
        />
        {searchTerm ? (
          <div style={styles.section}>
            <h2
              style={{
                fontSize: "1.125rem",
                fontWeight: "bold",
                marginBottom: "1rem",
              }}
            >
              Znaleziono: {filteredDogs.length}
            </h2>
            {filteredDogs.length === 0 ? (
              <div style={styles.emptyState}>
                <p>Nie znaleziono</p>
              </div>
            ) : (
              filteredDogs.map((dog) => (
                <DogCard
                  quarantined={isQuarantined(dog)}
                  key={dog.id}
                  dog={dog}
                  onClick={onDogClick}
                  hoveredCard={hoveredCard}
                  setHoveredCard={setHoveredCard}
                />
              ))
            )}
          </div>
        ) : (
          <>
            {dogsNeedingWalk.length > 0 && (
              <div style={styles.section}>
                <div
                  style={{
                    ...styles.sectionHeader,
                    ...styles.sectionHeaderUrgent,
                  }}
                >
                  <AlertCircle size={20} color="#ef4444" />
                  <h2 style={styles.sectionTitle}>
                    ⏰ Potrzebują spaceru ({dogsNeedingWalk.length})
                  </h2>
                </div>
                {urgentShown.map((dog) => (
                  <DogCard
                    quarantined={isQuarantined(dog)}
                    key={dog.id}
                    dog={dog}
                    onClick={onDogClick}
                    hoveredCard={hoveredCard}
                    setHoveredCard={setHoveredCard}
                    urgent
                  />
                ))}
                {dogsNeedingWalk.length > 10 && (
                  <button
                    onClick={() => setShowAllUrgent((v) => !v)}
                    style={{
                      width: "100%",
                      padding: "0.7rem",
                      borderRadius: "0.75rem",
                      border: "1px solid #fca5a5",
                      background: "#fef2f2",
                      color: "#991b1b",
                      fontWeight: 600,
                      fontSize: "0.85rem",
                      cursor: "pointer",
                    }}
                  >
                    {showAllUrgent
                      ? "Zwiń listę ▲"
                      : `Pokaż wszystkie pilne (${dogsNeedingWalk.length}) ▼`}
                  </button>
                )}
              </div>
            )}

            <div style={styles.section}>
              <h2
                style={{
                  fontSize: "1.125rem",
                  fontWeight: "bold",
                  marginBottom: "1rem",
                }}
              >
                Wszystkie psy ({dogs.length})
              </h2>
              {allDogsSorted.map((dog) => (
                <DogCard
                  quarantined={isQuarantined(dog)}
                  key={dog.id}
                  dog={dog}
                  onClick={onDogClick}
                  hoveredCard={hoveredCard}
                  setHoveredCard={setHoveredCard}
                />
              ))}
            </div>
          </>
        )}
      </div>

      
    </div>
  );
};

const DogCard = ({ dog, onClick, hoveredCard, setHoveredCard, urgent, quarantined }) => {
  const walkPresentation = getLastWalkPresentation(dog.lastWalk);
  const noWalks = quarantined
    || NO_WALK_PAVILIONS.has(String(dog.pavilion || "").toUpperCase());

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
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "120px 1fr",
          gap: "1rem",
        }}
      >
        <DogPhoto photo={dog.photo} name={dog.name} />
        <div>
          <h3
            style={{
              fontSize: "1.25rem",
              fontWeight: "bold",
              color: "#111827",
              marginBottom: "0.5rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              flexWrap: "wrap",
            }}
          >
            {dog.name}
            {!noWalks && (walkPresentation.daysSince ?? 0) >= 5 && (
              <span style={{
                fontSize: "0.68rem",
                fontWeight: 700,
                color: "#991b1b",
                background: "#fee2e2",
                border: "1px solid #fca5a5",
                borderRadius: "9999px",
                padding: "0.15rem 0.55rem",
                whiteSpace: "nowrap",
              }}>
                {walkPresentation.daysSince >= 999 ? "brak danych o spacerze" : `${walkPresentation.daysSince} dni bez spaceru`}
              </span>
            )}
          </h3>
          <p
            style={{
              fontSize: "0.875rem",
              color: "#6b7280",
              marginBottom: "0.5rem",
            }}
          >
            {dog.breed}
          </p>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              fontSize: "0.75rem",
              color: "#9ca3af",
              marginBottom: "0.5rem",
            }}
          >
            <MapPin size={14} style={{ marginRight: "0.25rem" }} />
            {dog.pavilion} / Boks {dog.box}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              fontSize: "0.75rem",
              color: "#d1d5db",
              marginBottom: "0.75rem",
            }}
          >
            <Hash size={14} style={{ marginRight: "0.25rem" }} />
            {dog.id}
          </div>
          {noWalks ? (
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "#92400e", background: "#fef3c7", border: "1px solid #fde68a", borderRadius: "9999px", padding: "0.15rem 0.6rem" }}>
                🚫 kwarantanna — nie wyprowadzamy
              </span>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Clock
                size={16}
                color={walkPresentation.color}
              />
              <span
                style={{
                  fontSize: "0.875rem",
                  fontWeight: "600",
                  color: walkPresentation.color,
                }}
              >
                {walkPresentation.label}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HomeView;
