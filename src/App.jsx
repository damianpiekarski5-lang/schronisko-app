import React, { useState, useEffect } from "react";
import {
  ArrowLeft,
  AlertCircle,
  MapPin,
  Search,
  X,
  Calendar,
  Hash,
  Home,
  ClipboardPlus,
  ExternalLink,
  Clock,
  Star,
  LogOut,
  Shield,
} from "lucide-react";
import WalkSurvey from "./WalkSurvey";
import BehaviorReport from "./BehaviorReport";
import HomeView from "./HomeView";
import AdminPanelView from "./AdminPanelView";
import { parseSpreadsheetDate, getLastWalkPresentation } from "./utils/dateTime";
import {
  auth,
  googleProvider,
  hasFirebaseConfig,
  firebaseInitError,
} from "./firebase";
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from "firebase/auth";

// Mobile-optimized styles

const FALLBACK_ADMIN_EMAILS = ["damian.piekarski5@gmail.com"]; // TODO: utrzymuj listę adminów przez zmienną środowiskową ADMIN_EMAILS

function getAdminEmails() {
  const fromEnv = process.env.REACT_APP_ADMIN_EMAILS || "";
  const source = fromEnv || FALLBACK_ADMIN_EMAILS.join(",");

  return source
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

function isAdminEmail(email) {
  if (!email) return false;
  return getAdminEmails().includes(String(email).trim().toLowerCase());
}

const BEHAVIORYST_ASSIGN_EMAIL = "damian.piekarski5@gmail.com";

const styles = {
  // Layout
  pageContainer: {
    minHeight: "100vh",
    width: "100%",
    maxWidth: "100vw",
    backgroundColor: "#f9fafb",
    paddingBottom: "80px",
    overflowX: "hidden",
    boxSizing: "border-box",
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
  card: {
    backgroundColor: "white",
    borderRadius: "1rem",
    boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
    padding: "1.25rem",
    marginBottom: "1.5rem",
  },
  mapContainer: {
    backgroundColor: "#eff6ff",
    borderRadius: "0.75rem",
    padding: "0.5rem",
    overflowX: "auto",
    WebkitOverflowScrolling: "touch",
  },
  dogPhoto: {
    width: "100%",
    aspectRatio: "1 / 1",
    objectFit: "cover",
    borderRadius: "0.75rem",
    backgroundColor: "#f3f4f6",
  },
  dogPhotoLarge: {
    width: "100%",
    maxWidth: "500px",
    aspectRatio: "1 / 1",
    objectFit: "cover",
    borderRadius: "1rem",
    marginLeft: "auto",
    marginRight: "auto",
    display: "block",
    backgroundColor: "#f3f4f6",
  },
  dogCard: {
    backgroundColor: "white",
    border: "2px solid #e5e7eb",
    borderRadius: "1rem",
    padding: "1.25rem",
    cursor: "pointer",
    transition: "all 0.2s",
    minHeight: "140px",
  },
  dogCardHover: {
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
    borderColor: "#3b82f6",
    transform: "translateY(-2px)",
  },
  boxCard: {
    padding: "1.5rem 1rem",
    borderRadius: "1rem",
    border: "2px solid",
    cursor: "pointer",
    textAlign: "center",
    transition: "all 0.2s",
    minHeight: "120px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
  },
  boxCardEmpty: {
    backgroundColor: "#f9fafb",
    borderColor: "#e5e7eb",
  },
  boxCardFull: {
    backgroundColor: "white",
    borderColor: "#86efac",
  },
  badgeGreen: {
    display: "inline-block",
    padding: "0.5rem 1rem",
    borderRadius: "9999px",
    fontSize: "0.75rem",
    fontWeight: "700",
    backgroundColor: "#dcfce7",
    color: "#166534",
  },
  badgeYellow: {
    display: "inline-block",
    padding: "0.5rem 1rem",
    borderRadius: "9999px",
    fontSize: "0.75rem",
    fontWeight: "700",
    backgroundColor: "#fef3c7",
    color: "#92400e",
  },
  backButton: {
    display: "flex",
    alignItems: "center",
    color: "#2563eb",
    backgroundColor: "transparent",
    border: "none",
    cursor: "pointer",
    fontSize: "1rem",
    padding: "0.75rem",
    marginLeft: "-0.75rem",
    marginBottom: "0.5rem",
    borderRadius: "0.5rem",
    transition: "background-color 0.2s",
  },
  walkButton: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    padding: "1rem",
    backgroundColor: "#22c55e",
    color: "white",
    border: "none",
    borderRadius: "0.75rem",
    fontSize: "1.125rem",
    fontWeight: "700",
    cursor: "pointer",
    transition: "all 0.2s",
    boxShadow: "0 2px 4px rgba(34, 197, 94, 0.3)",
    marginBottom: "1rem",
  },
  walkButtonDisabled: {
    backgroundColor: "#9ca3af",
    cursor: "not-allowed",
    boxShadow: "none",
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
  infoBox: {
    backgroundColor: "#f9fafb",
    borderRadius: "0.75rem",
    padding: "1rem",
    border: "1px solid #e5e7eb",
    marginBottom: "0.75rem",
  },
  infoLabel: {
    fontSize: "0.875rem",
    fontWeight: "600",
    color: "#6b7280",
    marginBottom: "0.5rem",
  },
  infoValue: {
    color: "#111827",
    fontSize: "1rem",
  },
  sectionBlue: {
    borderLeft: "4px solid #3b82f6",
    backgroundColor: "#eff6ff",
    padding: "1rem",
    borderRadius: "0 0.75rem 0.75rem 0",
    marginBottom: "1rem",
  },
  sectionGreen: {
    borderLeft: "4px solid #22c55e",
    backgroundColor: "#f0fdf4",
    padding: "1rem",
    borderRadius: "0 0.75rem 0.75rem 0",
    marginBottom: "1rem",
  },
  sectionPurple: {
    borderLeft: "4px solid #a855f7",
    backgroundColor: "#faf5ff",
    padding: "1rem",
    borderRadius: "0 0.75rem 0.75rem 0",
    marginBottom: "1rem",
  },
  sectionRed: {
    borderLeft: "4px solid #ef4444",
    backgroundColor: "#fef2f2",
    padding: "1rem",
    borderRadius: "0 0.75rem 0.75rem 0",
    marginBottom: "1rem",
  },
  sectionGray: {
    borderLeft: "4px solid #6b7280",
    backgroundColor: "#f9fafb",
    padding: "1rem",
    borderRadius: "0 0.75rem 0.75rem 0",
    marginBottom: "1rem",
  },
  sectionYellow: {
    borderLeft: "4px solid #eab308",
    backgroundColor: "#fefce8",
    padding: "1rem",
    borderRadius: "0 0.75rem 0.75rem 0",
    marginBottom: "1rem",
  },
  sectionTitle: {
    fontWeight: "bold",
    color: "#111827",
    marginBottom: "0.5rem",
    display: "flex",
    alignItems: "center",
    fontSize: "1rem",
  },
  statCard: {
    backgroundColor: "white",
    borderRadius: "1rem",
    boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
    padding: "1.5rem",
    textAlign: "center",
  },
  statNumber: {
    fontSize: "2.5rem",
    fontWeight: "bold",
  },
  statLabel: {
    color: "#6b7280",
    marginTop: "0.5rem",
    fontSize: "0.875rem",
  },
  loadingContainer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    backgroundColor: "#f9fafb",
  },
  spinner: {
    border: "4px solid #f3f4f6",
    borderTop: "4px solid #2563eb",
    borderRadius: "50%",
    width: "4rem",
    height: "4rem",
    animation: "spin 1s linear infinite",
  },
};

const pavilionConfig = {
  R: {
    x: -37,
    y: 110,
    width: 110,
    height: 25,
    type: "dog",
    special: "zewnętrzne",
  },
  P: {
    x: -38,
    y: 135,
    width: 110,
    height: 25,
    type: "dog",
    special: "zewnętrzne",
  },
  Y: {
    x: 523,
    y: 144,
    width: 125,
    height: 25,
    type: "dog",
    special: "zewnętrzne",
  },
  T: {
    x: -41,
    y: 176,
    width: 25,
    height: 110,
    type: "dog",
    rotation: 35,
    special: "zewnętrzne",
  },
  V: {
    x: -19,
    y: 191,
    width: 25,
    height: 110,
    type: "dog",
    rotation: 35,
    special: "zewnętrzne",
  },
  X: {
    x: -54,
    y: 398,
    width: 150,
    height: 25,
    type: "dog",
    special: "zewnętrzne",
  },
  N: {
    x: -12,
    y: 465,
    width: 110,
    height: 25,
    type: "dog",
    special: "zewnętrzne",
  },
  U: {
    x: -13,
    y: 492,
    width: 110,
    height: 25,
    type: "dog",
    special: "zewnętrzne",
  },
  L: {
    x: -53,
    y: 426,
    width: 150,
    height: 25,
    type: "dog",
    special: "zewnętrzne",
  },
  F: {
    x: 153,
    y: 147,
    width: 45,
    height: 120,
    type: "dog",
    special: "wewnętrzne",
  },
  G: {
    x: 199,
    y: 147,
    width: 45,
    height: 120,
    type: "dog",
    special: "wewnętrzne",
  },
  E: {
    x: 153,
    y: 267,
    width: 45,
    height: 120,
    type: "dog",
    special: "wewnętrzne",
  },
  H: {
    x: 198,
    y: 267,
    width: 45,
    height: 120,
    type: "dog",
    special: "wewnętrzne",
  },
  ZF: {
    x: 284,
    y: 146,
    width: 45,
    height: 180,
    type: "dog",
    special: "wewnętrzne",
  },
  ZG: {
    x: 330,
    y: 146,
    width: 45,
    height: 180,
    type: "dog",
    special: "wewnętrzne",
  },
  B: {
    x: 412,
    y: 150,
    width: 45,
    height: 120,
    type: "dog",
    special: "wewnętrzne",
  },
  C: {
    x: 458,
    y: 149,
    width: 45,
    height: 120,
    type: "dog",
    special: "wewnętrzne",
  },
  A: {
    x: 411,
    y: 269,
    width: 45,
    height: 120,
    type: "dog",
    special: "wewnętrzne",
  },
  D: {
    x: 458,
    y: 269,
    width: 45,
    height: 120,
    type: "dog",
    special: "wewnętrzne",
  },
  ZE: {
    x: 284,
    y: 326,
    width: 45,
    height: 60,
    type: "dog",
    special: "szczeniaki",
  },
  ZH: {
    x: 330,
    y: 326,
    width: 45,
    height: 60,
    type: "dog",
    special: "szczeniaki",
  },
};

const infrastructure = [
  {
    id: "path_1",
    type: "area",
    label: "Wybiegi",
    points: [
      [139, 160],
      [99, 160],
      [-51, 380],
      [139, 380],
      [139, 160],
    ],
    color: "#d4edda",
    strokeColor: "#475569",
  },
  {
    id: "element_2",
    type: "building",
    label: "Wybiegi",
    x: 529,
    y: 188,
    width: 50,
    height: 149,
    color: "#d4edda",
    strokeColor: "#475569",
  },
  {
    id: "element_3",
    type: "building",
    label: "Szpital",
    x: 580,
    y: 239,
    width: 50,
    height: 150,
    color: "#f08f8f",
    strokeColor: "#475569",
  },
];

const DogPhoto = ({ photo, name, size = "normal" }) => {
  const [imgError, setImgError] = useState(false);
  const hasValidPhoto = typeof photo === "string" && photo.trim().length > 5;
  const photoStyle = size === "large" ? styles.dogPhotoLarge : styles.dogPhoto;

  if (!hasValidPhoto || imgError) {
    return (
      <div
        style={{
          ...photoStyle,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: size === "large" ? "6rem" : "4rem",
          marginBottom: size === "large" ? "0" : "1rem",
        }}
      >
        🐕
      </div>
    );
  }

  return (
    <img
      src={photo}
      alt={name}
      style={{ ...photoStyle, marginBottom: size === "large" ? "0" : "1rem" }}
      onError={() => setImgError(true)}
    />
  );
};

const formatLastWalkDate = (dateString) => {
  if (!dateString || dateString === "Brak spacerów" || dateString === "#REF!") {
    return null;
  }

  return String(dateString).trim() || null;
};


const normalizePhotoUrl = (photo) => {
  const value = String(photo || "").trim();
  if (!value) return "";

  const formulaMatch = value.match(/^=IMAGE\("(.+)"\)$/i);
  const fromFormula = formulaMatch ? formulaMatch[1] : value;

  const openMatch = fromFormula.match(/drive\.google\.com\/open\?id=([^&]+)/i);
  if (openMatch) {
    return `https://drive.google.com/uc?export=view&id=${openMatch[1]}`;
  }

  const fileMatch = fromFormula.match(/drive\.google\.com\/file\/d\/([^/]+)/i);
  if (fileMatch) {
    return `https://drive.google.com/uc?export=view&id=${fileMatch[1]}`;
  }

  return fromFormula;
};

const cleanText = (value) => String(value ?? "").replace(/\s+/g, " ").trim();

const parseBoxNumber = (kennelValue) => {
  const match = cleanText(kennelValue).match(/\d+/);
  return match ? Number(match[0]) : 1;
};

const parseDateSafe = (value) => {
  const text = cleanText(value);
  return parseSpreadsheetDate(text);
};

const getLastWalkSortValue = (value) => {
  const parsed = parseDateSafe(value);
  return parsed ? parsed.getTime() : 0;
};

const chooseBetterDogRecord = (currentDog, nextDog) => {
  const currentWalkDate = parseDateSafe(currentDog.lastWalk);
  const nextWalkDate = parseDateSafe(nextDog.lastWalk);

  const hasMoreData =
    Object.values(nextDog).filter((value) => cleanText(value).length > 0).length >
    Object.values(currentDog).filter((value) => cleanText(value).length > 0).length;

  if (nextWalkDate && (!currentWalkDate || nextWalkDate > currentWalkDate)) {
    return { ...currentDog, ...nextDog };
  }

  return hasMoreData ? { ...currentDog, ...nextDog } : currentDog;
};

const MapView = ({
  dogs,
  searchTerm,
  setSearchTerm,
  setSelectedPavilion,
  setCurrentView,
  setSelectedDog,
  hoveredCard,
  setHoveredCard,
  isAdmin,
}) => {
  const getFilteredDogs = () => {
    if (!searchTerm) return dogs;
    return dogs.filter(
      (dog) =>
        dog.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        dog.breed?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        dog.pavilion?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        dog.id?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const countDogsInPavilion = (pavilion) => {
    return dogs.filter((dog) => dog.pavilion === pavilion).length;
  };

  return (
    <div style={styles.pageContainer}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); }}
        input:focus { border-color: #3b82f6 !important; }
        button:active { opacity: 0.7; }
        @media (min-width: 768px) {
          .dog-card-container { display: grid !important; grid-template-columns: 200px 1fr !important; gap: 1.5rem !important; align-items: start !important; }
          .dog-card-photo-wrapper { grid-row: 1 / -1 !important; }
          .dog-card-content { display: flex !important; flex-direction: column !important; }
        }
        @media (max-width: 767px) {
          .dog-card-container { display: flex !important; flex-direction: column !important; }
        }
      `}</style>

      <div style={styles.header}>
        <div style={styles.headerContent}>
          <h1 style={styles.title}>🏠 Mapa Schroniska</h1>
          <p style={styles.subtitle}>Dotknij pawilon aby zobaczyć psy</p>
          <div
            style={{
              marginTop: "0.75rem",
              fontSize: "1rem",
              fontWeight: "600",
              color: "#374151",
            }}
          >
            📊 {dogs.length} psów w schronisku
          </div>
          <div style={styles.searchContainer}>
            <Search style={styles.searchIcon} size={20} />
            <input
              type="text"
              placeholder="Szukaj po imieniu, ID, rasie..."
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
        {searchTerm ? (
          <div>
            <h2
              style={{
                fontSize: "1.25rem",
                fontWeight: "bold",
                color: "#111827",
                marginBottom: "1rem",
              }}
            >
              🔍 Znaleziono: {getFilteredDogs().length}
            </h2>
            {getFilteredDogs().length === 0 ? (
              <div style={styles.card}>
                <p
                  style={{
                    textAlign: "center",
                    padding: "2rem 0",
                    color: "#6b7280",
                  }}
                >
                  Nie znaleziono
                </p>
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr",
                  gap: "1rem",
                }}
              >
                {getFilteredDogs().map((dog) => (
                  <div
                    key={dog.id}
                    onClick={() => {
                      setSelectedDog(dog);
                      setCurrentView("dogCard");
                    }}
                    style={{
                      ...styles.dogCard,
                      ...(hoveredCard === dog.id ? styles.dogCardHover : {}),
                    }}
                    onTouchStart={() => setHoveredCard(dog.id)}
                    onTouchEnd={() => setHoveredCard(null)}
                  >
                    <div className="dog-card-container">
                      <div className="dog-card-photo-wrapper">
                        <DogPhoto
                          photo={dog.photo}
                          name={dog.name}
                          size="normal"
                        />
                      </div>
                      <div className="dog-card-content">
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "start",
                            marginBottom: "0.75rem",
                          }}
                        >
                          <h3
                            style={{
                              fontSize: "1.25rem",
                              fontWeight: "bold",
                              color: "#111827",
                            }}
                          >
                            {dog.name}
                          </h3>
                          <span
                            style={
                              !dog.status ||
                              dog.status.toLowerCase().includes("dostępny")
                                ? styles.badgeGreen
                                : styles.badgeYellow
                            }
                          >
                            {dog.status || "dostępny"}
                          </span>
                        </div>
                        <p
                          style={{
                            fontSize: "0.875rem",
                            color: "#6b7280",
                            marginBottom: "0.5rem",
                          }}
                        >
                          <strong>Rasa:</strong> {dog.breed}
                        </p>
                        <p
                          style={{
                            fontSize: "0.875rem",
                            color: "#9ca3af",
                            marginBottom: "0.5rem",
                          }}
                        >
                          📍 {dog.pavilion} / Boks {dog.box}
                        </p>
                        <p style={{ fontSize: "0.75rem", color: "#d1d5db" }}>
                          ID: {dog.id}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            <div style={styles.card}>
              <h2
                style={{
                  fontSize: "1.125rem",
                  fontWeight: "bold",
                  color: "#111827",
                  marginBottom: "1rem",
                }}
              >
                🗺️ Mapa pawilonów
              </h2>
              <p
                style={{
                  fontSize: "0.875rem",
                  color: "#6b7280",
                  marginBottom: "1rem",
                }}
              >
                Przesuń palcem aby zobaczyć całą mapę →
              </p>
              <div style={styles.mapContainer}>
                <svg
                  viewBox="-100 0 850 600"
                  style={{
                    width: "100%",
                    minWidth: "600px",
                    minHeight: "400px",
                  }}
                >
                  <rect
                    x="-100"
                    y="0"
                    width="850"
                    height="600"
                    fill="#eff6ff"
                  />
                  {infrastructure.map((item) =>
                    item.type === "building" ? (
                      <g key={item.id}>
                        <rect
                          x={item.x}
                          y={item.y}
                          width={item.width}
                          height={item.height}
                          fill={item.color}
                          stroke={item.strokeColor}
                          strokeWidth="2"
                          rx="4"
                          opacity="0.7"
                        />
                        <text
                          x={item.x + item.width / 2}
                          y={item.y + item.height / 2 + 4}
                          textAnchor="middle"
                          fontSize="10"
                          fontWeight="bold"
                          fill="#374151"
                        >
                          {item.label}
                        </text>
                      </g>
                    ) : (
                      <g key={item.id}>
                        <polygon
                          points={item.points.map((p) => p.join(",")).join(" ")}
                          fill={item.color}
                          opacity="0.5"
                          stroke={item.strokeColor}
                          strokeWidth="2"
                        />
                      </g>
                    )
                  )}
                  {Object.entries(pavilionConfig).map(([code, config]) => {
                    const dogCount = countDogsInPavilion(code);
                    let fillColor = "#e2e8f0";
                    if (config.special === "szczeniaki") fillColor = "#fde047";
                    else if (config.special === "wewnętrzne")
                      fillColor = "#93c5fd";
                    else if (config.special === "zewnętrzne")
                      fillColor = "#c084fc";
                    return (
                      <g key={code}>
                        <rect
                          x={config.x}
                          y={config.y}
                          width={config.width}
                          height={config.height}
                          fill={fillColor}
                          stroke="#64748b"
                          strokeWidth="3"
                          rx="4"
                          style={{ cursor: "pointer" }}
                          onClick={() => {
                            setSelectedPavilion(code);
                            setCurrentView("boxes");
                          }}
                          transform={
                            config.rotation
                              ? `rotate(${config.rotation} ${
                                  config.x + config.width / 2
                                } ${config.y + config.height / 2})`
                              : ""
                          }
                        />
                        <text
                          x={config.x + config.width / 2}
                          y={config.y + config.height / 2 + 5}
                          textAnchor="middle"
                          fontSize="14"
                          fontWeight="bold"
                          fill="#1e293b"
                          style={{ pointerEvents: "none" }}
                        >
                          {code}
                        </text>
                        {dogCount > 0 && config.height > 30 && (
                          <text
                            x={config.x + config.width / 2}
                            y={config.y + config.height / 2 + 20}
                            textAnchor="middle"
                            fontSize="10"
                            fill="#475569"
                            style={{ pointerEvents: "none" }}
                          >
                            {dogCount} 🐕
                          </text>
                        )}
                      </g>
                    );
                  })}
                </svg>
              </div>
              <div
                style={{
                  marginTop: "1rem",
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "0.75rem",
                  fontSize: "0.75rem",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <div
                    style={{
                      width: "1rem",
                      height: "1rem",
                      borderRadius: "0.25rem",
                      backgroundColor: "#c084fc",
                    }}
                  ></div>
                  <span>Zewnętrzne</span>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <div
                    style={{
                      width: "1rem",
                      height: "1rem",
                      borderRadius: "0.25rem",
                      backgroundColor: "#93c5fd",
                    }}
                  ></div>
                  <span>Wewnętrzne</span>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <div
                    style={{
                      width: "1rem",
                      height: "1rem",
                      borderRadius: "0.25rem",
                      backgroundColor: "#fde047",
                    }}
                  ></div>
                  <span>Szczeniaki</span>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <div
                    style={{
                      width: "1rem",
                      height: "1rem",
                      borderRadius: "0.25rem",
                      backgroundColor: "#86efac",
                    }}
                  ></div>
                  <span>Wybiegi</span>
                </div>
              </div>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "1rem",
              }}
            >
              <div style={styles.statCard}>
                <div style={{ ...styles.statNumber, color: "#2563eb" }}>
                  {dogs.length}
                </div>
                <div style={styles.statLabel}>Psów</div>
              </div>
              <div style={styles.statCard}>
                <div style={{ ...styles.statNumber, color: "#22c55e" }}>
                  {
                    dogs.filter(
                      (d) =>
                        !d.status || d.status.toLowerCase().includes("dostępny")
                    ).length
                  }
                </div>
                <div style={styles.statLabel}>Dostępnych</div>
              </div>
            </div>
          </>
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
          style={{ ...styles.bottomNavButton, ...styles.bottomNavButtonActive }}
        >
          <MapPin size={24} />
          <span style={{ marginTop: "0.25rem" }}>Mapa</span>
        </button>
        <button
          style={styles.bottomNavButton}
          onClick={() => setCurrentView("myDogs")}
        >
          <Star size={24} />
          <span style={{ marginTop: "0.25rem" }}>Moje psy</span>
        </button>
        {isAdmin && (
          <button
            style={styles.bottomNavButton}
            onClick={() => setCurrentView("panel")}
          >
            <Shield size={24} />
            <span style={{ marginTop: "0.25rem" }}>Panel</span>
          </button>
        )}
      </div>
    </div>
  );
};

const BoxesView = ({
  dogs,
  selectedPavilion,
  setCurrentView,
  setSelectedBox,
  hoveredCard,
  setHoveredCard,
  isAdmin,
}) => {
  const countDogsInPavilion = (pavilion) =>
    dogs.filter((dog) => dog.pavilion === pavilion).length;
  const countDogsInBox = (pavilion, box) =>
    dogs.filter((dog) => dog.pavilion === pavilion && dog.box === box).length;
  const getBoxesForPavilion = (pavilion) => {
    const boxes = [
      ...new Set(
        dogs.filter((dog) => dog.pavilion === pavilion).map((dog) => dog.box)
      ),
    ].sort((a, b) => a - b);
    if (boxes.length === 0) return Array.from({ length: 10 }, (_, i) => i + 1);
    const maxBox = Math.max(...boxes, 10);
    return Array.from({ length: maxBox }, (_, i) => i + 1);
  };
  const boxes = getBoxesForPavilion(selectedPavilion);

  return (
    <div style={styles.pageContainer}>
      <div style={styles.header}>
        <div style={styles.headerContent}>
          <button
            onClick={() => setCurrentView("map")}
            style={styles.backButton}
            onTouchStart={(e) =>
              (e.currentTarget.style.backgroundColor = "#f3f4f6")
            }
            onTouchEnd={(e) =>
              (e.currentTarget.style.backgroundColor = "transparent")
            }
          >
            <ArrowLeft size={24} style={{ marginRight: "0.5rem" }} />
            Powrót
          </button>
          <h1 style={styles.title}>Pawilon {selectedPavilion}</h1>
          <p style={styles.subtitle}>
            Ilość psów: {countDogsInPavilion(selectedPavilion)}
          </p>
        </div>
      </div>
      <div style={styles.content}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: "1rem",
          }}
        >
          {boxes.map((boxNum) => {
            const dogCount = countDogsInBox(selectedPavilion, boxNum);
            const hasDogs = dogCount > 0;
            return (
              <button
                key={boxNum}
                onClick={() => {
                  setSelectedBox(boxNum);
                  setCurrentView("dogs");
                }}
                style={{
                  ...(hasDogs
                    ? { ...styles.boxCard, ...styles.boxCardFull }
                    : { ...styles.boxCard, ...styles.boxCardEmpty }),
                  ...(hoveredCard === `box-${boxNum}`
                    ? {
                        boxShadow: "0 6px 16px rgba(0, 0, 0, 0.15)",
                        transform: "translateY(-2px)",
                      }
                    : {}),
                }}
                onTouchStart={() => setHoveredCard(`box-${boxNum}`)}
                onTouchEnd={() => setHoveredCard(null)}
              >
                <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>
                  {hasDogs ? "🏠" : "📦"}
                </div>
                <div
                  style={{
                    fontWeight: "bold",
                    color: "#111827",
                    fontSize: "1.125rem",
                  }}
                >
                  Boks {boxNum}
                </div>
                {hasDogs && (
                  <div
                    style={{
                      fontSize: "0.875rem",
                      color: "#22c55e",
                      marginTop: "0.5rem",
                      fontWeight: "600",
                    }}
                  >
                    Ilość psów: {dogCount}
                  </div>
                )}
              </button>
            );
          })}
        </div>
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
          style={{ ...styles.bottomNavButton, ...styles.bottomNavButtonActive }}
        >
          <MapPin size={24} />
          <span style={{ marginTop: "0.25rem" }}>Mapa</span>
        </button>
        <button
          style={styles.bottomNavButton}
          onClick={() => setCurrentView("myDogs")}
        >
          <Star size={24} />
          <span style={{ marginTop: "0.25rem" }}>Moje psy</span>
        </button>
        {isAdmin && (
          <button
            style={styles.bottomNavButton}
            onClick={() => setCurrentView("panel")}
          >
            <Shield size={24} />
            <span style={{ marginTop: "0.25rem" }}>Panel</span>
          </button>
        )}
      </div>
    </div>
  );
};

const DogsListView = ({
  dogs,
  selectedPavilion,
  selectedBox,
  setCurrentView,
  setSelectedDog,
  hoveredCard,
  setHoveredCard,
  isAdmin,
}) => {
  const getDogsInBox = (pavilion, box) =>
    dogs.filter((dog) => dog.pavilion === pavilion && dog.box === box);
  const dogsInBox = getDogsInBox(selectedPavilion, selectedBox);

  return (
    <div style={styles.pageContainer}>
      <div style={styles.header}>
        <div style={styles.headerContent}>
          <button
            onClick={() => setCurrentView("boxes")}
            style={styles.backButton}
            onTouchStart={(e) =>
              (e.currentTarget.style.backgroundColor = "#f3f4f6")
            }
            onTouchEnd={(e) =>
              (e.currentTarget.style.backgroundColor = "transparent")
            }
          >
            <ArrowLeft size={24} style={{ marginRight: "0.5rem" }} />
            Powrót
          </button>
          <h1 style={styles.title}>
            {selectedPavilion} / Boks {selectedBox}
          </h1>
          <p style={styles.subtitle}>Ilość psów: {dogsInBox.length}</p>
        </div>
      </div>
      <div style={styles.content}>
        {dogsInBox.length === 0 ? (
          <div style={styles.card}>
            <p
              style={{
                textAlign: "center",
                padding: "3rem 0",
                fontSize: "1.125rem",
                color: "#6b7280",
              }}
            >
              Ten boks jest pusty
            </p>
          </div>
        ) : (
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr", gap: "1rem" }}
          >
            {dogsInBox.map((dog) => (
              <div
                key={dog.id}
                onClick={() => {
                  setSelectedDog(dog);
                  setCurrentView("dogCard");
                }}
                style={{
                  ...styles.dogCard,
                  ...(hoveredCard === dog.id ? styles.dogCardHover : {}),
                }}
                onTouchStart={() => setHoveredCard(dog.id)}
                onTouchEnd={() => setHoveredCard(null)}
              >
                <div className="dog-card-container">
                  <div className="dog-card-photo-wrapper">
                    <DogPhoto photo={dog.photo} name={dog.name} size="normal" />
                  </div>
                  <div className="dog-card-content">
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "start",
                        marginBottom: "0.75rem",
                      }}
                    >
                      <h3
                        style={{
                          fontSize: "1.5rem",
                          fontWeight: "bold",
                          color: "#111827",
                        }}
                      >
                        {dog.name}
                      </h3>
                      <span
                        style={
                          !dog.status ||
                          dog.status.toLowerCase().includes("dostępny")
                            ? styles.badgeGreen
                            : styles.badgeYellow
                        }
                      >
                        {dog.status || "dostępny"}
                      </span>
                    </div>
                    <p
                      style={{
                        color: "#374151",
                        marginBottom: "0.75rem",
                        fontSize: "1rem",
                      }}
                    >
                      <strong>Rasa:</strong> {dog.breed}
                    </p>
                    {dog.age && (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          fontSize: "0.875rem",
                          color: "#6b7280",
                          marginBottom: "0.5rem",
                        }}
                      >
                        <Calendar size={18} style={{ marginRight: "0.5rem" }} />
                        {dog.age}
                      </div>
                    )}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        fontSize: "0.875rem",
                        color: "#9ca3af",
                        marginBottom: "0.5rem",
                      }}
                    >
                      <MapPin size={16} style={{ marginRight: "0.25rem" }} />
                      Boks {dog.box}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        fontSize: "0.75rem",
                        color: "#d1d5db",
                        marginTop: "0.5rem",
                      }}
                    >
                      <Hash size={14} style={{ marginRight: "0.25rem" }} />
                      {dog.id}
                    </div>
                  </div>
                </div>
              </div>
            ))}
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
          style={{ ...styles.bottomNavButton, ...styles.bottomNavButtonActive }}
        >
          <MapPin size={24} />
          <span style={{ marginTop: "0.25rem" }}>Mapa</span>
        </button>
        <button
          style={styles.bottomNavButton}
          onClick={() => setCurrentView("myDogs")}
        >
          <Star size={24} />
          <span style={{ marginTop: "0.25rem" }}>Moje psy</span>
        </button>
        {isAdmin && (
          <button
            style={styles.bottomNavButton}
            onClick={() => setCurrentView("panel")}
          >
            <Shield size={24} />
            <span style={{ marginTop: "0.25rem" }}>Panel</span>
          </button>
        )}
      </div>
    </div>
  );
};

const MyDogsView = ({ myDogs, setCurrentView, setSelectedDog, hoveredCard, setHoveredCard, authEnabled, isAdmin }) => {
  const sortedDogs = [...myDogs].sort(
    (a, b) => getLastWalkSortValue(a.lastWalk) - getLastWalkSortValue(b.lastWalk)
  );

  return (
    <div style={styles.pageContainer}>
      <div style={styles.header}>
        <div style={styles.headerContent}>
          <h1 style={styles.title}>⭐ Moje psy</h1>
          <p style={styles.subtitle}>Przypięte psy: {sortedDogs.length}</p>
        </div>
      </div>
      <div style={styles.content}>
        {sortedDogs.length === 0 ? (
          <div style={styles.card}>
            <p style={{ textAlign: "center", color: "#6b7280" }}>
              {authEnabled
                ? "Nie masz jeszcze przypiętych psów."
                : "Logowanie Firebase nie jest skonfigurowane, więc lista Moje psy jest niedostępna."}
            </p>
          </div>
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
                ...(hoveredCard === `my-${dog.id}` ? styles.dogCardHover : {}),
                marginBottom: "1rem",
              }}
              onTouchStart={() => setHoveredCard(`my-${dog.id}`)}
              onTouchEnd={() => setHoveredCard(null)}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "96px 1fr",
                  gap: "1rem",
                  alignItems: "start",
                }}
              >
                <div>
                  <DogPhoto photo={dog.photo} name={dog.name} size="normal" />
                </div>
                <div>
                  <h3 style={{ fontSize: "1.25rem", fontWeight: "bold", color: "#111827" }}>
                    {dog.name}
                  </h3>
                  <p style={{ color: "#6b7280", marginTop: "0.35rem" }}>{dog.breed}</p>
                  <p style={{ color: "#374151", marginTop: "0.35rem" }}>
                    {dog.pavilion} / Boks {dog.box}
                  </p>
                  <p style={{ color: getLastWalkPresentation(dog.lastWalk).color, marginTop: "0.5rem", fontWeight: 600 }}>
                    Ostatni spacer: {getLastWalkPresentation(dog.lastWalk).label}
                  </p>
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
        <button style={{ ...styles.bottomNavButton, ...styles.bottomNavButtonActive }}>
          <Star size={24} />
          <span style={{ marginTop: "0.25rem" }}>Moje psy</span>
        </button>
      </div>
    </div>
  );
};

const DogCardView = ({
  selectedDog,
  setCurrentView,
  onSurveySaved,
  currentUser,
  favoriteDogIds,
  onToggleFavorite,
  favoriteActionState,
  behaviorystDogIds,
  onToggleBehaviorystDog,
  behaviorystActionState,
  isAdmin,
}) => {
  const [showSurvey, setShowSurvey] = useState(false);
  const [showBehaviorReport, setShowBehaviorReport] = useState(false);

  if (!selectedDog) return null;

  const formattedLastWalk = formatLastWalkDate(selectedDog.lastWalk);
  const isFavorite = favoriteDogIds.has(selectedDog.id);
  const isFavoriteToggleInProgress =
    favoriteActionState?.loading && favoriteActionState?.dogId === selectedDog.id;
  const isBehaviorystOwner =
    String(currentUser?.email || "").toLowerCase() === BEHAVIORYST_ASSIGN_EMAIL;
  const behaviorystIds = behaviorystDogIds instanceof Set ? behaviorystDogIds : new Set();
  const behaviorystState = behaviorystActionState || { loading: false, dogId: "", error: "" };
  const isBehaviorystDog = behaviorystIds.has(selectedDog.id);
  const isBehaviorystToggleInProgress =
    behaviorystState.loading && behaviorystState.dogId === selectedDog.id;

  return (
    <div style={styles.pageContainer}>
      <div style={styles.header}>
        <div style={styles.headerContent}>
          <button
            onClick={() => setCurrentView("dogs")}
            style={styles.backButton}
            onTouchStart={(e) =>
              (e.currentTarget.style.backgroundColor = "#f3f4f6")
            }
            onTouchEnd={(e) =>
              (e.currentTarget.style.backgroundColor = "transparent")
            }
          >
            <ArrowLeft size={24} style={{ marginRight: "0.5rem" }} />
            Powrót
          </button>
        </div>
      </div>
      <div style={styles.content}>
        <div
          style={{
            backgroundColor: "white",
            borderRadius: "1rem",
            overflow: "hidden",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          }}
        >
          <div
            style={{
              background: "linear-gradient(135deg, #2563eb, #1e40af)",
              padding: "1.5rem",
            }}
          >
            <h1
              style={{
                fontSize: "2rem",
                fontWeight: "bold",
                color: "white",
                marginBottom: "0.5rem",
              }}
            >
              {selectedDog.name}
            </h1>
            <p style={{ color: "rgba(255,255,255,0.9)", fontSize: "1rem" }}>
              {selectedDog.breed}
            </p>
          </div>
          <div style={{ padding: "1.5rem", paddingBottom: 0 }}>
            <DogPhoto
              photo={selectedDog.photo}
              name={selectedDog.name}
              size="large"
            />
          </div>
          <div style={{ padding: "1.25rem" }}>
            <button
              onClick={() => onToggleFavorite(selectedDog.id)}
              disabled={!currentUser || isFavoriteToggleInProgress}
              style={{
                ...styles.walkButton,
                backgroundColor: isFavorite ? "#f59e0b" : "#2563eb",
                boxShadow: isFavorite
                  ? "0 2px 4px rgba(245, 158, 11, 0.3)"
                  : "0 2px 4px rgba(37, 99, 235, 0.3)",
                ...((!currentUser || isFavoriteToggleInProgress)
                  ? styles.walkButtonDisabled
                  : {}),
              }}
            >
              <Star size={24} style={{ marginRight: "0.75rem" }} />
              {isFavoriteToggleInProgress
                ? "Zapisywanie..."
                : isFavorite
                ? "Odepnij z Moje psy"
                : "Przypnij do Moje psy"}
            </button>
            {favoriteActionState?.error && (
              <div
                style={{
                  marginBottom: "1rem",
                  padding: "0.75rem",
                  borderRadius: "0.75rem",
                  backgroundColor: "#fee2e2",
                  color: "#991b1b",
                  fontSize: "0.875rem",
                }}
              >
                {favoriteActionState.error}
              </div>
            )}
            {behaviorystState.error && isBehaviorystOwner && (
              <div
                style={{
                  marginBottom: "1rem",
                  padding: "0.75rem",
                  borderRadius: "0.75rem",
                  backgroundColor: "#fee2e2",
                  color: "#991b1b",
                  fontSize: "0.875rem",
                }}
              >
                {behaviorystState.error}
              </div>
            )}
            <button
              onClick={() => setShowSurvey(true)}
              style={styles.walkButton}
            >
              <ExternalLink size={24} style={{ marginRight: "0.75rem" }} />
              Spacer
            </button>
            {formattedLastWalk && (
              <div style={styles.sectionYellow}>
                <h3 style={styles.sectionTitle}>
                  <Clock size={20} style={{ marginRight: "0.5rem" }} />
                  Ostatni spacer
                </h3>
                <p
                  style={{
                    color: "#374151",
                    fontSize: "1.125rem",
                    fontWeight: "600",
                  }}
                >
                  {formattedLastWalk}
                </p>
              </div>
            )}
            <button
              onClick={() => setShowBehaviorReport(true)}
              style={{
                ...styles.walkButton,
                backgroundColor: "#f59e0b",
                boxShadow: "0 2px 4px rgba(245, 158, 11, 0.3)",
              }}
            >
              <ClipboardPlus size={24} style={{ marginRight: "0.75rem" }} />
              Zgłoszenie do pracy behawioralnej
            </button>
            {isBehaviorystOwner && (
              <button
                onClick={() => onToggleBehaviorystDog(selectedDog.id)}
                disabled={!currentUser || isBehaviorystToggleInProgress}
                style={{
                  ...styles.walkButton,
                  backgroundColor: isBehaviorystDog ? "#16a34a" : "#2563eb",
                  boxShadow: isBehaviorystDog
                    ? "0 2px 4px rgba(22, 163, 74, 0.3)"
                    : "0 2px 4px rgba(37, 99, 235, 0.3)",
                  ...((!currentUser || isBehaviorystToggleInProgress)
                    ? styles.walkButtonDisabled
                    : {}),
                }}
              >
                <Star size={24} style={{ marginRight: "0.75rem" }} />
                {isBehaviorystToggleInProgress
                  ? "Zapisywanie..."
                  : isBehaviorystDog
                  ? "Odłącz z panelu behawiorysty"
                  : "Rozpocznij pracę"}
              </button>
            )}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr",
                gap: "0.75rem",
                marginBottom: "1rem",
              }}
            >
              <div style={styles.infoBox}>
                <div style={styles.infoLabel}>📍 Lokalizacja</div>
                <div style={styles.infoValue}>
                  {selectedDog.pavilion} / Boks {selectedDog.box}
                </div>
              </div>
              <div style={styles.infoBox}>
                <div style={styles.infoLabel}>🆔 ID</div>
                <div
                  style={{
                    ...styles.infoValue,
                    fontFamily: "monospace",
                    fontSize: "0.875rem",
                  }}
                >
                  {selectedDog.id}
                </div>
              </div>
              <div style={styles.infoBox}>
                <div style={styles.infoLabel}>📊 Status</div>
                <span
                  style={
                    !selectedDog.status ||
                    selectedDog.status.toLowerCase().includes("dostępny")
                      ? styles.badgeGreen
                      : styles.badgeYellow
                  }
                >
                  {selectedDog.status || "dostępny"}
                </span>
              </div>
              {selectedDog.age && (
                <div style={styles.infoBox}>
                  <div style={styles.infoLabel}>🎂 Wiek</div>
                  <div style={styles.infoValue}>{selectedDog.age}</div>
                </div>
              )}
              {selectedDog.chip && (
                <div style={styles.infoBox}>
                  <div style={styles.infoLabel}>💳 Chip</div>
                  <div
                    style={{
                      ...styles.infoValue,
                      fontFamily: "monospace",
                      fontSize: "0.875rem",
                      wordBreak: "break-all",
                    }}
                  >
                    {selectedDog.chip}
                  </div>
                </div>
              )}
            </div>
            {selectedDog.appearance && (
              <div style={styles.sectionBlue}>
                <h3 style={styles.sectionTitle}>👁️ Wygląd</h3>
                <p style={{ color: "#374151", lineHeight: "1.6" }}>
                  {selectedDog.appearance}
                </p>
              </div>
            )}
            {selectedDog.diet && (
              <div style={styles.sectionGreen}>
                <h3 style={styles.sectionTitle}>🍖 Dieta / Żywienie</h3>
                <p style={{ color: "#374151", lineHeight: "1.6" }}>
                  {selectedDog.diet}
                </p>
              </div>
            )}
            {selectedDog.character && (
              <div style={styles.sectionPurple}>
                <h3 style={styles.sectionTitle}>🐕 Charakter</h3>
                <p style={{ color: "#374151", lineHeight: "1.6" }}>
                  {selectedDog.character}
                </p>
              </div>
            )}
            {selectedDog.warnings && (
              <div style={styles.sectionRed}>
                <h3 style={styles.sectionTitle}>
                  <AlertCircle size={20} style={{ marginRight: "0.5rem" }} />
                  Na co uważać!
                </h3>
                <p style={{ color: "#374151", lineHeight: "1.6" }}>
                  {selectedDog.warnings}
                </p>
              </div>
            )}
            {selectedDog.notes && (
              <div style={styles.sectionGray}>
                <h3 style={styles.sectionTitle}>📝 Uwagi</h3>
                <p style={{ color: "#374151", lineHeight: "1.6" }}>
                  {selectedDog.notes}
                </p>
              </div>
            )}
          </div>
        </div>
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
          style={styles.bottomNavButton}
          onClick={() => setCurrentView("myDogs")}
        >
          <Star size={24} />
          <span style={{ marginTop: "0.25rem" }}>Moje psy</span>
        </button>
        {isAdmin && (
          <button
            style={styles.bottomNavButton}
            onClick={() => setCurrentView("panel")}
          >
            <Shield size={24} />
            <span style={{ marginTop: "0.25rem" }}>Panel</span>
          </button>
        )}
      </div>
      {showSurvey && (
        <WalkSurvey
          dog={selectedDog}
          currentUser={currentUser}
          onClose={() => setShowSurvey(false)}
          onSave={() => {
            setShowSurvey(false);
            onSurveySaved && onSurveySaved(selectedDog.id);
          }}
        />
      )}
      {showBehaviorReport && (
        <BehaviorReport
          dog={selectedDog}
          currentUser={currentUser}
          onClose={() => setShowBehaviorReport(false)}
        />
      )}
    </div>
  );
};

const ShelterMapSystem = () => {
  const [dogs, setDogs] = useState([]);
  const [currentView, setCurrentView] = useState("home");
  const [selectedPavilion, setSelectedPavilion] = useState(null);
  const [selectedBox, setSelectedBox] = useState(null);
  const [selectedDog, setSelectedDog] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [hoveredCard, setHoveredCard] = useState(null);
const [currentUser, setCurrentUser] = useState(null);
const [authReady, setAuthReady] = useState(false);
const [favoriteDogIds, setFavoriteDogIds] = useState(new Set());
const [loginError, setLoginError] = useState("");
const [favoriteActionState, setFavoriteActionState] = useState({
  loading: false,
  dogId: "",
  error: "",
});
const [behaviorystDogIds, setBehaviorystDogIds] = useState(new Set());
const [behaviorystActionState, setBehaviorystActionState] = useState({
  loading: false,
  dogId: "",
  error: "",
});

const isAuthEnabled = hasFirebaseConfig && !firebaseInitError && !!auth;
const isAdminUser = isAdminEmail(currentUser?.email);

useEffect(() => {
  fetchData();
}, []);

useEffect(() => {
  if (!isAuthEnabled) {
    setAuthReady(true);
    setCurrentUser(null);
    setFavoriteDogIds(new Set());
    setBehaviorystDogIds(new Set());
    return undefined;
  }

  const unsub = onAuthStateChanged(auth, async (user) => {
    setCurrentUser(user || null);
    setAuthReady(true);
    setLoginError("");
    if (user) {
      await Promise.all([fetchMyDogs(user), fetchBehaviorystDogs(user)]);
    } else {
      setFavoriteDogIds(new Set());
      setBehaviorystDogIds(new Set());
    }
  });

  return () => unsub();
}, [isAuthEnabled]);
  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/gs?action=getDogs");
      const result = await response.json();

      if (!response.ok || result?.ok !== true || !Array.isArray(result?.data)) {
        throw new Error(result?.error || "Nie udało się pobrać listy psów");
      }

      const dogsData = result.data
        .map((dog) => ({
          pavilion: cleanText(dog?.pavilion),
          box: parseBoxNumber(dog?.kennel),
          name: cleanText(dog?.name),
          id: cleanText(dog?.id),
          age: cleanText(dog?.age),
          chip: cleanText(dog?.chip),
          breed: cleanText(dog?.breed),
          appearance: cleanText(dog?.look),
          diet: cleanText(dog?.diet),
          character: cleanText(dog?.character),
          warnings: cleanText(dog?.caution),
          notes: cleanText(dog?.extra),
          photo: normalizePhotoUrl(dog?.photo),
          lastWalk: cleanText(dog?.lastWalk),
        }))
        .filter((dog) => dog.name && dog.pavilion)
        .reduce((acc, dog) => {
          const uniqueKey = dog.id || `${dog.name}|${dog.pavilion}|${dog.box}`;
          const existing = acc.get(uniqueKey);
          acc.set(uniqueKey, existing ? chooseBetterDogRecord(existing, dog) : dog);
          return acc;
        }, new Map());

      const normalizedDogs = Array.from(dogsData.values());
      setDogs(normalizedDogs);
      return normalizedDogs;
    } catch (error) {
      console.error("Błąd:", error);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const fetchMyDogs = async (user = currentUser) => {
    if (!user) {
      setFavoriteDogIds(new Set());
      return;
    }

    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/gs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: "getMyDogs" }),
      });
      const result = await response.json();
      if (response.ok && result?.ok === true && Array.isArray(result?.data)) {
        setFavoriteDogIds(new Set(result.data.map((dog) => cleanText(dog?.id))));
      }
    } catch (error) {
      console.error("Błąd pobierania Moje psy:", error);
    }
  };


  const fetchBehaviorystDogs = async (user = currentUser) => {
    if (!user) {
      setBehaviorystDogIds(new Set());
      return;
    }

    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/gs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: "getBehaviorystDogs" }),
      });
      const result = await response.json();
      if (response.ok && result?.ok === true && Array.isArray(result?.data)) {
        setBehaviorystDogIds(new Set(result.data.map((dog) => cleanText(dog?.id))));
      }
    } catch (error) {
      console.error("Błąd pobierania psów panelu behawiorysty:", error);
    }
  };

  const handleToggleFavorite = async (dogId) => {
    if (!currentUser || !dogId) return;

    setFavoriteActionState({ loading: true, dogId, error: "" });

    try {
      const token = await currentUser.getIdToken();
      const response = await fetch("/api/gs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: "toggleFavorite", dogId }),
      });
      const result = await response.json();
      if (response.ok && result?.ok === true) {
        await fetchMyDogs(currentUser);
        setFavoriteActionState({ loading: false, dogId: "", error: "" });
        return;
      }

      setFavoriteActionState({
        loading: false,
        dogId: "",
        error: result?.error || "Nie udało się zapisać zmiany w Moje psy.",
      });
    } catch (error) {
      console.error("Błąd przypinania psa:", error);
      setFavoriteActionState({
        loading: false,
        dogId: "",
        error: "Wystąpił błąd połączenia podczas zapisywania. Spróbuj ponownie.",
      });
    }
  };


  const handleToggleBehaviorystDog = async (dogId) => {
    if (!currentUser || !dogId) return false;

    setBehaviorystActionState({ loading: true, dogId, error: "" });

    try {
      const token = await currentUser.getIdToken();
      const response = await fetch("/api/gs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: "toggleBehaviorystDog", dogId }),
      });
      const result = await response.json();
      if (response.ok && result?.ok === true) {
        await fetchBehaviorystDogs(currentUser);
        setBehaviorystActionState({ loading: false, dogId: "", error: "" });
        return true;
      }

      setBehaviorystActionState({
        loading: false,
        dogId: "",
        error: result?.error || "Nie udało się zapisać zmiany w panelu behawiorysty.",
      });
      return false;
    } catch (error) {
      console.error("Błąd przypisywania psa do panelu behawiorysty:", error);
      setBehaviorystActionState({
        loading: false,
        dogId: "",
        error: "Wystąpił błąd połączenia podczas zapisywania. Spróbuj ponownie.",
      });
      return false;
    }
  };

  const handleStartBehaviorystWork = async (dogId) => {
    if (!dogId) return false;
    if (behaviorystDogIds.has(dogId)) return true;
    return handleToggleBehaviorystDog(dogId);
  };

const handleLogin = async () => {
  if (!isAuthEnabled) return;

  setLoginError("");

  try {
    await signInWithPopup(auth, googleProvider);
  } catch (error) {
    console.error("Błąd logowania Google:", error);

    if (error?.code === "auth/configuration-not-found") {
      setLoginError(
        "Firebase Auth nie jest poprawnie skonfigurowany dla tego projektu (CONFIGURATION_NOT_FOUND). Włącz metodę Google w Firebase Console → Authentication → Sign-in method oraz sprawdź czy używasz właściwego klucza API/projektu."
      );
      return;
    }

    if (error?.code === "auth/unauthorized-domain") {
      setLoginError(
        "Ta domena nie jest dozwolona w Firebase Auth. Dodaj domenę aplikacji w Firebase Console → Authentication → Settings → Authorized domains."
      );
      return;
    }

    setLoginError("Nie udało się zalogować przez Google. Spróbuj ponownie za chwilę.");
  }
};

  const handleLogout = async () => {
    if (!isAuthEnabled) return;

    try {
      await signOut(auth);
    } catch (error) {
      console.error("Błąd wylogowania:", error);
    }
  };

  const handleDogClickFromDashboard = (dog) => {
    setSelectedDog(dog);
    setCurrentView("dogCard");
  };

  const handleSurveySaved = async (dogId) => {
    const refreshedDogs = await fetchData();
    setSelectedDog((previousDog) => {
      if (!previousDog) return previousDog;
      return refreshedDogs.find((dog) => dog.id === dogId) || previousDog;
    });
  };

  if (isAuthEnabled && !authReady) {
    return (
      <div style={styles.loadingContainer}>
        <div style={{ textAlign: "center" }}>
          <div style={styles.spinner}></div>
          <p style={{ marginTop: "1rem", fontSize: "1.125rem", color: "#374151" }}>
            Sprawdzanie sesji...
          </p>
        </div>
      </div>
    );
  }

  if (isAuthEnabled && !currentUser) {
    return (
      <div style={styles.loadingContainer}>
        <div style={{ ...styles.card, maxWidth: "420px", textAlign: "center", margin: "1rem" }}>
          <h1 style={{ fontSize: "1.5rem", marginBottom: "0.75rem" }}>🔐 Logowanie wolontariusza</h1>
          <p style={{ color: "#6b7280", marginBottom: "1rem" }}>
            Zaloguj się kontem Google, aby korzystać z ankiet i zakładki Moje psy.
          </p>
          {loginError && (
            <div
              style={{
                marginBottom: "1rem",
                padding: "0.75rem",
                borderRadius: "0.75rem",
                backgroundColor: "#fee2e2",
                color: "#991b1b",
                fontSize: "0.875rem",
                textAlign: "left",
              }}
            >
              {loginError}
            </div>
          )}
          <button onClick={handleLogin} style={{ ...styles.walkButton, marginBottom: 0 }}>
            Zaloguj przez Google
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); }}`}</style>
        <div style={{ textAlign: "center" }}>
          <div style={styles.spinner}></div>
          <p
            style={{
              marginTop: "1rem",
              fontSize: "1.125rem",
              color: "#374151",
            }}
          >
            Ładowanie...
          </p>
        </div>
      </div>
    );
  }

  const myDogs = dogs.filter((dog) => favoriteDogIds.has(dog.id));
  const behaviorystDogs = dogs.filter((dog) => behaviorystDogIds.has(dog.id));

  return (
    <>
      {isAuthEnabled && currentUser && (
        <div style={{ position: "fixed", top: 8, right: 8, zIndex: 200 }}>
          <button
            onClick={handleLogout}
            style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: "9999px", padding: "0.5rem 0.75rem", display: "flex", alignItems: "center", gap: "0.35rem", cursor: "pointer" }}
          >
            <LogOut size={16} /> Wyloguj
          </button>
        </div>
      )}
      {!isAuthEnabled && (
        <div style={{ padding: "0.75rem 1rem", backgroundColor: "#fff7ed", color: "#9a3412", borderBottom: "1px solid #fdba74" }}>
          ⚠️ Firebase nie jest skonfigurowany (REACT_APP_FIREBASE_*). Logowanie Google oraz "Moje psy" będą nieaktywne.
        </div>
      )}
      {currentView === "home" && (
        <HomeView
          dogs={dogs}
          onDogClick={handleDogClickFromDashboard}
          hoveredCard={hoveredCard}
          setHoveredCard={setHoveredCard}
          setCurrentView={setCurrentView}
          isAdmin={isAdminUser}
        />
      )}
      {currentView === "map" && (
        <MapView
          dogs={dogs}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          setSelectedPavilion={setSelectedPavilion}
          setCurrentView={setCurrentView}
          setSelectedDog={setSelectedDog}
          hoveredCard={hoveredCard}
          setHoveredCard={setHoveredCard}
          isAdmin={isAdminUser}
        />
      )}
      {currentView === "boxes" && (
        <BoxesView
          dogs={dogs}
          selectedPavilion={selectedPavilion}
          setCurrentView={setCurrentView}
          setSelectedBox={setSelectedBox}
          hoveredCard={hoveredCard}
          setHoveredCard={setHoveredCard}
          isAdmin={isAdminUser}
        />
      )}
      {currentView === "dogs" && (
        <DogsListView
          dogs={dogs}
          selectedPavilion={selectedPavilion}
          selectedBox={selectedBox}
          setCurrentView={setCurrentView}
          setSelectedDog={setSelectedDog}
          hoveredCard={hoveredCard}
          setHoveredCard={setHoveredCard}
          isAdmin={isAdminUser}
        />
      )}
      {currentView === "dogCard" && (
        <DogCardView
          selectedDog={selectedDog}
          setCurrentView={setCurrentView}
          onSurveySaved={handleSurveySaved}
          currentUser={currentUser}
          favoriteDogIds={favoriteDogIds}
          onToggleFavorite={handleToggleFavorite}
          favoriteActionState={favoriteActionState}
          behaviorystDogIds={behaviorystDogIds}
          onToggleBehaviorystDog={handleToggleBehaviorystDog}
          behaviorystActionState={behaviorystActionState}
          isAdmin={isAdminUser}
        />
      )}
      {currentView === "myDogs" && (
        <MyDogsView
          myDogs={myDogs}
          setCurrentView={setCurrentView}
          setSelectedDog={setSelectedDog}
          hoveredCard={hoveredCard}
          setHoveredCard={setHoveredCard}
          authEnabled={isAuthEnabled}
          isAdmin={isAdminUser}
        />
      )}
      {currentView === "panel" && isAdminUser && (
        <AdminPanelView
          currentUser={currentUser}
          behaviorystDogs={behaviorystDogs}
          dogs={dogs}
          setCurrentView={setCurrentView}
          setSelectedDog={setSelectedDog}
          hoveredCard={hoveredCard}
          setHoveredCard={setHoveredCard}
          onStartWork={handleStartBehaviorystWork}
        />
      )}
    </>
  );
};

export default ShelterMapSystem;
