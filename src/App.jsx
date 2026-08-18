import React, { useState, useEffect, useRef, useCallback, useMemo, lazy, Suspense } from "react";
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
  Building2,
  Dumbbell,
} from "lucide-react";
import BehaviorReport from "./BehaviorReport";
import HomeView from "./HomeView";
import InstallPrompt from "./InstallPrompt";
import WalkScheduleView from "./WalkScheduleView";
import ScheduleView from "./ScheduleView";
import IntroWalkSection from "./IntroWalkSection";
import IntroWalkView from "./IntroWalkView";
import PlannedWalkToday from "./PlannedWalkToday";
import { recordWalkFs, syncWalkToSheet } from "./lib/walksStore";
import { db } from "./firebase";
import { doc as fsDoc, onSnapshot as fsOnSnapshot } from "firebase/firestore";
import { getSectorColor } from "./lib/sectorColors";
import { TopBar, AppNav } from "./components/AppShell";
const AdminPanelView = lazy(() => import("./AdminPanelView"));
const BehaviorystPanel = lazy(() => import("./BehaviorystPanel"));
const MapEditor = lazy(() => import("./MapEditor"));
const WalkReportView = lazy(() => import("./WalkReportView"));
import { RoleProvider, useUserRole } from "./hooks/useUserRole";
import useMedicalFlags from "./hooks/useMedicalFlags";
import { canSetMedicalFlags, canMoveDog, canViewSector, canReleaseDog, canEditDiet, canCompleteTask, canEditStatus, canViewWalkReport } from "./lib/roles";
import SectorView from "./SectorView";
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
    paddingBottom: "130px",
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
  KP: { type: "dog", special: "kwarantanna", mapHidden: true },
  IZ: { type: "dog", special: "izolacja", mapHidden: true },
  S: { type: "dog", special: "szpital", mapHidden: true },
  O: { type: "dog", special: "inne", mapHidden: true },
};

const infrastructure = [
  {
    id: "wybiegi_area",
    type: "area",
    label: "Wybiegi",
    points: [
      [139, 160],
      [99, 160],
      [-51, 380],
      [139, 380],
      [139, 160],
    ],
    color: "#dcfce7",
    strokeColor: "#86efac",
  },
  {
    id: "wybiegi_lewe",
    type: "building",
    label: "Wybiegi",
    x: 527, y: 184, width: 50, height: 149,
    color: "#dcfce7", strokeColor: "#86efac", textColor: "#166534",
  },
  {
    id: "szpital",
    type: "building",
    label: "Szpital ✚",
    x: 582, y: 220, width: 50, height: 169,
    color: "#fee2e2", strokeColor: "#fca5a5", textColor: "#991b1b",
    pavilion: "S", // klik pokazuje psy w szpitalu
  },
  {
    id: "kwarantanna",
    type: "building",
    label: "Kwarantanna",
    // nad pawilonami ZF/ZG (jak na planie schroniska)
    x: 283, y: 110, width: 91, height: 32,
    color: "#fef3c7", strokeColor: "#f59e0b", textColor: "#92400e", dashed: true,
    pavilion: "KP", // klik pokazuje psy w kwarantannie
  },
  {
    id: "izolatki",
    type: "building",
    label: "Izolatki",
    x: 530, y: 360, width: 50, height: 30,
    color: "#fee2e2", strokeColor: "#fca5a5", textColor: "#991b1b", dashed: true,
    pavilion: "I", // klik pokazuje psy w izolatkach (sektor I)
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

const formatWalkDate = (dateString) => {
  if (!dateString) return "—";
  const match = String(dateString).trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return `${match[3]}.${match[2]}.${match[1]}`;
  return String(dateString).trim() || "—";
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

  // Wiersz z nowszym spacerem jest bazą, ale puste pola duplikatu
  // nie mogą wymazać wypełnionych danych z drugiego wiersza
  const nextIsNewer = nextWalkDate && (!currentWalkDate || nextWalkDate > currentWalkDate);
  const base = nextIsNewer ? nextDog : currentDog;
  const other = nextIsNewer ? currentDog : nextDog;

  const merged = { ...base };
  for (const key of Object.keys(other)) {
    const baseEmpty = cleanText(merged[key]).length === 0;
    const otherFilled = cleanText(other[key]).length > 0;
    if (baseEmpty && otherFilled) merged[key] = other[key];
  }
  return merged;
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
  isBehavioryst,
}) => {
  const { isAdmin: isAdminRole, loading: roleLoading, role: userRole } = useUserRole();
  const filteredDogs = useMemo(() => {
    if (!searchTerm) return dogs;
    const term = searchTerm.toLowerCase();
    return dogs.filter(
      (dog) =>
        dog.name?.toLowerCase().includes(term) ||
        dog.breed?.toLowerCase().includes(term) ||
        dog.pavilion?.toLowerCase().includes(term) ||
        dog.id?.toLowerCase().includes(term)
    );
  }, [dogs, searchTerm]);

  const pavilionDogCount = useMemo(() => {
    const map = {};
    dogs.forEach((dog) => {
      if (dog.pavilion) map[dog.pavilion] = (map[dog.pavilion] || 0) + 1;
    });
    return map;
  }, [dogs]);

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
              🔍 Znaleziono: {filteredDogs.length}
            </h2>
            {filteredDogs.length === 0 ? (
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
                {filteredDogs.map((dog) => (
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
                    fill="#f9fafb"
                  />
                  {infrastructure.map((item) =>
                    item.type === "building" ? (
                      (() => {
                        const zoneCount = item.pavilion ? (pavilionDogCount[item.pavilion] || 0) : 0;
                        const clickable = !!item.pavilion;
                        const openZone = () => {
                          if (!clickable) return;
                          setSelectedPavilion(item.pavilion);
                          setCurrentView("boxes");
                        };
                        return (
                          <g key={item.id}>
                            <rect
                              x={item.x}
                              y={item.y}
                              width={item.width}
                              height={item.height}
                              fill={item.color}
                              stroke={item.strokeColor}
                              strokeWidth="2"
                              strokeDasharray={item.dashed ? "6 4" : undefined}
                              rx="8"
                              style={clickable ? { cursor: "pointer" } : undefined}
                              onClick={openZone}
                            />
                            <text
                              x={item.x + item.width / 2}
                              y={item.y + item.height / 2 + (clickable && item.height >= 30 ? -2 : 4)}
                              textAnchor="middle"
                              fontSize="10"
                              fontWeight="bold"
                              fill={item.textColor || "#374151"}
                              style={{ pointerEvents: "none" }}
                            >
                              {item.label}
                            </text>
                            {clickable && item.height >= 30 && (
                              <text
                                x={item.x + item.width / 2}
                                y={item.y + item.height / 2 + 12}
                                textAnchor="middle"
                                fontSize="9"
                                fill={item.textColor || "#374151"}
                                style={{ pointerEvents: "none" }}
                              >
                                {zoneCount} 🐕
                              </text>
                            )}
                          </g>
                        );
                      })()
                    ) : (
                      <g key={item.id}>
                        <polygon
                          points={item.points.map((p) => p.join(",")).join(" ")}
                          fill={item.color}
                          opacity="0.8"
                          stroke={item.strokeColor}
                          strokeWidth="2"
                        />
                      </g>
                    )
                  )}
                  {Object.entries(pavilionConfig).map(([code, config]) => {
                    if (config.mapHidden) return null;
                    const dogCount = pavilionDogCount[code] || 0;
                    // Kolor pawilonu = kolor sektora z tabeli spacerów (spójność)
                    const fillColor = getSectorColor(code, "#e2e8f0");
                    return (
                      <g key={code}>
                        <rect
                          x={config.x}
                          y={config.y}
                          width={config.width}
                          height={config.height}
                          fill={fillColor}
                          stroke="#9ca3af"
                          strokeWidth="1.5"
                          rx="8"
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
                          fontSize={config.height > 30 ? 14 : 12}
                          fontWeight="bold"
                          fill="#111827"
                          style={{ pointerEvents: "none" }}
                          transform={
                            config.rotation
                              ? `rotate(${config.rotation} ${
                                  config.x + config.width / 2
                                } ${config.y + config.height / 2})`
                              : ""
                          }
                        >
                          {/* wąskie paski: licznik w tej samej linii */}
                          {config.height > 30 ? code : `${code}${dogCount > 0 ? ` · ${dogCount}` : ""}`}
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
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <div style={{ width: "1rem", height: "1rem", borderRadius: "0.25rem", backgroundColor: "#dcfce7", border: "1px solid #86efac" }}></div>
                  <span>Wybiegi</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <div style={{ width: "1rem", height: "1rem", borderRadius: "0.25rem", backgroundColor: "#fee2e2", border: "1px solid #fca5a5" }}></div>
                  <span>Szpital / Izolatki</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <div style={{ width: "1rem", height: "1rem", borderRadius: "0.25rem", backgroundColor: "#fef3c7", border: "1px dashed #f59e0b" }}></div>
                  <span>Kwarantanna</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#6b7280" }}>
                  <span>🎨 Kolor pawilonu = kolor sektora w tabeli</span>
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
  isBehavioryst,
}) => {
  const { role: userRole } = useUserRole();

  const pavilionStats = useMemo(() => {
    const byPavilion = {};
    dogs.forEach((dog) => {
      if (!dog.pavilion) return;
      if (!byPavilion[dog.pavilion]) byPavilion[dog.pavilion] = { count: 0, boxes: new Set() };
      byPavilion[dog.pavilion].count += 1;
      if (dog.box != null) byPavilion[dog.pavilion].boxes.add(dog.box);
    });
    return byPavilion;
  }, [dogs]);

  const countDogsInPavilion = (pavilion) => pavilionStats[pavilion]?.count || 0;
  const countDogsInBox = (pavilion, box) =>
    dogs.filter((dog) => dog.pavilion === pavilion && dog.box === box).length;
  const getBoxesForPavilion = (pavilion) => {
    // Rzeczywista liczba boksów w strefach specjalnych (izolatek jest 5)
    const ZONE_BOX_LIMITS = { I: 5, S: 12, KP: 6 };
    const defaultLen = ZONE_BOX_LIMITS[pavilion] || 10;
    const boxes = [...(pavilionStats[pavilion]?.boxes || [])].sort((a, b) => a - b);
    const maxBox = boxes.length ? Math.max(...boxes, defaultLen) : defaultLen;
    const list = Array.from({ length: maxBox }, (_, i) => i + 1);
    // niektóre strefy (np. kwarantanna) używają boksu 0
    if (boxes.includes(0)) list.unshift(0);
    return list;
  };
  const boxes = getBoxesForPavilion(selectedPavilion);

  // Czytelne nazwy stref specjalnych zamiast "Pawilon KP"
  const ZONE_TITLES = { S: "Szpital", KP: "Kwarantanna", I: "Izolatki", O: "Inne" };
  const pavilionTitle = ZONE_TITLES[selectedPavilion]
    ? `${ZONE_TITLES[selectedPavilion]} (${selectedPavilion})`
    : `Pawilon ${selectedPavilion}`;

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
          <h1 style={styles.title}>{pavilionTitle}</h1>
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
  isBehavioryst,
}) => {
  const { role: userRole } = useUserRole();
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
                  setDogCardFrom("dogs");
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
      
    </div>
  );
};

const MyDogsView = ({ myDogs, setCurrentView, setSelectedDog, setDogCardFrom, hoveredCard, setHoveredCard, authEnabled, isAdmin, isBehavioryst }) => {
  const { role: userRole } = useUserRole();
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
      
    </div>
  );
};

function formatFlagTime(date, fallback = "odwołania") {
  if (!date) return fallback;
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
          ⚠ Aktywny — {currentFlag.note || "brak opisu"} | od: {formatFlagTime(currentFlag.validFrom, "teraz")} | do: {formatFlagTime(currentFlag.validUntil)}
        </p>
      )}
      {currentFlag.pending && (
        <p style={{ fontSize: "13px", color: "#b45309", marginBottom: "8px", fontWeight: 600 }}>
          🕐 Zaplanowano — od: {formatFlagTime(currentFlag.validFrom, "teraz")} | do: {formatFlagTime(currentFlag.validUntil)}
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

const TASK_OPTIONS = [
  { value: "próbka_kału",     label: "Zbieranie próbki kału",          icon: "🧪" },
  { value: "pobranie_krwi",   label: "Przyprowadzenie na pobranie krwi", icon: "💉" },
  { value: "zakropienie_oczu",label: "Zakropienie oczu",                icon: "👁️" },
  { value: "inne",            label: "Inne zadanie",                    icon: "🩺" },
];

const AmbulatoriumPanel = ({ noFood, walkBlocked, próbkaKału, pobranieKrwi, zakropienieOczu, inne, flagForm, setFlagForm, savingFlag, flagMsg, onSave, onDeactivate, taskForm, setTaskForm, savingTask, taskMsg, onSaveTask }) => {
  const activeTasks = [
    { key: "próbkaKału",       flag: próbkaKału,      type: "próbka_kału",      icon: "🧪", label: "Zbieranie próbki kału" },
    { key: "pobranieKrwi",     flag: pobranieKrwi,    type: "pobranie_krwi",    icon: "💉", label: "Pobranie krwi" },
    { key: "zakropienieOczu",  flag: zakropienieOczu, type: "zakropienie_oczu", icon: "👁️", label: "Zakropienie oczu" },
    { key: "inne",             flag: inne,            type: "inne",             icon: "🩺", label: "Inne zadanie" },
  ].filter(({ flag }) => flag.active || flag.pending);

  return (
    <div style={{ marginTop: "16px", border: "2px solid #fca5a5", borderRadius: "10px", padding: "16px", backgroundColor: "#fef2f2" }}>
      <h3 style={{ margin: "0 0 12px", fontSize: "16px", fontWeight: 700, color: "#7f1d1d" }}>🏥 Ambulatorium</h3>
      <FlagBlock title="Nie karmić" flagType="no_food" currentFlag={noFood} form={flagForm.no_food} setFlagForm={setFlagForm} saving={savingFlag.no_food} msg={flagMsg.no_food} onSave={onSave} onDeactivate={onDeactivate} />
      <FlagBlock title="Zakaz spaceru" flagType="walk_blocked" currentFlag={walkBlocked} form={flagForm.walk_blocked} setFlagForm={setFlagForm} saving={savingFlag.walk_blocked} msg={flagMsg.walk_blocked} onSave={onSave} onDeactivate={onDeactivate} />

      <div style={{ border: "1px solid #fca5a5", borderRadius: "8px", padding: "14px", marginBottom: "12px", backgroundColor: "#fff5f5" }}>
        <p style={{ fontWeight: 700, fontSize: "15px", margin: "0 0 10px", color: "#991b1b" }}>🩺 Zadania medyczne</p>

        {activeTasks.length > 0 && (
          <ul style={{ listStyle: "none", padding: 0, margin: "0 0 12px" }}>
            {activeTasks.map(({ key, flag, type, icon, label }) => (
              <li key={key} style={{ display: "flex", alignItems: "flex-start", gap: "8px", marginBottom: "8px", backgroundColor: "white", border: "1px solid #fca5a5", borderRadius: "6px", padding: "8px 10px" }}>
                <div style={{ flex: 1, fontSize: "13px" }}>
                  <span style={{ fontWeight: 700, color: "#991b1b" }}>{icon} {label}</span>
                  {flag.note && <span style={{ color: "#4b5563" }}> — {flag.note}</span>}
                  {flag.pending && <span style={{ color: "#b45309", marginLeft: "4px" }}>🕐 od {flag.validFrom ? flag.validFrom.toLocaleString("pl-PL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—"}</span>}
                  {flag.validUntil && <span style={{ color: "#6b7280", marginLeft: "4px" }}>do {flag.validUntil.toLocaleString("pl-PL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>}
                </div>
                <button
                  onClick={() => onDeactivate(type)}
                  disabled={savingFlag[type]}
                  style={{ flexShrink: 0, padding: "3px 8px", borderRadius: "5px", border: "none", backgroundColor: "#6b7280", color: "white", fontWeight: 600, fontSize: "12px", cursor: "pointer", opacity: savingFlag[type] ? 0.6 : 1 }}
                >
                  Odwołaj
                </button>
              </li>
            ))}
          </ul>
        )}

        <select
          value={taskForm.type}
          onChange={(e) => setTaskForm((f) => ({ ...f, type: e.target.value }))}
          style={{ width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "14px", boxSizing: "border-box", marginBottom: "8px", backgroundColor: "white" }}
        >
          <option value="">— Wybierz zadanie —</option>
          {TASK_OPTIONS.map(({ value, label, icon }) => (
            <option key={value} value={value}>{icon} {label}</option>
          ))}
        </select>
        <input
          type="text"
          value={taskForm.note}
          onChange={(e) => setTaskForm((f) => ({ ...f, note: e.target.value }))}
          placeholder="Notatka / powód (opcjonalnie)"
          style={{ width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "14px", boxSizing: "border-box", marginBottom: "8px" }}
        />
        <div style={{ display: "flex", gap: "10px", marginBottom: "8px" }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: "13px", color: "#374151", display: "block", marginBottom: "4px" }}>Od (puste = teraz)</label>
            <input type="datetime-local" value={taskForm.validFrom} onChange={(e) => setTaskForm((f) => ({ ...f, validFrom: e.target.value }))} style={{ width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "14px", boxSizing: "border-box" }} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: "13px", color: "#374151", display: "block", marginBottom: "4px" }}>Do (puste = bezterminowo)</label>
            <input type="datetime-local" value={taskForm.validUntil} onChange={(e) => setTaskForm((f) => ({ ...f, validUntil: e.target.value }))} style={{ width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "14px", boxSizing: "border-box" }} />
          </div>
        </div>
        <button
          onClick={onSaveTask}
          disabled={savingTask || !taskForm.type}
          style={{ width: "100%", padding: "8px", backgroundColor: (savingTask || !taskForm.type) ? "#9ca3af" : "#dc2626", color: "white", border: "none", borderRadius: "6px", fontWeight: 600, cursor: (savingTask || !taskForm.type) ? "not-allowed" : "pointer", fontSize: "14px" }}
        >
          {savingTask ? "Zapisywanie..." : "Dodaj zadanie"}
        </button>
        {taskMsg && (
          <p style={{ marginTop: "6px", fontSize: "13px", color: taskMsg.type === "success" ? "#166534" : "#991b1b", fontWeight: 600 }}>
            {taskMsg.type === "success" ? "✅ " : "❌ "}{taskMsg.text}
          </p>
        )}
      </div>
    </div>
  );
};

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
  const { noFood, walkBlocked, próbkaKału, pobranieKrwi, zakropienieOczu, inne, flagsError, refresh: refreshFlags } = useMedicalFlags(selectedDog?.id);

  const ALL_FLAG_TYPES = ["no_food", "walk_blocked", "próbka_kału", "pobranie_krwi", "zakropienie_oczu", "inne"];
  const initFlagForm = { note: "", validFrom: "", validUntil: "" };
  const [flagForm, setFlagForm] = useState(Object.fromEntries(ALL_FLAG_TYPES.map((t) => [t, initFlagForm])));
  const [savingFlag, setSavingFlag] = useState(Object.fromEntries(ALL_FLAG_TYPES.map((t) => [t, false])));
  const [flagMsg, setFlagMsg] = useState(Object.fromEntries(ALL_FLAG_TYPES.map((t) => [t, null])));

  const [taskForm, setTaskForm] = useState({ type: "", note: "", validFrom: "", validUntil: "" });
  const [savingTask, setSavingTask] = useState(false);
  const [taskMsg, setTaskMsg] = useState(null);

  const [dietInput, setDietInput] = useState(selectedDog?.diet || "");
  const [savingDiet, setSavingDiet] = useState(false);
  const [dietMsg, setDietMsg] = useState(null);

  const [showMedReportModal, setShowMedReportModal] = useState(false);
  const [medReportText, setMedReportText] = useState("");
  const [sendingMedReport, setSendingMedReport] = useState(false);
  const [medReportModalErr, setMedReportModalErr] = useState(null);
  const [medReportSuccessMsg, setMedReportSuccessMsg] = useState(null);
  const [currentDiet, setCurrentDiet] = useState(selectedDog?.diet || "");

  const [editingLocation, setEditingLocation] = useState(false);
  const [locationForm, setLocationForm] = useState({ pavilion: "", box: "" });
  const [savingLocation, setSavingLocation] = useState(false);
  const [locationMsg, setLocationMsg] = useState(null);

  const [weightInput, setWeightInput] = useState("");
  const [savingWeight, setSavingWeight] = useState(false);
  const [weightMsg, setWeightMsg] = useState(null);
  const [weightHistory, setWeightHistory] = useState([]);
  const [showWeightHistory, setShowWeightHistory] = useState(false);
  const [loadingWeightHistory, setLoadingWeightHistory] = useState(false);

  const [walkHistory, setWalkHistory] = useState([]);
  const [showWalkHistory, setShowWalkHistory] = useState(false);
  const [loadingWalkHistory, setLoadingWalkHistory] = useState(false);
  const [walkHistoryError, setWalkHistoryError] = useState(false);
  const [weightHistoryError, setWeightHistoryError] = useState(false);

  const [editingStatus, setEditingStatus] = useState(false);
  const [statusInput, setStatusInput] = useState(selectedDog?.status || "dostępny");
  const [nieWydawacInput, setNieWydawacInput] = useState(selectedDog?.nieWydawacWlascicielowi || false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);

  const [editingCastration, setEditingCastration] = useState(false);
  const [castrationInput, setCastrationInput] = useState(selectedDog?.kastracja || "nie_kastrowany");
  const [castrationDateInput, setCastrationDateInput] = useState(selectedDog?.kastracjaData || "");
  const [castrationReasonInput, setCastrationReasonInput] = useState(selectedDog?.kastracyjaPowod || "");
  const [savingCastration, setSavingCastration] = useState(false);
  const [castrationMsg, setCastrationMsg] = useState(null);

  const handleSaveTask = async () => {
    if (!currentUser || !taskForm.type) return;
    setSavingTask(true);
    setTaskMsg(null);
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch("/api/gs", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          action: "setMedicalFlag",
          dogId: selectedDog.id,
          flagType: taskForm.type,
          note: taskForm.note,
          validFrom: taskForm.validFrom ? new Date(taskForm.validFrom).toISOString() : null,
          validUntil: taskForm.validUntil ? new Date(taskForm.validUntil).toISOString() : null,
          createdBy: currentUser.displayName || "Nieznany",
        }),
      });
      const result = await res.json();
      if (result?.ok) {
        setTaskForm({ type: "", note: "", validFrom: "", validUntil: "" });
        setTaskMsg({ type: "success", text: "Zadanie dodane" });
        refreshFlags();
      } else {
        setTaskMsg({ type: "error", text: result?.error || "Błąd zapisu" });
      }
    } catch {
      setTaskMsg({ type: "error", text: "Błąd połączenia" });
    } finally { setSavingTask(false); }
  };

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
          createdBy: currentUser.displayName || "Nieznany",
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

  const handleSaveDiet = async () => {
    if (!currentUser || savingDiet) return;
    setSavingDiet(true);
    setDietMsg(null);
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch("/api/gs", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          action: "updateDogDiet",
          dogId: selectedDog.id,
          diet: dietInput.trim(),
          user: { email: currentUser.email },
        }),
      });
      const result = await res.json();
      if (result?.ok) {
        setCurrentDiet(dietInput.trim());
        setDietMsg({ type: "success", text: "Dieta zapisana" });
        onSurveySaved?.(selectedDog.id);
        setTimeout(() => setDietMsg(null), 4000);
      } else {
        setDietMsg({ type: "error", text: result?.error || "Błąd zapisu" });
      }
    } catch {
      setDietMsg({ type: "error", text: "Błąd połączenia" });
    } finally {
      setSavingDiet(false);
    }
  };

  const handleSaveStatus = async () => {
    if (!currentUser || savingStatus) return;
    setSavingStatus(true);
    setStatusMsg(null);
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch("/api/gs", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          action: "setDogStatus",
          dogId: selectedDog.id,
          status: statusInput,
          nieWydawacWlascicielowi: nieWydawacInput,
          user: { email: currentUser.email },
        }),
      });
      const result = await res.json();
      if (result?.ok) {
        setStatusMsg({ type: "success", text: "Status zapisany" });
        setEditingStatus(false);
        onSurveySaved?.(selectedDog.id);
        setTimeout(() => setStatusMsg(null), 4000);
      } else {
        setStatusMsg({ type: "error", text: result?.error || "Błąd zapisu" });
      }
    } catch {
      setStatusMsg({ type: "error", text: "Błąd połączenia" });
    } finally {
      setSavingStatus(false);
    }
  };

  const handleSaveCastration = async () => {
    if (!currentUser || savingCastration) return;
    setSavingCastration(true);
    setCastrationMsg(null);
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch("/api/gs", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          action: "setCastration",
          dogId: selectedDog.id,
          kastracja: castrationInput,
          kastracjaData: castrationInput === "kastrowany" ? castrationDateInput.trim() : "",
          kastracyjaPowod: castrationInput === "odroczona" ? castrationReasonInput.trim() : "",
          user: { email: currentUser.email },
        }),
      });
      const result = await res.json();
      if (result?.ok) {
        setCastrationMsg({ type: "success", text: "Zapisano" });
        setEditingCastration(false);
        onSurveySaved?.(selectedDog.id);
        setTimeout(() => setCastrationMsg(null), 4000);
      } else {
        setCastrationMsg({ type: "error", text: result?.error || "Błąd zapisu" });
      }
    } catch {
      setCastrationMsg({ type: "error", text: "Błąd połączenia" });
    } finally {
      setSavingCastration(false);
    }
  };

  const handleSubmitMedReport = async () => {
    if (!currentUser || sendingMedReport) return;
    if (!medReportText.trim() || medReportText.trim().length < 5) {
      setMedReportModalErr("Opis musi mieć co najmniej 5 znaków.");
      return;
    }
    setSendingMedReport(true);
    setMedReportModalErr(null);
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch("/api/gs", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          action: "submitMedicalReport",
          dogId: selectedDog.id,
          dogName: selectedDog.name,
          pawilon: selectedDog.pavilion || "",
          boks: selectedDog.box || "",
          description: medReportText.trim(),
          reportedBy: currentUser.displayName || "Nieznany",
        }),
      });
      const result = await res.json();
      if (result?.ok) {
        setShowMedReportModal(false);
        setMedReportText("");
        setMedReportSuccessMsg("✓ Zgłoszenie wysłane — ambulatorium zostało powiadomione");
        setTimeout(() => setMedReportSuccessMsg(null), 3000);
      } else {
        setMedReportModalErr("Błąd wysyłania — spróbuj ponownie");
      }
    } catch {
      setMedReportModalErr("Błąd połączenia — spróbuj ponownie");
    } finally {
      setSendingMedReport(false);
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

  const handleSaveWeight = async () => {
    if (!currentUser || savingWeight || !weightInput.trim()) return;
    setSavingWeight(true);
    setWeightMsg(null);
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch("/api/gs", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          action: "addWeightEntry",
          dogId: selectedDog.id,
          weight: weightInput.trim(),
          user: { email: currentUser.email, displayName: currentUser.displayName || "Nieznany" },
        }),
      });
      const result = await res.json();
      if (result?.ok) {
        setWeightMsg({ type: "success", text: "Waga zapisana" });
        setWeightInput("");
        onSurveySaved?.(selectedDog.id);
        if (showWeightHistory) loadWeightHistory();
        setTimeout(() => setWeightMsg(null), 4000);
      } else {
        setWeightMsg({ type: "error", text: result?.error || "Błąd zapisu" });
      }
    } catch {
      setWeightMsg({ type: "error", text: "Błąd połączenia" });
    } finally {
      setSavingWeight(false);
    }
  };

  const loadWeightHistory = async () => {
    setLoadingWeightHistory(true);
    setWeightHistoryError(false);
    try {
      const res = await fetch(`/api/gs?action=getWeightHistory&dogId=${encodeURIComponent(selectedDog.id)}`);
      const result = await res.json();
      if (result?.ok && Array.isArray(result?.data)) {
        setWeightHistory(result.data);
      } else {
        setWeightHistoryError(true);
      }
    } catch {
      setWeightHistoryError(true);
    }
    setLoadingWeightHistory(false);
  };

  const handleToggleWeightHistory = () => {
    if (!showWeightHistory) loadWeightHistory();
    setShowWeightHistory((v) => !v);
  };

  const loadWalkHistory = async () => {
    setLoadingWalkHistory(true);
    setWalkHistoryError(false);
    try {
      const res = await fetch(`/api/gs?action=getDogWalkHistory&dogId=${encodeURIComponent(selectedDog.id)}`);
      const result = await res.json();
      if (result?.ok && Array.isArray(result?.data)) {
        setWalkHistory(result.data);
      } else {
        setWalkHistoryError(true);
      }
    } catch {
      setWalkHistoryError(true);
    }
    setLoadingWalkHistory(false);
  };

  const handleToggleWalkHistory = () => {
    if (!showWalkHistory) loadWalkHistory();
    setShowWalkHistory((v) => !v);
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

  // Dzisiejszy spacer z Firestore — "Ostatni spacer" widzi zapisy
  // z tabeli/karty na żywo, zanim arkusz i lista psów się odświeżą
  const [todayFsWalk, setTodayFsWalk] = useState(null);
  useEffect(() => {
    if (!selectedDog?.id || !db) return;
    const todayStr = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Warsaw" }).format(new Date());
    const unsub = fsOnSnapshot(
      fsDoc(db, "dailyWalks", todayStr),
      (snap) => setTodayFsWalk(snap.data()?.walks?.[selectedDog.id] || null),
      () => {}
    );
    return () => unsub();
  }, [selectedDog?.id]);

  const handleSaveWalkType = async (typ) => {
    if (!currentUser || savingWalk) return;
    setSavingWalk(typ);
    setWalkMessage(null);
    try {
      // Firestore najpierw (tabela widzi zapis na żywo, działa offline,
      // spacer da się cofnąć); arkusz w tle z kolejką ponawiania
      const todayStr = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Warsaw" }).format(new Date());
      await recordWalkFs(todayStr, selectedDog, currentUser, typ);
      const synced = await syncWalkToSheet(selectedDog, typ, currentUser);

      const volunteerName = currentUser.displayName || "Wolontariusz";
      const label = typ === "wybieg" ? "Wybieg" : "Spacer";
      setWalkMessage({
        type: "success",
        text: synced
          ? `✅ ${label} zapisany przez ${volunteerName}!`
          : `✅ ${label} zapisany — synchronizacja z arkuszem po odzyskaniu zasięgu`,
      });
      onSurveySaved?.(selectedDog.id);
      setTimeout(() => setWalkMessage(null), 5000);
    } catch (e) {
      console.error("Błąd zapisu spaceru:", e);
      setWalkMessage({
        type: "error",
        text: e?.code === "permission-denied"
          ? "❌ Brak uprawnień zapisu — skontaktuj się z administratorem"
          : "❌ Błąd zapisu — sprawdź zasięg i spróbuj ponownie",
      });
    } finally {
      setSavingWalk(false);
    }
  };

  const handleToggleOpiekun = async () => {
    if (!currentUser || togglingOpiekun) return;
    setTogglingOpiekun(true);
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch("/api/gs", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "toggleOpiekun", dogId: selectedDog.id }),
      });
      const result = await res.json();
      if (!res.ok || !result?.ok) {
        throw new Error(result?.error || "Błąd zapisu");
      }
      const r2 = await fetch(`/api/gs?action=getOpiekunowie&dogId=${encodeURIComponent(selectedDog.id)}`);
      const r2json = await r2.json();
      if (r2json?.ok && Array.isArray(r2json?.data)) setOpiekunowie(r2json.data);
    } catch (e) {
      console.error("Błąd zmiany opiekuna:", e);
      setWalkMessage({ type: "error", text: "Nie udało się zapisać zmiany opiekuna — sprawdź połączenie i spróbuj ponownie" });
      setTimeout(() => setWalkMessage(null), 5000);
    } finally {
      setTogglingOpiekun(false);
    }
  };

  const isOpiekun = opiekunowie.some((o) => o.uid === currentUser?.uid);

  const [releasingDog, setReleasingDog] = useState(false);
  const [releaseMsg, setReleaseMsg] = useState(null);
  const [showReleaseConfirm, setShowReleaseConfirm] = useState(false);

  const handleReleaseDog = async () => {
    if (!currentUser || releasingDog) return;
    setReleasingDog(true);
    setReleaseMsg(null);
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch("/api/gs", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "setArchive", dogId: selectedDog.id, archived: true }),
      });
      const result = await res.json();
      if (result?.ok) {
        setReleaseMsg({ type: "success", text: `✅ Pies ${selectedDog.name} został wydany i przeniesiony do archiwum.` });
        setShowReleaseConfirm(false);
        onSurveySaved?.(selectedDog.id);
        setTimeout(() => setCurrentView(dogCardFrom || "home"), 2000);
      } else {
        setReleaseMsg({ type: "error", text: "❌ " + (result?.error || "Błąd zapisu") });
        setShowReleaseConfirm(false);
      }
    } catch {
      setReleaseMsg({ type: "error", text: "❌ Błąd połączenia" });
      setShowReleaseConfirm(false);
    } finally {
      setReleasingDog(false);
    }
  };

  if (!selectedDog) return null;

  // Nowszy wpis z Firestore (dzisiejszy) wygrywa ze starą wartością z arkusza
  const fsWalkNewer =
    todayFsWalk?.at && (!selectedDog.lastWalk || String(todayFsWalk.at) > String(selectedDog.lastWalk));
  const effLastWalk = fsWalkNewer ? todayFsWalk.at : selectedDog.lastWalk;
  const effLastVolunteer = fsWalkNewer ? todayFsWalk.volunteerName : selectedDog.lastVolunteer;
  const effLastWalkType = fsWalkNewer ? (todayFsWalk.type || "spacer") : selectedDog.lastWalkType;
  const formattedLastWalk = formatLastWalkDate(effLastWalk);
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
                👤 {opiekunowie.map((o) => o.displayName || "Nieznany").join(" · ")}
              </p>
            )}
          </div>
          {flagsError && (
            <div style={{ padding: "1rem 1.5rem 0" }}>
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "0.6rem",
                padding: "0.75rem 1rem",
                borderRadius: "0.75rem",
                background: "#fef3c7",
                border: "1px solid #f59e0b",
                color: "#92400e",
                fontSize: "0.85rem",
                fontWeight: 600,
              }}>
                <span>⚠️</span>
                <span style={{ flex: 1 }}>
                  Nie udało się pobrać flag medycznych — pies może mieć aktywne
                  ograniczenia (np. zakaz spaceru), których tu nie widać.
                </span>
                <button
                  onClick={refreshFlags}
                  style={{
                    border: "1px solid #f59e0b", background: "white", color: "#92400e",
                    borderRadius: "0.5rem", padding: "0.3rem 0.6rem", fontWeight: 700,
                    fontSize: "0.75rem", cursor: "pointer", whiteSpace: "nowrap",
                  }}
                >
                  Odśwież
                </button>
              </div>
            </div>
          )}
          {(noFood.active || walkBlocked.active || próbkaKału.active || pobranieKrwi.active || zakropienieOczu.active || inne.active ||
            noFood.pending || walkBlocked.pending || próbkaKału.pending || pobranieKrwi.pending || zakropienieOczu.pending || inne.pending) && (
            <div style={{ padding: "1rem 1.5rem 0" }}>
              {noFood.active && <MedicalAlert icon="🔴" title="NIE KARMIĆ" flag={noFood} />}
              {walkBlocked.active && <MedicalAlert icon="🚫" title="ZAKAZ SPACERU" flag={walkBlocked} />}
              {[
                { flag: próbkaKału, key: "próbkaKału", icon: "🧪", title: "PRÓBKA KAŁU" },
                { flag: pobranieKrwi, key: "pobranieKrwi", icon: "💉", title: "POBRANIE KRWI" },
                { flag: zakropienieOczu, key: "zakropienieOczu", icon: "👁️", title: "ZAKROPIENIE OCZU" },
                { flag: inne, key: "inne", icon: "🩺", title: "INNE ZADANIE" },
              ].map(({ flag, key, icon, title }) =>
                (flag.active || flag.pending) ? (
                  <MedicalAlert key={key} icon={icon} title={title} flag={flag} />
                ) : null
              )}
            </div>
          )}
          <PlannedWalkToday dog={selectedDog} currentUser={currentUser} isAdmin={isAdmin} />
          <div style={{ padding: "1.5rem", paddingBottom: 0 }}>
            <DogPhoto
              photo={selectedDog.photo}
              name={selectedDog.name}
              size="large"
            />
            {currentDiet && (
              <div style={{ marginTop: "1rem", backgroundColor: "#fef3c7", border: "2px solid #f59e0b", borderRadius: "0.75rem", padding: "0.875rem 1rem" }}>
                <p style={{ fontWeight: 700, color: "#92400e", fontSize: "0.95rem", marginBottom: "0.35rem" }}>
                  ⚠️ Uwaga — pies na diecie specjalistycznej!
                </p>
                <p style={{ color: "#78350f", fontSize: "0.875rem", lineHeight: "1.5" }}>
                  Na spacerach karmimy go tylko: <strong>{currentDiet}</strong>
                </p>
              </div>
            )}
          </div>
          <div style={{ padding: "1.25rem" }}>
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
            {/* Główne akcje wolontariusza — zawsze na górze karty */}
            <div style={{ display: "flex", gap: "0.6rem", marginBottom: "0.5rem" }}>
              <button
                onClick={() => handleSaveWalkType("spacer")}
                disabled={!currentUser || !!savingWalk || walkBlocked.active}
                style={{
                  flex: 1,
                  ...styles.walkButton,
                  marginBottom: 0,
                  fontSize: "1.05rem",
                  padding: "1.1rem 0.5rem",
                  backgroundColor: (!currentUser || !!savingWalk || walkBlocked.active) ? undefined : "#16a34a",
                  ...(!currentUser || !!savingWalk || walkBlocked.active ? styles.walkButtonDisabled : {}),
                }}
              >
                {savingWalk === "spacer" ? "Zapisywanie..." : "🦮 Spacer"}
              </button>
              <button
                onClick={() => handleSaveWalkType("wybieg")}
                disabled={!currentUser || !!savingWalk || walkBlocked.active}
                style={{
                  flex: 1,
                  ...styles.walkButton,
                  marginBottom: 0,
                  fontSize: "1.05rem",
                  padding: "1.1rem 0.5rem",
                  backgroundColor: (!currentUser || !!savingWalk || walkBlocked.active) ? undefined : "#2563eb",
                  ...(!currentUser || !!savingWalk || walkBlocked.active ? styles.walkButtonDisabled : {}),
                }}
              >
                {savingWalk === "wybieg" ? "Zapisywanie..." : "🛖 Wybieg"}
              </button>
            </div>
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
            <button
              onClick={() => onToggleFavorite(selectedDog.id)}
              disabled={!currentUser || isFavoriteToggleInProgress}
              style={{
                width: "100%",
                padding: "0.7rem",
                marginBottom: "0.75rem",
                borderRadius: "0.75rem",
                border: isFavorite ? "1px solid #f59e0b" : "1px solid #d1d5db",
                background: isFavorite ? "#fef3c7" : "white",
                color: isFavorite ? "#92400e" : "#374151",
                fontWeight: 600,
                fontSize: "0.9rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: (!currentUser || isFavoriteToggleInProgress) ? 0.55 : 1,
              }}
            >
              <Star size={18} style={{ marginRight: "0.5rem" }} />
              {isFavoriteToggleInProgress
                ? "Zapisywanie..."
                : isFavorite
                ? "Odepnij z Moje psy"
                : "Przypnij do Moje psy"}
            </button>
            {medReportSuccessMsg && (
              <div style={{ marginBottom: "1rem", padding: "0.75rem", borderRadius: "0.75rem", backgroundColor: "#dcfce7", color: "#166534", fontSize: "0.875rem", fontWeight: 600 }}>
                {medReportSuccessMsg}
              </div>
            )}
            {currentUser && (
              <button
                onClick={() => { setShowMedReportModal(true); setMedReportModalErr(null); }}
                style={{
                  width: "100%",
                  padding: "0.7rem",
                  marginBottom: "0.75rem",
                  borderRadius: "0.75rem",
                  border: "1px solid #fca5a5",
                  background: "#fef2f2",
                  color: "#991b1b",
                  fontWeight: 700,
                  fontSize: "0.9rem",
                  cursor: "pointer",
                }}
              >
                🚨 Zgłoś problem medyczny
              </button>
            )}
            {showMedReportModal && (
              <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
                <div style={{ backgroundColor: "white", borderRadius: "1rem", padding: "1.5rem", width: "100%", maxWidth: "480px", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
                  <h2 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#111827", marginBottom: "0.25rem" }}>🚨 Zgłoś problem medyczny</h2>
                  <p style={{ color: "#6b7280", fontSize: "0.875rem", marginBottom: "1rem" }}>
                    Pies: <strong>{selectedDog.name}</strong>
                    {(selectedDog.pavilion || selectedDog.box) && ` · ${[selectedDog.pavilion, selectedDog.box ? `boks ${selectedDog.box}` : ""].filter(Boolean).join(" / ")}`}
                  </p>
                  <label style={{ fontWeight: 600, color: "#374151", fontSize: "0.875rem", display: "block", marginBottom: "0.4rem" }}>Opisz problem:</label>
                  <textarea
                    value={medReportText}
                    onChange={(e) => { setMedReportText(e.target.value); setMedReportModalErr(null); }}
                    placeholder="Opisz zaobserwowany problem (min. 5 znaków)..."
                    rows={4}
                    style={{ width: "100%", padding: "0.6rem", borderRadius: "0.5rem", border: "1px solid #d1d5db", fontSize: "0.9rem", resize: "vertical", boxSizing: "border-box", fontFamily: "inherit", marginBottom: "0.5rem" }}
                  />
                  {medReportModalErr && (
                    <p style={{ color: "#dc2626", fontSize: "0.8rem", marginBottom: "0.5rem", fontWeight: 600 }}>❌ {medReportModalErr}</p>
                  )}
                  <div style={{ display: "flex", gap: "0.75rem" }}>
                    <button
                      onClick={() => { setShowMedReportModal(false); setMedReportText(""); setMedReportModalErr(null); }}
                      disabled={sendingMedReport}
                      style={{ flex: 1, padding: "0.75rem", borderRadius: "0.75rem", border: "1px solid #d1d5db", backgroundColor: "white", color: "#374151", fontWeight: 600, fontSize: "0.9rem", cursor: "pointer" }}
                    >
                      Anuluj
                    </button>
                    <button
                      onClick={handleSubmitMedReport}
                      disabled={sendingMedReport}
                      style={{ flex: 2, padding: "0.75rem", borderRadius: "0.75rem", border: "none", backgroundColor: "#DC2626", color: "white", fontWeight: 700, fontSize: "0.9rem", cursor: "pointer", opacity: sendingMedReport ? 0.6 : 1 }}
                    >
                      {sendingMedReport ? "Wysyłanie..." : "Wyślij zgłoszenie"}
                    </button>
                  </div>
                </div>
              </div>
            )}
            <div style={styles.sectionYellow}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                <h3 style={{ ...styles.sectionTitle, margin: 0 }}>
                  <Clock size={20} style={{ marginRight: "0.5rem" }} />
                  {effLastWalkType === "wybieg" ? "Ostatni wybieg" : "Ostatni spacer"}
                </h3>
                <button
                  onClick={handleToggleWalkHistory}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#92400e", fontSize: "0.85rem", fontWeight: 600, padding: "2px 6px", textDecoration: "underline" }}
                >
                  {showWalkHistory ? "Ukryj historię ▲" : "Historia spacerów ▼"}
                </button>
              </div>
              {formattedLastWalk ? (
                <>
                  <p style={{ color: "#374151", fontSize: "1.125rem", fontWeight: "600" }}>{formattedLastWalk}</p>
                  {effLastVolunteer && (
                    <p style={{ color: "#6b7280", fontSize: "0.875rem", marginTop: "0.25rem" }}>👤 {effLastVolunteer}</p>
                  )}
                </>
              ) : (
                <p style={{ color: "#6b7280", fontSize: "0.9rem" }}>Brak zapisanych spacerów</p>
              )}
              {showWalkHistory && (
                <div style={{ marginTop: "0.75rem", borderTop: "1px solid #fde68a", paddingTop: "0.75rem" }}>
                  {loadingWalkHistory ? (
                    <p style={{ fontSize: "0.85rem", color: "#6b7280" }}>Ładowanie...</p>
                  ) : walkHistoryError ? (
                    <p style={{ fontSize: "0.85rem", color: "#b45309" }}>
                      ⚠️ Nie udało się pobrać historii —{" "}
                      <button onClick={loadWalkHistory} style={{ background: "none", border: "none", color: "#2563eb", cursor: "pointer", padding: 0, fontSize: "0.85rem", textDecoration: "underline" }}>
                        spróbuj ponownie
                      </button>
                    </p>
                  ) : walkHistory.length === 0 ? (
                    <p style={{ fontSize: "0.85rem", color: "#6b7280" }}>Brak historii spacerów</p>
                  ) : (
                    <table style={{ width: "100%", fontSize: "0.8rem", borderCollapse: "collapse" }}>
                      <thead>
                        <tr>
                          <th style={{ textAlign: "left", color: "#92400e", fontWeight: 600, paddingBottom: "0.4rem" }}>Typ</th>
                          <th style={{ textAlign: "left", color: "#92400e", fontWeight: 600, paddingBottom: "0.4rem" }}>Data</th>
                          <th style={{ textAlign: "right", color: "#92400e", fontWeight: 600, paddingBottom: "0.4rem" }}>Wolontariusz</th>
                        </tr>
                      </thead>
                      <tbody>
                        {walkHistory.map((entry, i) => (
                          <tr key={i} style={{ borderTop: "1px solid #fef3c7" }}>
                            <td style={{ paddingTop: "0.3rem", color: "#374151" }}>{entry.typ === "wybieg" ? "🛖" : "🦮"}</td>
                            <td style={{ paddingTop: "0.3rem", color: "#374151" }}>{formatWalkDate(entry.date)}</td>
                            <td style={{ paddingTop: "0.3rem", color: "#6b7280", textAlign: "right" }}>{entry.volunteer || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
            <IntroWalkSection dog={selectedDog} currentUser={currentUser} isAdmin={isAdmin} />
            <button
              onClick={() => setShowBehaviorReport(true)}
              style={{
                width: "100%",
                padding: "0.7rem",
                marginBottom: "0.75rem",
                borderRadius: "0.75rem",
                border: "1px solid #d1d5db",
                background: "white",
                color: "#374151",
                fontWeight: 600,
                fontSize: "0.9rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ClipboardPlus size={18} style={{ marginRight: "0.5rem" }} />
              Zgłoszenie do pracy behawioralnej
            </button>
            <button
              onClick={handleToggleOpiekun}
              disabled={!currentUser || togglingOpiekun}
              style={{
                width: "100%",
                padding: "0.7rem",
                marginBottom: "0.75rem",
                borderRadius: "0.75rem",
                border: isOpiekun ? "1px solid #86efac" : "1px solid #d1d5db",
                background: isOpiekun ? "#dcfce7" : "white",
                color: isOpiekun ? "#166534" : "#374151",
                fontWeight: 600,
                fontSize: "0.9rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: (!currentUser || togglingOpiekun) ? 0.55 : 1,
              }}
            >
              <Users size={18} style={{ marginRight: "0.5rem" }} />
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
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
                  <div style={styles.infoLabel}>⚖️ Waga</div>
                  <button
                    onClick={handleToggleWeightHistory}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#2563eb", fontSize: "0.8rem", padding: "2px 6px" }}
                  >
                    {showWeightHistory ? "Ukryj historię ▲" : "Historia wagi ▼"}
                  </button>
                </div>
                <div style={styles.infoValue}>{selectedDog.weight || "—"}</div>
                {currentUser && (
                  <div style={{ marginTop: "0.6rem" }}>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <input
                        type="text"
                        value={weightInput}
                        onChange={(e) => setWeightInput(e.target.value)}
                        placeholder="Nowa waga (np. 12 kg)"
                        style={{ flex: 1, padding: "0.4rem 0.5rem", borderRadius: "0.5rem", border: "1px solid #d1d5db", fontSize: "0.875rem" }}
                      />
                      <button
                        onClick={handleSaveWeight}
                        disabled={savingWeight || !weightInput.trim()}
                        style={{ padding: "0.4rem 0.75rem", borderRadius: "0.5rem", border: "none", backgroundColor: "#2563eb", color: "white", fontWeight: 600, cursor: "pointer", fontSize: "0.875rem", opacity: (savingWeight || !weightInput.trim()) ? 0.6 : 1 }}
                      >
                        {savingWeight ? "..." : "Zapisz"}
                      </button>
                    </div>
                    {weightMsg && (
                      <p style={{ marginTop: "0.3rem", fontSize: "0.8rem", color: weightMsg.type === "success" ? "#166534" : "#991b1b", fontWeight: 600 }}>
                        {weightMsg.type === "success" ? "✅ " : "❌ "}{weightMsg.text}
                      </p>
                    )}
                  </div>
                )}
                {showWeightHistory && (
                  <div style={{ marginTop: "0.75rem" }}>
                    {loadingWeightHistory ? (
                      <p style={{ fontSize: "0.8rem", color: "#6b7280" }}>Ładowanie...</p>
                    ) : weightHistoryError ? (
                      <p style={{ fontSize: "0.8rem", color: "#b45309" }}>
                        ⚠️ Nie udało się pobrać historii —{" "}
                        <button onClick={loadWeightHistory} style={{ background: "none", border: "none", color: "#2563eb", cursor: "pointer", padding: 0, fontSize: "0.8rem", textDecoration: "underline" }}>
                          spróbuj ponownie
                        </button>
                      </p>
                    ) : weightHistory.length === 0 ? (
                      <p style={{ fontSize: "0.8rem", color: "#6b7280" }}>Brak historii</p>
                    ) : (
                      <table style={{ width: "100%", fontSize: "0.8rem", borderCollapse: "collapse" }}>
                        <thead>
                          <tr>
                            <th style={{ textAlign: "left", color: "#6b7280", fontWeight: 600, paddingBottom: "0.25rem" }}>Data</th>
                            <th style={{ textAlign: "right", color: "#6b7280", fontWeight: 600, paddingBottom: "0.25rem" }}>Waga</th>
                            <th style={{ textAlign: "right", color: "#6b7280", fontWeight: 600, paddingBottom: "0.25rem" }}>Kto</th>
                          </tr>
                        </thead>
                        <tbody>
                          {weightHistory.map((entry, i) => (
                            <tr key={i} style={{ borderTop: "1px solid #f3f4f6" }}>
                              <td style={{ paddingTop: "0.25rem", color: "#374151" }}>{entry.date}</td>
                              <td style={{ paddingTop: "0.25rem", color: "#374151", textAlign: "right", fontWeight: 600 }}>{entry.weight}</td>
                              <td style={{ paddingTop: "0.25rem", color: "#6b7280", textAlign: "right", fontSize: "0.75rem" }}>{entry.recordedByName}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
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
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                  <div style={styles.infoLabel}>📊 Status</div>
                  {canEditStatus(role) && !editingStatus && (
                    <button
                      onClick={() => {
                        setStatusInput(selectedDog.status || "dostępny");
                        setNieWydawacInput(selectedDog.nieWydawacWlascicielowi || false);
                        setEditingStatus(true);
                        setStatusMsg(null);
                      }}
                      style={{ fontSize: "0.75rem", padding: "0.25rem 0.6rem", borderRadius: "0.4rem", border: "1px solid #d1d5db", backgroundColor: "white", cursor: "pointer", color: "#374151" }}
                    >
                      Edytuj
                    </button>
                  )}
                </div>
                {!editingStatus ? (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                    <span
                      style={
                        !selectedDog.status || selectedDog.status === "dostępny"
                          ? styles.badgeGreen
                          : selectedDog.status === "ankieta_w_systemie"
                          ? { ...styles.badgeYellow }
                          : { backgroundColor: "#fee2e2", color: "#991b1b", padding: "0.25rem 0.75rem", borderRadius: "9999px", fontSize: "0.875rem", fontWeight: 600 }
                      }
                    >
                      {!selectedDog.status || selectedDog.status === "dostępny"
                        ? "✅ Dostępny"
                        : selectedDog.status === "ankieta_w_systemie"
                        ? "📋 Ankieta w systemie"
                        : "🚫 Nie do adopcji"}
                    </span>
                    {selectedDog.nieWydawacWlascicielowi && (
                      <span style={{ backgroundColor: "#fef3c7", color: "#92400e", padding: "0.25rem 0.75rem", borderRadius: "9999px", fontSize: "0.875rem", fontWeight: 600 }}>
                        ⚠️ Nie wydawać właścicielowi
                      </span>
                    )}
                    {statusMsg && (
                      <div style={{ fontSize: "0.8rem", color: statusMsg.type === "success" ? "#059669" : "#dc2626", marginTop: "0.25rem", width: "100%" }}>
                        {statusMsg.text}
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    {[
                      { value: "dostępny", label: "✅ Dostępny" },
                      { value: "ankieta_w_systemie", label: "📋 Ankieta w systemie" },
                      { value: "nie_do_adopcji", label: "🚫 Nie do adopcji" },
                    ].map((opt) => (
                      <label key={opt.value} style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem", cursor: "pointer", fontSize: "0.95rem" }}>
                        <input
                          type="radio"
                          name="dogStatus"
                          value={opt.value}
                          checked={statusInput === opt.value}
                          onChange={() => setStatusInput(opt.value)}
                        />
                        {opt.label}
                      </label>
                    ))}
                    <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.75rem", marginBottom: "0.75rem", cursor: "pointer", fontSize: "0.95rem", fontWeight: 600, color: "#92400e" }}>
                      <input
                        type="checkbox"
                        checked={nieWydawacInput}
                        onChange={(e) => setNieWydawacInput(e.target.checked)}
                      />
                      ⚠️ Nie wydawać właścicielowi
                    </label>
                    {statusMsg && (
                      <div style={{ fontSize: "0.8rem", color: statusMsg.type === "success" ? "#059669" : "#dc2626", marginBottom: "0.5rem" }}>
                        {statusMsg.text}
                      </div>
                    )}
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <button
                        onClick={handleSaveStatus}
                        disabled={savingStatus}
                        style={{ padding: "0.5rem 1rem", borderRadius: "0.5rem", border: "none", backgroundColor: "#2563eb", color: "white", fontWeight: 600, fontSize: "0.875rem", cursor: "pointer", opacity: savingStatus ? 0.6 : 1 }}
                      >
                        {savingStatus ? "Zapisywanie..." : "Zapisz"}
                      </button>
                      <button
                        onClick={() => { setEditingStatus(false); setStatusMsg(null); }}
                        style={{ padding: "0.5rem 1rem", borderRadius: "0.5rem", border: "1px solid #d1d5db", backgroundColor: "white", color: "#374151", fontWeight: 600, fontSize: "0.875rem", cursor: "pointer" }}
                      >
                        Anuluj
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* KASTRACJA */}
              <div style={styles.infoBox}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                  <div style={styles.infoLabel}>✂️ Kastracja</div>
                  {canEditStatus(role) && !editingCastration && (
                    <button
                      onClick={() => {
                        setCastrationInput(selectedDog.kastracja || "nie_kastrowany");
                        setCastrationDateInput(selectedDog.kastracjaData || "");
                        setCastrationReasonInput(selectedDog.kastracyjaPowod || "");
                        setEditingCastration(true);
                        setCastrationMsg(null);
                      }}
                      style={{ fontSize: "0.75rem", padding: "0.25rem 0.6rem", borderRadius: "0.4rem", border: "1px solid #d1d5db", backgroundColor: "white", cursor: "pointer", color: "#374151" }}
                    >
                      Edytuj
                    </button>
                  )}
                </div>
                {!editingCastration ? (
                  <div>
                    {(!selectedDog.kastracja || selectedDog.kastracja === "nie_kastrowany") && (
                      <span style={{ backgroundColor: "#f3f4f6", color: "#374151", padding: "0.25rem 0.75rem", borderRadius: "9999px", fontSize: "0.875rem", fontWeight: 600 }}>
                        ❌ Nie kastrowany/a
                      </span>
                    )}
                    {selectedDog.kastracja === "kastrowany" && (
                      <div>
                        <span style={styles.badgeGreen}>✅ Tak</span>
                        {selectedDog.kastracjaData && (
                          <span style={{ marginLeft: "0.5rem", fontSize: "0.875rem", color: "#374151" }}>
                            {selectedDog.kastracjaData}
                          </span>
                        )}
                      </div>
                    )}
                    {selectedDog.kastracja === "odroczona" && (
                      <div>
                        <span style={{ backgroundColor: "#fef3c7", color: "#92400e", padding: "0.25rem 0.75rem", borderRadius: "9999px", fontSize: "0.875rem", fontWeight: 600 }}>
                          ⏳ Odroczono
                        </span>
                        {selectedDog.kastracyjaPowod && (
                          <div style={{ marginTop: "0.4rem", fontSize: "0.875rem", color: "#374151" }}>
                            {selectedDog.kastracyjaPowod}
                          </div>
                        )}
                      </div>
                    )}
                    {castrationMsg && (
                      <div style={{ fontSize: "0.8rem", color: castrationMsg.type === "success" ? "#059669" : "#dc2626", marginTop: "0.25rem" }}>
                        {castrationMsg.text}
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    {[
                      { value: "kastrowany", label: "✅ Tak — kastrowany/a" },
                      { value: "nie_kastrowany", label: "❌ Nie kastrowany/a" },
                      { value: "odroczona", label: "⏳ Odroczono" },
                    ].map((opt) => (
                      <label key={opt.value} style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem", cursor: "pointer", fontSize: "0.95rem" }}>
                        <input
                          type="radio"
                          name="castration"
                          value={opt.value}
                          checked={castrationInput === opt.value}
                          onChange={() => setCastrationInput(opt.value)}
                        />
                        {opt.label}
                      </label>
                    ))}
                    {castrationInput === "kastrowany" && (
                      <input
                        type="text"
                        placeholder="Data zabiegu (np. 12.03.2025)"
                        value={castrationDateInput}
                        onChange={(e) => setCastrationDateInput(e.target.value)}
                        style={{ width: "100%", padding: "0.5rem", borderRadius: "0.5rem", border: "1px solid #d1d5db", fontSize: "0.9rem", marginBottom: "0.5rem", boxSizing: "border-box" }}
                      />
                    )}
                    {castrationInput === "odroczona" && (
                      <textarea
                        placeholder="Powód odroczenia"
                        value={castrationReasonInput}
                        onChange={(e) => setCastrationReasonInput(e.target.value)}
                        rows={2}
                        style={{ width: "100%", padding: "0.5rem", borderRadius: "0.5rem", border: "1px solid #d1d5db", fontSize: "0.9rem", marginBottom: "0.5rem", resize: "vertical", boxSizing: "border-box" }}
                      />
                    )}
                    {castrationMsg && (
                      <div style={{ fontSize: "0.8rem", color: castrationMsg.type === "success" ? "#059669" : "#dc2626", marginBottom: "0.5rem" }}>
                        {castrationMsg.text}
                      </div>
                    )}
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <button
                        onClick={handleSaveCastration}
                        disabled={savingCastration}
                        style={{ padding: "0.5rem 1rem", borderRadius: "0.5rem", border: "none", backgroundColor: "#2563eb", color: "white", fontWeight: 600, fontSize: "0.875rem", cursor: "pointer", opacity: savingCastration ? 0.6 : 1 }}
                      >
                        {savingCastration ? "Zapisywanie..." : "Zapisz"}
                      </button>
                      <button
                        onClick={() => { setEditingCastration(false); setCastrationMsg(null); }}
                        style={{ padding: "0.5rem 1rem", borderRadius: "0.5rem", border: "1px solid #d1d5db", backgroundColor: "white", color: "#374151", fontWeight: 600, fontSize: "0.875rem", cursor: "pointer" }}
                      >
                        Anuluj
                      </button>
                    </div>
                  </div>
                )}
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
            {canCompleteTask(role) && !canSetMedicalFlags(role) && (() => {
              const activeTasks = [
                { key: "próbkaKału",      flag: próbkaKału,      type: "próbka_kału",      icon: "🧪", label: "Zbieranie próbki kału" },
                { key: "pobranieKrwi",    flag: pobranieKrwi,    type: "pobranie_krwi",    icon: "💉", label: "Pobranie krwi" },
                { key: "zakropienieOczu", flag: zakropienieOczu, type: "zakropienie_oczu", icon: "👁️", label: "Zakropienie oczu" },
                { key: "inne",            flag: inne,            type: "inne",             icon: "🩺", label: "Inne zadanie" },
              ].filter(({ flag }) => flag.active || flag.pending);
              if (activeTasks.length === 0) return null;
              return (
                <div style={{ marginTop: "16px", border: "2px solid #bfdbfe", borderRadius: "10px", padding: "16px", backgroundColor: "#eff6ff" }}>
                  <h3 style={{ margin: "0 0 12px", fontSize: "16px", fontWeight: 700, color: "#1e40af" }}>🩺 Zadania do wykonania</h3>
                  <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                    {activeTasks.map(({ key, flag, type, icon, label }) => (
                      <li key={key} style={{ display: "flex", alignItems: "flex-start", gap: "8px", marginBottom: "8px", backgroundColor: "white", border: "1px solid #bfdbfe", borderRadius: "6px", padding: "10px 12px" }}>
                        <div style={{ flex: 1, fontSize: "14px" }}>
                          <span style={{ fontWeight: 700, color: "#1e40af" }}>{icon} {label}</span>
                          {flag.note && <span style={{ color: "#4b5563" }}> — {flag.note}</span>}
                          {flag.pending && <span style={{ color: "#b45309", display: "block", fontSize: "12px", marginTop: "2px" }}>🕐 Zaplanowane od {flag.validFrom ? flag.validFrom.toLocaleString("pl-PL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—"}</span>}
                          {flag.validUntil && <span style={{ color: "#6b7280", display: "block", fontSize: "12px" }}>Termin: {flag.validUntil.toLocaleString("pl-PL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>}
                        </div>
                        <button
                          onClick={() => handleDeactivateFlag(type)}
                          disabled={savingFlag[type]}
                          style={{ flexShrink: 0, padding: "5px 12px", borderRadius: "6px", border: "none", backgroundColor: "#16a34a", color: "white", fontWeight: 700, fontSize: "13px", cursor: "pointer", opacity: savingFlag[type] ? 0.6 : 1 }}
                        >
                          {savingFlag[type] ? "..." : "✓ Wykonane"}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })()}
            {canSetMedicalFlags(role) && (
              <AmbulatoriumPanel
                noFood={noFood}
                walkBlocked={walkBlocked}
                próbkaKału={próbkaKału}
                pobranieKrwi={pobranieKrwi}
                zakropienieOczu={zakropienieOczu}
                inne={inne}
                flagForm={flagForm}
                setFlagForm={setFlagForm}
                savingFlag={savingFlag}
                flagMsg={flagMsg}
                onSave={handleSetFlag}
                onDeactivate={handleDeactivateFlag}
                taskForm={taskForm}
                setTaskForm={setTaskForm}
                savingTask={savingTask}
                taskMsg={taskMsg}
                onSaveTask={handleSaveTask}
              />
            )}
            {canEditDiet(role) && (
              <div style={{ marginTop: "12px", border: "2px solid #d1fae5", borderRadius: "10px", padding: "16px", backgroundColor: "#f0fdf4" }}>
                <h3 style={{ margin: "0 0 12px", fontSize: "16px", fontWeight: 700, color: "#065f46" }}>🥩 Dieta specjalistyczna</h3>
                <textarea
                  value={dietInput}
                  onChange={(e) => setDietInput(e.target.value)}
                  placeholder="Wpisz zalecenia dietetyczne dla psa (pozostaw puste aby usunąć)"
                  rows={3}
                  style={{ width: "100%", padding: "0.5rem", borderRadius: "0.5rem", border: "1px solid #6ee7b7", fontSize: "0.875rem", resize: "vertical", boxSizing: "border-box", fontFamily: "inherit" }}
                />
                <button
                  onClick={handleSaveDiet}
                  disabled={savingDiet}
                  style={{ marginTop: "6px", padding: "0.5rem 1rem", borderRadius: "0.5rem", border: "none", backgroundColor: "#059669", color: "white", fontWeight: 600, fontSize: "0.875rem", cursor: "pointer", opacity: savingDiet ? 0.6 : 1 }}
                >
                  {savingDiet ? "Zapisywanie..." : "Zapisz dietę"}
                </button>
                {dietMsg && (
                  <p style={{ marginTop: "6px", fontSize: "0.8rem", fontWeight: 600, color: dietMsg.type === "success" ? "#166534" : "#991b1b" }}>
                    {dietMsg.type === "success" ? "✅ " : "❌ "}{dietMsg.text}
                  </p>
                )}
              </div>
            )}
            {canReleaseDog(role) && (
              <div style={{ marginTop: "2rem", borderTop: "1px solid #e5e7eb", paddingTop: "1.5rem" }}>
                {!showReleaseConfirm ? (
                  <button
                    onClick={() => setShowReleaseConfirm(true)}
                    disabled={releasingDog}
                    style={{
                      ...styles.walkButton,
                      backgroundColor: "#dc2626",
                      boxShadow: "0 2px 4px rgba(220,38,38,0.3)",
                    }}
                  >
                    🏠 Wydaj psa
                  </button>
                ) : (
                  <div
                    style={{
                      backgroundColor: "#fef2f2",
                      border: "1px solid #fca5a5",
                      borderRadius: "0.75rem",
                      padding: "1rem",
                    }}
                  >
                    <p style={{ fontWeight: 700, color: "#991b1b", marginBottom: "0.5rem", fontSize: "1rem" }}>
                      Czy na pewno chcesz wydać psa {selectedDog.name}?
                    </p>
                    <p style={{ color: "#7f1d1d", fontSize: "0.875rem", marginBottom: "1rem" }}>
                      Pies zostanie przeniesiony do archiwum. Tej operacji nie można cofnąć z poziomu aplikacji.
                    </p>
                    <div style={{ display: "flex", gap: "0.75rem" }}>
                      <button
                        onClick={handleReleaseDog}
                        disabled={releasingDog}
                        style={{
                          flex: 1,
                          padding: "0.75rem",
                          borderRadius: "0.75rem",
                          border: "none",
                          backgroundColor: "#dc2626",
                          color: "white",
                          fontWeight: 700,
                          fontSize: "1rem",
                          cursor: "pointer",
                          opacity: releasingDog ? 0.6 : 1,
                        }}
                      >
                        {releasingDog ? "Zapisywanie..." : "Tak, wydaj psa"}
                      </button>
                      <button
                        onClick={() => setShowReleaseConfirm(false)}
                        disabled={releasingDog}
                        style={{
                          flex: 1,
                          padding: "0.75rem",
                          borderRadius: "0.75rem",
                          border: "1px solid #d1d5db",
                          backgroundColor: "white",
                          color: "#374151",
                          fontWeight: 600,
                          fontSize: "1rem",
                          cursor: "pointer",
                        }}
                      >
                        Anuluj
                      </button>
                    </div>
                  </div>
                )}
                {releaseMsg && (
                  <p
                    style={{
                      marginTop: "0.75rem",
                      fontSize: "0.875rem",
                      fontWeight: 600,
                      color: releaseMsg.type === "success" ? "#166534" : "#991b1b",
                    }}
                  >
                    {releaseMsg.text}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
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

const SESSION_KEY = "schronisko_session";
const DOGS_CACHE_KEY = "schronisko_dogs_cache_v1";

// Cache listy psów — aplikacja otwiera się natychmiast z ostatnimi danymi,
// a świeże dociągają się w tle (Apps Script potrafi odpowiadać kilka sekund)
function loadDogsCache() {
  try {
    const raw = localStorage.getItem(DOGS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed?.dogs) || parsed.dogs.length === 0) return null;
    return parsed.dogs;
  } catch {
    return null;
  }
}

function saveDogsCache(dogs) {
  try {
    localStorage.setItem(DOGS_CACHE_KEY, JSON.stringify({ ts: Date.now(), dogs }));
  } catch {}
}

function saveSession(view, dog, from, pavilion, box) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({
      view,
      dog: dog ?? null,
      from: from ?? "home",
      pavilion: pavilion ?? null,
      box: box ?? null,
    }));
  } catch {}
}

function loadSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

const ShelterMapSystem = () => {
  const [dogs, setDogs] = useState(() => loadDogsCache() || []);
  const _session = loadSession();
  // Widoki boxes/dogs bez zapamiętanego pawilonu pokazywałyby "Pawilon null"
  const _sessionView = (() => {
    const v = _session?.view || "home";
    if ((v === "boxes" || v === "dogs") && !_session?.pavilion) return "home";
    return v;
  })();
  const [currentView, setCurrentView] = useState(_sessionView);
  const [dogCardFrom, setDogCardFrom] = useState(_session?.from || "home");
  const [selectedPavilion, setSelectedPavilion] = useState(_session?.pavilion ?? null);
  const [selectedBox, setSelectedBox] = useState(_session?.box ?? null);
  const [selectedDog, setSelectedDog] = useState(_session?.dog || null);
  const [searchTerm, setSearchTerm] = useState("");
  // Pełny spinner tylko przy pierwszym uruchomieniu (brak cache);
  // przy kolejnych — od razu widok, świeże dane w tle
  const [loading, setLoading] = useState(dogs.length === 0);
  const [loadError, setLoadError] = useState(false);
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
const isBehaviorystUser = String(currentUser?.email || "").toLowerCase() === BEHAVIORYST_ASSIGN_EMAIL;
const { role: shellRole, loading: shellRoleLoading } = useUserRole();

// Przywrócony widok wymagający uprawnień, których użytkownik nie ma,
// renderowałby pustą stronę bez nawigacji (np. po zmianie konta)
useEffect(() => {
  if (!authReady) return;
  if (currentView === "panel" && !isAdminUser) setCurrentView("home");
  if (currentView === "behaviorystPanel" && !isBehaviorystUser) setCurrentView("home");
  if (currentView === "walkReport" && !shellRoleLoading && !canViewWalkReport(shellRole)) setCurrentView("home");
}, [authReady, currentView, isAdminUser, isBehaviorystUser, shellRole, shellRoleLoading]);

const navRef = useRef({ currentView: "home", dogCardFrom: "home" });
useEffect(() => {
  navRef.current = { currentView, dogCardFrom };
  saveSession(currentView, selectedDog, dogCardFrom, selectedPavilion, selectedBox);
}, [currentView, dogCardFrom, selectedDog, selectedPavilion, selectedBox]);

const scrollPositions = useRef({});
const currentViewRef = useRef("home");
useEffect(() => { currentViewRef.current = currentView; }, [currentView]);

const navigateToView = useCallback((targetView) => {
  if (targetView === "dogCard") {
    scrollPositions.current[currentViewRef.current] = window.scrollY;
  }
  setCurrentView(targetView);
}, []);

useEffect(() => {
  if (currentView === "dogCard") {
    requestAnimationFrame(() => window.scrollTo(0, 0));
  } else {
    const y = scrollPositions.current[currentView] ?? 0;
    requestAnimationFrame(() => window.scrollTo(0, y));
  }
}, [currentView]);

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
    } else if (["map", "myDogs", "mapEditor", "sector"].includes(view)) {
      setCurrentView("home");
    } else if (view === "panel") {
      setCurrentView("home");
    } else if (view === "behaviorystPanel") {
      setCurrentView("home");
    } else if (view === "schedule" || view === "introWalk" || view === "walkTable") {
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
    // Spinner tylko gdy nie mamy nic do pokazania (brak cache) —
    // odświeżanie w tle nie może chować działającego widoku
    if (dogs.length === 0) setLoading(true);
    setLoadError(false);
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
          lastWalkType: dog?.lastWalkType || "spacer",
          weight: cleanText(dog?.weight),
          status: dog?.status || "dostępny",
          nieWydawacWlascicielowi: Boolean(dog?.nieWydawacWlascicielowi),
          kastracja: dog?.kastracja || "nie_kastrowany",
          kastracjaData: dog?.kastracjaData || "",
          kastracyjaPowod: dog?.kastracyjaPowod || "",
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
      saveDogsCache(normalizedDogs);
      setSelectedDog((prev) => {
        if (!prev) return prev;
        const fresh = normalizedDogs.find((d) => d.id === prev.id);
        return fresh || prev;
      });
      return normalizedDogs;
    } catch (error) {
      console.error("Błąd pobierania psów:", error);
      setLoadError(true);
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

    // Świadome zamknięcie okienka przez użytkownika to nie błąd —
    // nie przekierowujemy na pełnoekranowe logowanie ani nie straszymy komunikatem
    if (
      error?.code === "auth/popup-closed-by-user" ||
      error?.code === "auth/cancelled-popup-request"
    ) {
      return;
    }

    // Popup zablokowany przez przeglądarkę — spróbuj przez przekierowanie
    if (error?.code === "auth/popup-blocked") {
      try {
        await signInWithRedirect(auth, googleProvider);
        return;
      } catch (redirectError) {
        console.error("Błąd logowania Google przez przekierowanie:", redirectError);
      }
    }

    // Błędy konfiguracji — szczegóły do konsoli, wolontariusz dostaje prostą instrukcję
    if (
      error?.code === "auth/configuration-not-found" ||
      error?.code === "auth/unauthorized-domain"
    ) {
      setLoginError(
        "Logowanie jest chwilowo niedostępne z powodu błędu konfiguracji. Skontaktuj się z administratorem aplikacji."
      );
      return;
    }

    setLoginError(
      "Nie udało się zalogować przez Google. Sprawdź połączenie z internetem (i czy przeglądarka nie blokuje wyskakujących okienek), po czym spróbuj ponownie."
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
    navigateToView("dogCard");
  };

  const handleSurveySaved = async (dogId) => {
    const refreshedDogs = await fetchData();
    setSelectedDog((previousDog) => {
      if (!previousDog) return previousDog;
      return refreshedDogs.find((dog) => dog.id === dogId) || previousDog;
    });
  };

  // Dzisiejsze spacery z Firestore nakładane na listę psów — Home,
  // sortowanie po pilności i plakietki "X dni bez spaceru" widzą spacer
  // natychmiast, bez czekania na odświeżenie arkusza
  const [todayWalks, setTodayWalks] = useState({});
  useEffect(() => {
    if (!db || !currentUser) { setTodayWalks({}); return undefined; }
    let unsub = null;
    let currentDay = null;
    const subscribe = () => {
      const t = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Warsaw" }).format(new Date());
      if (t === currentDay) return;
      currentDay = t;
      if (unsub) unsub();
      unsub = fsOnSnapshot(
        fsDoc(db, "dailyWalks", t),
        (snap) => setTodayWalks(snap.data()?.walks || {}),
        () => {}
      );
    };
    subscribe();
    const interval = setInterval(subscribe, 60000);
    return () => {
      clearInterval(interval);
      if (unsub) unsub();
    };
  }, [currentUser]);

  const liveDogs = useMemo(() => {
    if (!Object.keys(todayWalks).length) return dogs;
    return dogs.map((d) => {
      const w = todayWalks[d.id];
      if (!w?.at) return d;
      // nowszy wpis z Firestore wygrywa ze starą datą z arkusza
      if (d.lastWalk && String(d.lastWalk) >= String(w.at)) return d;
      return {
        ...d,
        lastWalk: w.at,
        lastVolunteer: w.volunteerName || d.lastVolunteer,
        lastWalkType: w.type || "spacer",
      };
    });
  }, [dogs, todayWalks]);

  const myDogs = useMemo(() => liveDogs.filter((dog) => favoriteDogIds.has(dog.id)), [liveDogs, favoriteDogIds]);
  const behaviorystDogs = useMemo(() => liveDogs.filter((dog) => behaviorystDogIds.has(dog.id)), [liveDogs, behaviorystDogIds]);

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

          <details style={{ marginTop: "1rem", textAlign: "left" }}>
            <summary
              style={{
                cursor: "pointer",
                fontSize: "0.75rem",
                color: "#6b7280",
                textAlign: "center",
                listStyle: "none",
              }}
            >
              Logując się akceptujesz{" "}
              <span style={{ textDecoration: "underline", color: "#2563eb" }}>
                zasady przetwarzania danych
              </span>
            </summary>
            <div
              style={{
                marginTop: "0.75rem",
                padding: "0.75rem",
                borderRadius: "0.5rem",
                backgroundColor: "#f9fafb",
                fontSize: "0.7rem",
                lineHeight: 1.5,
                color: "#4b5563",
                maxHeight: "220px",
                overflowY: "auto",
              }}
            >
              <strong style={{ display: "block", marginBottom: "0.4rem", color: "#374151" }}>
                Informacja o przetwarzaniu danych osobowych
              </strong>
              Administratorem Twoich danych osobowych jest KTOZ im. Jadwigi Osuchowej – Schronisko
              dla Bezdomnych Zwierząt w Krakowie, ul. Rybna 3, 30-254 Kraków. Dane (adres e-mail,
              imię i nazwisko) są przetwarzane w celu umożliwienia korzystania z aplikacji do
              zarządzania opieką nad zwierzętami, na podstawie prawnie uzasadnionego interesu
              administratora (art. 6 ust. 1 lit. f RODO). Dane przechowywane są do czasu zakończenia
              współpracy ze schroniskiem lub do zgłoszenia sprzeciwu. Dane nie są udostępniane
              podmiotom trzecim, za wyjątkiem dostawców infrastruktury technicznej (Google). Masz
              prawo dostępu do danych, ich sprostowania, usunięcia, ograniczenia przetwarzania oraz
              wniesienia sprzeciwu. W razie pytań lub żądania usunięcia danych skontaktuj się z nami
              pod adresem{" "}
              <a href="mailto:aplikacja@schronisko.krakow.pl" style={{ color: "#2563eb" }}>
                aplikacja@schronisko.krakow.pl
              </a>
              . Przysługuje Ci prawo wniesienia skargi do Prezesa Urzędu Ochrony Danych Osobowych.
            </div>
          </details>
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

  if (loadError && dogs.length === 0) {
    return (
      <div style={styles.loadingContainer}>
        <div style={{ textAlign: "center", padding: "1rem" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>📡</div>
          <p style={{ fontSize: "1.05rem", color: "#374151", fontWeight: 600, marginBottom: "0.5rem" }}>
            Nie udało się pobrać listy psów
          </p>
          <p style={{ fontSize: "0.85rem", color: "#6b7280", marginBottom: "1.25rem" }}>
            Sprawdź połączenie z internetem i spróbuj ponownie
          </p>
          <button
            onClick={fetchData}
            style={{
              padding: "0.7rem 2rem", borderRadius: "0.75rem", border: "none",
              background: "#2563eb", color: "white", fontWeight: 700,
              fontSize: "0.95rem", cursor: "pointer",
            }}
          >
            Spróbuj ponownie
          </button>
        </div>
      </div>
    );
  }

  return (
    <RoleProvider currentUser={currentUser}>
      <InstallPrompt />
      {currentView !== "behaviorystPanel" && currentView !== "mapEditor" && (
        <TopBar
          currentView={currentView}
          onLogout={isAuthEnabled && currentUser ? handleLogout : null}
        />
      )}
      {!isAuthEnabled && (
        <div style={{ padding: "0.75rem 1rem", backgroundColor: "#fff7ed", color: "#9a3412", borderBottom: "1px solid #fdba74" }}>
          ⚠️ Firebase nie jest skonfigurowany (REACT_APP_FIREBASE_*). Logowanie Google oraz "Moje psy" będą nieaktywne.
        </div>
      )}
      {currentView === "home" && (
        <HomeView
          dogs={liveDogs}
          onDogClick={handleDogClickFromDashboard}
          hoveredCard={hoveredCard}
          setHoveredCard={setHoveredCard}
          setCurrentView={navigateToView}
          isAdmin={isAdminUser}
          isBehavioryst={isBehaviorystUser}
        />
      )}
      {currentView === "walkTable" && (
        <div style={{ padding: "0.5rem 0.75rem 5rem" }}>
          <WalkScheduleView
            dogs={liveDogs}
            currentUser={currentUser}
            isAdmin={isAdminUser}
          />
        </div>
      )}
      {currentView === "map" && (
        <MapView
          dogs={liveDogs}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          setSelectedPavilion={setSelectedPavilion}
          setCurrentView={navigateToView}
          setSelectedDog={setSelectedDog}
          setDogCardFrom={setDogCardFrom}
          hoveredCard={hoveredCard}
          setHoveredCard={setHoveredCard}
          isAdmin={isAdminUser}
          isBehavioryst={isBehaviorystUser}
        />
      )}
      {currentView === "boxes" && (
        <BoxesView
          dogs={liveDogs}
          selectedPavilion={selectedPavilion}
          setCurrentView={navigateToView}
          setSelectedBox={setSelectedBox}
          hoveredCard={hoveredCard}
          setHoveredCard={setHoveredCard}
          isAdmin={isAdminUser}
          isBehavioryst={isBehaviorystUser}
        />
      )}
      {currentView === "dogs" && (
        <DogsListView
          dogs={liveDogs}
          selectedPavilion={selectedPavilion}
          selectedBox={selectedBox}
          setCurrentView={navigateToView}
          setSelectedDog={setSelectedDog}
          setDogCardFrom={setDogCardFrom}
          hoveredCard={hoveredCard}
          setHoveredCard={setHoveredCard}
          isAdmin={isAdminUser}
          isBehavioryst={isBehaviorystUser}
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
          setCurrentView={navigateToView}
          setSelectedDog={setSelectedDog}
          setDogCardFrom={setDogCardFrom}
          hoveredCard={hoveredCard}
          setHoveredCard={setHoveredCard}
          authEnabled={isAuthEnabled}
          isAdmin={isAdminUser}
          isBehavioryst={isBehaviorystUser}
        />
      )}
      <Suspense fallback={<div style={{ padding: "2rem", textAlign: "center", color: "#6b7280" }}>Ładowanie...</div>}>
        {currentView === "mapEditor" && (
          <MapEditor onBack={() => setCurrentView("map")} />
        )}
        {currentView === "panel" && isAdminUser && (
          <AdminPanelView
            currentUser={currentUser}
            behaviorystDogs={behaviorystDogs}
            dogs={liveDogs}
            setCurrentView={navigateToView}
            setSelectedDog={setSelectedDog}
            setDogCardFrom={setDogCardFrom}
            hoveredCard={hoveredCard}
            setHoveredCard={setHoveredCard}
            onStartWork={handleStartBehaviorystWork}
            onRefreshDogs={fetchData}
          />
        )}
        {currentView === "behaviorystPanel" && isBehaviorystUser && (
          <BehaviorystPanel
            currentUser={currentUser}
            behaviorystDogs={behaviorystDogs}
            dogs={liveDogs}
            onToggleBehaviorystDog={handleToggleBehaviorystDog}
            setCurrentView={navigateToView}
            onLogout={handleLogout}
          />
        )}
      </Suspense>
      {currentView === "sector" && (
        <SectorView
          setCurrentView={navigateToView}
          setSelectedDog={setSelectedDog}
          setDogCardFrom={setDogCardFrom}
          currentUser={currentUser}
          isAdmin={isAdminUser}
          allDogs={liveDogs}
        />
      )}
      {currentView === "schedule" && (
        <ScheduleView
          currentUser={currentUser}
          isAdmin={isAdminUser}
        />
      )}
      {currentView === "walkReport" && (
        <WalkReportView
          currentUser={currentUser}
          onBack={() => navigateToView("home")}
        />
      )}
      {currentView === "introWalk" && (
        <IntroWalkView
          currentUser={currentUser}
          isAdmin={isAdminUser}
          dogs={liveDogs}
        />
      )}
      {!["behaviorystPanel", "mapEditor"].includes(currentView) && (!isAuthEnabled || currentUser) && (
        <AppNav
          currentView={currentView}
          onNavigate={navigateToView}
          isAdmin={isAdminUser}
          isBehavioryst={isBehaviorystUser}
        />
      )}
    </RoleProvider>
  );
};

export default ShelterMapSystem;
