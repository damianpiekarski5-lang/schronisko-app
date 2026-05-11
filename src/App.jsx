import React, { useState, useEffect, useRef, useCallback } from "react";
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
  CheckCircle,
  Clock,
  Star,
  LogOut,
  Shield,
  Users,
} from "lucide-react";
import BehaviorReport from "./BehaviorReport";
import HomeView from "./HomeView";
import AdminPanelView from "./AdminPanelView";
import MapEditor from "./MapEditor";
import InstallPrompt from "./InstallPrompt";
import { RoleProvider, useUserRole } from "./hooks/useUserRole";
import useMedicalFlags from "./hooks/useMedicalFlags";
import { canSetMedicalFlags, canMoveDog } from "./lib/roles";
import { parseSpreadsheetDate, getLastWalkPresentation } from "./utils/dateTime";
import {
  auth,
  googleProvider,
  hasFirebaseConfig,
  firebaseInitError,
} from "./firebase";
import {
  onAuthStateChanged,
  signInWithRedirect,
  signInWithPopup,
  signOut,
  getRedirectResult,
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
          marginBottom: size === "large" ? "0" : "1rem",
          backgroundColor: "#f3f4f6",
        }}
      >
        <img
          src="/icon-192.png"
          alt="pies"
          style={{ width: size === "large" ? "50%" : "60%", opacity: 0.25 }}
        />
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
  setDogCardFrom,
  hoveredCard,
  setHoveredCard,
  isAdmin,
}) => {
  const { isAdmin: isAdminRole, loading: roleLoading } = useUserRole();
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
                      setDogCardFrom("map");
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
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <h2 style={{ fontSize: "1.125rem", fontWeight: "bold", color: "#111827", margin: 0 }}>
                  🗺️ Mapa pawilonów
                </h2>
                {!roleLoading && isAdminRole && (
                  <button
                    onClick={() => setCurrentView("mapEditor")}
                    style={{ padding: "0.4rem 0.75rem", backgroundColor: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe", borderRadius: "0.5rem", cursor: "pointer", fontSize: "0.8rem", fontWeight: "600" }}
                  >
                    ✏️ Edytuj mapę
                  </button>
                )}
              </div>
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
  setDogCardFrom,
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
                  setDogCardFrom("map");
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

const MyDogsView = ({ myDogs, setCurrentView, setSelectedDog, setDogCardFrom, hoveredCard, setHoveredCard, authEnabled, isAdmin }) => {
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
                setDogCardFrom("myDogs");
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

function formatFlagTime(date) {
  if (!date) return "odwołania";
  return date.toLocaleString("pl-PL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function toDatetimeLocal(date) {
  if (!date) return "";
  const d = new Date(date);
  d.setSeconds(0, 0);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

const MedicalAlert = ({ icon, title, flag }) => (
  <div style={{ backgroundColor: "#DC2626", color: "white", padding: "12px 14px", borderRadius: "8px", marginBottom: "8px" }}>
    <p style={{ fontWeight: "bold", fontSize: "18px", margin: 0 }}>{icon} {title}</p>
    {flag.note && <p style={{ margin: "4px 0 0", fontSize: "14px" }}>{flag.note}</p>}
    <p style={{ margin: "4px 0 0", fontSize: "13px", opacity: 0.9 }}>
      Ustawione przez: {flag.createdBy}
    </p>
    <p style={{ margin: "2px 0 0", fontSize: "13px", opacity: 0.9 }}>
      od {flag.validFrom ? formatFlagTime(flag.validFrom) : "—"}{" "}do {formatFlagTime(flag.validUntil)}
    </p>
  </div>
);

const flagInputStyle = {
  width: "100%", padding: "8px 10px", border: "1px solid #d1d5db",
  borderRadius: "6px", fontSize: "14px", boxSizing: "border-box",
};

const FlagBlock = ({ title, flagType, currentFlag, form, setFlagForm, saving, msg, onSave, onDeactivate }) => {
  const updateForm = (patch) =>
    setFlagForm((s) => ({ ...s, [flagType]: { ...s[flagType], ...patch } }));

  const hasFlag = currentFlag.active || currentFlag.pending;

  return (
    <div style={{ border: "1px solid #fca5a5", borderRadius: "8px", padding: "14px", marginBottom: "12px", backgroundColor: "#fff5f5" }}>
      <p style={{ fontWeight: 700, fontSize: "15px", margin: "0 0 10px", color: "#991b1b" }}>{title}</p>
      {currentFlag.active && (
        <p style={{ fontSize: "13px", color: "#dc2626", marginBottom: "8px", fontWeight: 600 }}>
          ⚠ Aktywny — {currentFlag.note || "brak opisu"} | od: {formatFlagTime(currentFlag.validFrom)} | do: {formatFlagTime(currentFlag.validUntil)}
        </p>
      )}
      {currentFlag.pending && (
        <p style={{ fontSize: "13px", color: "#b45309", marginBottom: "8px", fontWeight: 600 }}>
          🕐 Zaplanowano — od: {formatFlagTime(currentFlag.validFrom)} | do: {formatFlagTime(currentFlag.validUntil)}
        </p>
      )}
      <label style={{ fontSize: "13px", color: "#374151", display: "block", marginBottom: "4px" }}>Powód (opcjonalnie)</label>
      <input
        type="text"
        value={form.note}
        onChange={(e) => updateForm({ note: e.target.value })}
        placeholder="np. zabieg, dieta specjalna..."
        style={{ ...flagInputStyle, marginBottom: "10px" }}
      />
      <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: "13px", color: "#374151", display: "block", marginBottom: "4px" }}>Od (puste = teraz)</label>
          <input
            type="datetime-local"
            value={form.validFrom}
            onChange={(e) => updateForm({ validFrom: e.target.value })}
            style={flagInputStyle}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: "13px", color: "#374151", display: "block", marginBottom: "4px" }}>Do (puste = bezterminowo)</label>
          <input
            type="datetime-local"
            value={form.validUntil}
            onChange={(e) => updateForm({ validUntil: e.target.value })}
            style={flagInputStyle}
          />
        </div>
      </div>
      <div style={{ display: "flex", gap: "8px", marginTop: "6px" }}>
        <button
          onClick={() => onSave(flagType)}
          disabled={saving}
          style={{ flex: 1, padding: "8px", backgroundColor: saving ? "#9ca3af" : "#dc2626", color: "white", border: "none", borderRadius: "6px", fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", fontSize: "14px" }}
        >
          {saving ? "Zapisywanie..." : "Zapisz"}
        </button>
        {hasFlag && (
          <button
            onClick={() => onDeactivate(flagType)}
            disabled={saving}
            style={{ flex: 1, padding: "8px", backgroundColor: saving ? "#9ca3af" : "#6b7280", color: "white", border: "none", borderRadius: "6px", fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", fontSize: "14px" }}
          >
            Odwołaj
          </button>
        )}
      </div>
      {msg && (
        <p style={{ marginTop: "6px", fontSize: "13px", color: msg.type === "success" ? "#166534" : "#991b1b", fontWeight: 600 }}>
          {msg.type === "success" ? "✅ " : "❌ "}{msg.text}
        </p>
      )}
    </div>
  );
};

const AmbulatoriumPanel = ({ noFood, walkBlocked, flagForm, setFlagForm, savingFlag, flagMsg, onSave, onDeactivate }) => (
  <div style={{ marginTop: "16px", border: "2px solid #fca5a5", borderRadius: "10px", padding: "16px", backgroundColor: "#fef2f2" }}>
    <h3 style={{ margin: "0 0 12px", fontSize: "16px", fontWeight: 700, color: "#7f1d1d" }}>🏥 Ambulatorium</h3>
    <FlagBlock
      title="Nie karmić"
      flagType="no_food"
      currentFlag={noFood}
      form={flagForm.no_food}
      setFlagForm={setFlagForm}
      saving={savingFlag.no_food}
      msg={flagMsg.no_food}
      onSave={onSave}
      onDeactivate={onDeactivate}
    />
    <FlagBlock
      title="Zakaz spaceru"
      flagType="walk_blocked"
      currentFlag={walkBlocked}
      form={flagForm.walk_blocked}
      setFlagForm={setFlagForm}
      saving={savingFlag.walk_blocked}
      msg={flagMsg.walk_blocked}
      onSave={onSave}
      onDeactivate={onDeactivate}
    />
  </div>
);

const DogCardView = ({
  selectedDog,
  setCurrentView,
  dogCardFrom,
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
  const [showBehaviorReport, setShowBehaviorReport] = useState(false);
  const [savingWalk, setSavingWalk] = useState(false);
  const [walkMessage, setWalkMessage] = useState(null);
  const [opiekunowie, setOpiekunowie] = useState([]);
  const [togglingOpiekun, setTogglingOpiekun] = useState(false);

  const { role } = useUserRole();
  const { noFood, walkBlocked, refresh: refreshFlags } = useMedicalFlags(selectedDog?.id);

  const initFlagForm = { note: "", validFrom: "", validUntil: "" };
  const [flagForm, setFlagForm] = useState({ no_food: initFlagForm, walk_blocked: initFlagForm });
  const [savingFlag, setSavingFlag] = useState({ no_food: false, walk_blocked: false });
  const [flagMsg, setFlagMsg] = useState({ no_food: null, walk_blocked: null });

  const [editingLocation, setEditingLocation] = useState(false);
  const [locationForm, setLocationForm] = useState({ pavilion: "", box: "" });
  const [savingLocation, setSavingLocation] = useState(false);
  const [locationMsg, setLocationMsg] = useState(null);

  const handleSetFlag = async (flagType) => {
    if (!currentUser) return;
    setSavingFlag((s) => ({ ...s, [flagType]: true }));
    setFlagMsg((s) => ({ ...s, [flagType]: null }));
    try {
      const token = await currentUser.getIdToken();
      const form = flagForm[flagType];
      const res = await fetch("/api/gs", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          action: "setMedicalFlag",
          dogId: selectedDog.id,
          flagType,
          note: form.note,
          validFrom: form.validFrom ? new Date(form.validFrom).toISOString() : null,
          validUntil: form.validUntil ? new Date(form.validUntil).toISOString() : null,
          createdBy: currentUser.displayName || currentUser.email,
        }),
      });
      const result = await res.json();
      if (result?.ok) {
        setFlagMsg((s) => ({ ...s, [flagType]: { type: "success", text: "Zapisano" } }));
        refreshFlags();
      } else {
        setFlagMsg((s) => ({ ...s, [flagType]: { type: "error", text: result?.error || "Błąd zapisu" } }));
      }
    } catch {
      setFlagMsg((s) => ({ ...s, [flagType]: { type: "error", text: "Błąd połączenia" } }));
    } finally {
      setSavingFlag((s) => ({ ...s, [flagType]: false }));
    }
  };

  const handleDeactivateFlag = async (flagType) => {
    if (!currentUser) return;
    setSavingFlag((s) => ({ ...s, [flagType]: true }));
    setFlagMsg((s) => ({ ...s, [flagType]: null }));
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch("/api/gs", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "deactivateMedicalFlag", dogId: selectedDog.id, flagType }),
      });
      const result = await res.json();
      if (result?.ok) {
        setFlagMsg((s) => ({ ...s, [flagType]: { type: "success", text: "Odwołano" } }));
        refreshFlags();
      } else {
        setFlagMsg((s) => ({ ...s, [flagType]: { type: "error", text: result?.error || "Błąd" } }));
      }
    } catch {
      setFlagMsg((s) => ({ ...s, [flagType]: { type: "error", text: "Błąd połączenia" } }));
    } finally {
      setSavingFlag((s) => ({ ...s, [flagType]: false }));
    }
  };

  const handleUpdateLocation = async () => {
    if (!currentUser || savingLocation) return;
    setSavingLocation(true);
    setLocationMsg(null);
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch("/api/gs", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          action: "updateDogLocation",
          dogId: selectedDog.id,
          pavilion: locationForm.pavilion,
          box: locationForm.box,
        }),
      });
      const result = await res.json();
      if (result?.ok) {
        setLocationMsg({ type: "success", text: "Zapisano lokalizację" });
        setEditingLocation(false);
        onSurveySaved?.(selectedDog.id);
        setTimeout(() => setLocationMsg(null), 4000);
      } else {
        setLocationMsg({ type: "error", text: result?.error || "Błąd zapisu" });
      }
    } catch {
      setLocationMsg({ type: "error", text: "Błąd połączenia" });
    } finally {
      setSavingLocation(false);
    }
  };

  useEffect(() => {
    if (!selectedDog?.id) return;
    fetch(`/api/gs?action=getOpiekunowie&dogId=${encodeURIComponent(selectedDog.id)}`)
      .then((r) => r.json())
      .then((result) => {
        if (result?.ok && Array.isArray(result?.data)) setOpiekunowie(result.data);
      })
      .catch(() => {});
  }, [selectedDog?.id]);

  const handleSaveWalk = async () => {
    if (!currentUser || savingWalk) return;
    setSavingWalk(true);
    setWalkMessage(null);
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch("/api/gs", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "recordWalk", dogId: selectedDog.id, dogName: selectedDog.name, notes: "" }),
      });
      const result = await response.json();
      if (result?.ok) {
        const volunteerName = currentUser.displayName || currentUser.email || "Wolontariusz";
        setWalkMessage({ type: "success", text: `✅ Spacer zapisany przez ${volunteerName}!` });
        onSurveySaved?.(selectedDog.id);
        setTimeout(() => setWalkMessage(null), 5000);
      } else {
        setWalkMessage({ type: "error", text: "❌ " + (result?.error || "Błąd zapisu spaceru") });
      }
    } catch {
      setWalkMessage({ type: "error", text: "❌ Błąd połączenia" });
    } finally {
      setSavingWalk(false);
    }
  };

  const handleToggleOpiekun = async () => {
    if (!currentUser || togglingOpiekun) return;
    setTogglingOpiekun(true);
    try {
      const token = await currentUser.getIdToken();
      await fetch("/api/gs", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "toggleOpiekun", dogId: selectedDog.id }),
      });
      const r2 = await fetch(`/api/gs?action=getOpiekunowie&dogId=${encodeURIComponent(selectedDog.id)}`);
      const r2json = await r2.json();
      if (r2json?.ok && Array.isArray(r2json?.data)) setOpiekunowie(r2json.data);
    } catch {
    } finally {
      setTogglingOpiekun(false);
    }
  };

  const isOpiekun = opiekunowie.some((o) => o.uid === currentUser?.uid);

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
            onClick={() => setCurrentView(dogCardFrom || "home")}
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
            {opiekunowie.length > 0 && (
              <p style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.875rem", marginTop: "0.5rem" }}>
                👤 {opiekunowie.map((o) => o.displayName || o.email).join(" · ")}
              </p>
            )}
          </div>
          {(noFood.active || walkBlocked.active) && (
            <div style={{ padding: "1rem 1.5rem 0" }}>
              {noFood.active && (
                <MedicalAlert
                  icon="🔴"
                  title="NIE KARMIĆ"
                  flag={noFood}
                />
              )}
              {walkBlocked.active && (
                <MedicalAlert
                  icon="🚫"
                  title="ZAKAZ SPACERU"
                  flag={walkBlocked}
                />
              )}
            </div>
          )}
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
              onClick={handleSaveWalk}
              disabled={!currentUser || savingWalk || walkBlocked.active}
              style={{
                ...styles.walkButton,
                ...(!currentUser || savingWalk || walkBlocked.active ? styles.walkButtonDisabled : {}),
              }}
            >
              <CheckCircle size={24} style={{ marginRight: "0.75rem" }} />
              {savingWalk ? "Zapisywanie..." : "Wychodzę z psem 🦮"}
            </button>
            {walkBlocked.active && (
              <p style={{ color: "#dc2626", fontSize: "0.8rem", marginBottom: "0.5rem", fontWeight: 600 }}>
                Pies zablokowany przez ambulatorium
                {walkBlocked.validUntil
                  ? ` do ${walkBlocked.validUntil.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })}`
                  : " do odwołania"}
              </p>
            )}
            {walkMessage && (
              <div
                style={{
                  marginBottom: "1rem",
                  padding: "0.75rem",
                  borderRadius: "0.75rem",
                  backgroundColor: walkMessage.type === "success" ? "#dcfce7" : "#fee2e2",
                  color: walkMessage.type === "success" ? "#166534" : "#991b1b",
                  fontSize: "0.875rem",
                  fontWeight: "600",
                }}
              >
                {walkMessage.text}
              </div>
            )}
            {formattedLastWalk && (
              <div style={styles.sectionYellow}>
                <h3 style={styles.sectionTitle}>
                  <Clock size={20} style={{ marginRight: "0.5rem" }} />
                  Ostatni spacer
                </h3>
                <p style={{ color: "#374151", fontSize: "1.125rem", fontWeight: "600" }}>
                  {formattedLastWalk}
                </p>
                {selectedDog.lastVolunteer && (
                  <p style={{ color: "#6b7280", fontSize: "0.875rem", marginTop: "0.25rem" }}>
                    👤 {selectedDog.lastVolunteer}
                  </p>
                )}
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
            <button
              onClick={handleToggleOpiekun}
              disabled={!currentUser || togglingOpiekun}
              style={{
                ...styles.walkButton,
                backgroundColor: isOpiekun ? "#16a34a" : "#6b7280",
                boxShadow: isOpiekun
                  ? "0 2px 4px rgba(22,163,74,0.3)"
                  : "0 2px 4px rgba(107,114,128,0.3)",
                ...(!currentUser || togglingOpiekun ? styles.walkButtonDisabled : {}),
              }}
            >
              <Users size={24} style={{ marginRight: "0.75rem" }} />
              {togglingOpiekun
                ? "Zapisywanie..."
                : isOpiekun
                ? "Jesteś opiekunem psa ✓"
                : "Zostań opiekunem psa"}
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
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={styles.infoLabel}>📍 Lokalizacja</div>
                  {canMoveDog(role) && !editingLocation && (
                    <button
                      onClick={() => {
                        setLocationForm({ pavilion: selectedDog.pavilion || "", box: selectedDog.box || "" });
                        setLocationMsg(null);
                        setEditingLocation(true);
                      }}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "#2563eb", fontSize: "0.8rem", padding: "2px 6px" }}
                    >
                      ✏️ Zmień
                    </button>
                  )}
                </div>
                {editingLocation ? (
                  <div style={{ marginTop: "0.5rem" }}>
                    <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
                      <select
                        value={locationForm.pavilion}
                        onChange={(e) => setLocationForm((f) => ({ ...f, pavilion: e.target.value }))}
                        style={{ flex: 1, padding: "0.4rem 0.5rem", borderRadius: "0.5rem", border: "1px solid #d1d5db", fontSize: "0.9rem" }}
                      >
                        <option value="">— Pawilon —</option>
                        {Object.keys(pavilionConfig).sort().map((k) => (
                          <option key={k} value={k}>{k}</option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={locationForm.box}
                        onChange={(e) => setLocationForm((f) => ({ ...f, box: e.target.value }))}
                        placeholder="Boks"
                        style={{ width: "5rem", padding: "0.4rem 0.5rem", borderRadius: "0.5rem", border: "1px solid #d1d5db", fontSize: "0.9rem" }}
                      />
                    </div>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <button
                        onClick={handleUpdateLocation}
                        disabled={savingLocation || !locationForm.pavilion || !locationForm.box}
                        style={{ flex: 1, padding: "0.5rem", borderRadius: "0.5rem", border: "none", backgroundColor: "#2563eb", color: "white", fontWeight: 600, cursor: "pointer", fontSize: "0.875rem", opacity: (savingLocation || !locationForm.pavilion || !locationForm.box) ? 0.6 : 1 }}
                      >
                        {savingLocation ? "Zapisywanie..." : "Zapisz"}
                      </button>
                      <button
                        onClick={() => { setEditingLocation(false); setLocationMsg(null); }}
                        style={{ flex: 1, padding: "0.5rem", borderRadius: "0.5rem", border: "1px solid #d1d5db", backgroundColor: "white", color: "#374151", fontWeight: 600, cursor: "pointer", fontSize: "0.875rem" }}
                      >
                        Anuluj
                      </button>
                    </div>
                    {locationMsg && (
                      <p style={{ marginTop: "0.4rem", fontSize: "0.8rem", color: locationMsg.type === "success" ? "#166534" : "#991b1b", fontWeight: 600 }}>
                        {locationMsg.type === "success" ? "✅ " : "❌ "}{locationMsg.text}
                      </p>
                    )}
                  </div>
                ) : (
                  <div style={styles.infoValue}>
                    {selectedDog.pavilion} / Boks {selectedDog.box}
                  </div>
                )}
                {!editingLocation && locationMsg && (
                  <p style={{ marginTop: "0.4rem", fontSize: "0.8rem", color: locationMsg.type === "success" ? "#166534" : "#991b1b", fontWeight: 600 }}>
                    {locationMsg.type === "success" ? "✅ " : "❌ "}{locationMsg.text}
                  </p>
                )}
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
              {selectedDog.weight && (
                <div style={styles.infoBox}>
                  <div style={styles.infoLabel}>⚖️ Waga</div>
                  <div style={styles.infoValue}>{selectedDog.weight}</div>
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
            {canSetMedicalFlags(role) && (
              <AmbulatoriumPanel
                noFood={noFood}
                walkBlocked={walkBlocked}
                flagForm={flagForm}
                setFlagForm={setFlagForm}
                savingFlag={savingFlag}
                flagMsg={flagMsg}
                onSave={handleSetFlag}
                onDeactivate={handleDeactivateFlag}
              />
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
  const [dogCardFrom, setDogCardFrom] = useState("home");
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

const navRef = useRef({ currentView: "home", dogCardFrom: "home" });
useEffect(() => {
  navRef.current = { currentView, dogCardFrom };
}, [currentView, dogCardFrom]);

useEffect(() => {
  history.pushState(null, "", window.location.href);
  const handlePopState = () => {
    const { currentView: view, dogCardFrom: from } = navRef.current;
    if (view === "dogCard") {
      setCurrentView(from || "home");
    } else if (view === "dogs") {
      setCurrentView("boxes");
    } else if (view === "boxes") {
      setCurrentView("map");
    } else if (["map", "myDogs", "mapEditor"].includes(view)) {
      setCurrentView("home");
    } else if (view === "panel") {
      setCurrentView("home");
    }
    history.pushState(null, "", window.location.href);
  };
  window.addEventListener("popstate", handlePopState);
  return () => window.removeEventListener("popstate", handlePopState);
}, []);

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

  getRedirectResult(auth).catch((error) => {
    if (error?.code === "auth/unauthorized-domain") {
      setLoginError(
        "Ta domena nie jest dozwolona w Firebase Auth. Dodaj domenę aplikacji w Firebase Console → Authentication → Settings → Authorized domains."
      );
    } else if (error?.code && error.code !== "auth/null-user") {
      setLoginError(
        "Nie udało się zalogować przez Google: " + (error.message || error.code)
      );
    }
  });

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
          lastVolunteer: cleanText(dog?.lastVolunteer),
          weight: cleanText(dog?.weight),
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

    const wasFavorite = favoriteDogIds.has(dogId);
    setFavoriteDogIds((prev) => {
      const next = new Set(prev);
      if (wasFavorite) next.delete(dogId);
      else next.add(dogId);
      return next;
    });

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

      setFavoriteDogIds((prev) => {
        const next = new Set(prev);
        if (wasFavorite) next.add(dogId);
        else next.delete(dogId);
        return next;
      });
      setFavoriteActionState({
        loading: false,
        dogId: "",
        error: result?.error || "Nie udało się zapisać zmiany w Moje psy.",
      });
    } catch (error) {
      console.error("Błąd przypinania psa:", error);
      setFavoriteDogIds((prev) => {
        const next = new Set(prev);
        if (wasFavorite) next.add(dogId);
        else next.delete(dogId);
        return next;
      });
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

    if (
      error?.code === "auth/popup-blocked" ||
      error?.code === "auth/popup-closed-by-user" ||
      error?.code === "auth/cancelled-popup-request"
    ) {
      try {
        await signInWithRedirect(auth, googleProvider);
        return;
      } catch (redirectError) {
        console.error("Błąd logowania Google przez przekierowanie:", redirectError);
      }
    }

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

    setLoginError(
      "Nie udało się zalogować przez Google. Jeśli jesteś na laptopie, sprawdź czy przeglądarka nie blokuje popupów i spróbuj ponownie."
    );
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
    setDogCardFrom("home");
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
    <RoleProvider currentUser={currentUser}>
      <InstallPrompt />
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
          setDogCardFrom={setDogCardFrom}
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
          setDogCardFrom={setDogCardFrom}
          hoveredCard={hoveredCard}
          setHoveredCard={setHoveredCard}
          isAdmin={isAdminUser}
        />
      )}
      {currentView === "dogCard" && (
        <DogCardView
          selectedDog={selectedDog}
          setCurrentView={setCurrentView}
          dogCardFrom={dogCardFrom}
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
          setDogCardFrom={setDogCardFrom}
          hoveredCard={hoveredCard}
          setHoveredCard={setHoveredCard}
          authEnabled={isAuthEnabled}
          isAdmin={isAdminUser}
        />
      )}
      {currentView === "mapEditor" && (
        <MapEditor onBack={() => setCurrentView("map")} />
      )}
      {currentView === "panel" && isAdminUser && (
        <AdminPanelView
          currentUser={currentUser}
          behaviorystDogs={behaviorystDogs}
          dogs={dogs}
          setCurrentView={setCurrentView}
          setSelectedDog={setSelectedDog}
          setDogCardFrom={setDogCardFrom}
          hoveredCard={hoveredCard}
          setHoveredCard={setHoveredCard}
          onStartWork={handleStartBehaviorystWork}
        />
      )}
    </RoleProvider>
  );
};

export default ShelterMapSystem;
