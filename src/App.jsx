diff --git a/src/App.jsx b/src/App.jsx
index 56c971c9534179a443ca2a7e2f4c77ff62b0b9a7..0d39431ccd2ffa8959147b047894c24dcf2d232b 100644
--- a/src/App.jsx
+++ b/src/App.jsx
@@ -29,50 +29,52 @@ import {
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
 
+const BEHAVIORYST_ASSIGN_EMAIL = "damian.piekarski5@gmail.com";
+
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
@@ -1549,61 +1551,71 @@ const MyDogsView = ({ myDogs, setCurrentView, setSelectedDog, hoveredCard, setHo
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
+  behaviorystDogIds,
+  onToggleBehaviorystDog,
+  behaviorystActionState,
   isAdmin,
 }) => {
   const [showSurvey, setShowSurvey] = useState(false);
   const [showBehaviorReport, setShowBehaviorReport] = useState(false);
 
   if (!selectedDog) return null;
 
   const formattedLastWalk = formatLastWalkDate(selectedDog.lastWalk);
   const isFavorite = favoriteDogIds.has(selectedDog.id);
   const isFavoriteToggleInProgress =
     favoriteActionState?.loading && favoriteActionState?.dogId === selectedDog.id;
+  const isBehaviorystOwner =
+    String(currentUser?.email || "").toLowerCase() === BEHAVIORYST_ASSIGN_EMAIL;
+  const behaviorystIds = behaviorystDogIds instanceof Set ? behaviorystDogIds : new Set();
+  const behaviorystState = behaviorystActionState || { loading: false, dogId: "", error: "" };
+  const isBehaviorystDog = behaviorystIds.has(selectedDog.id);
+  const isBehaviorystToggleInProgress =
+    behaviorystState.loading && behaviorystState.dogId === selectedDog.id;
 
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
@@ -1652,85 +1664,122 @@ const DogCardView = ({
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
+            {behaviorystState.error && isBehaviorystOwner && (
+              <div
+                style={{
+                  marginBottom: "1rem",
+                  padding: "0.75rem",
+                  borderRadius: "0.75rem",
+                  backgroundColor: "#fee2e2",
+                  color: "#991b1b",
+                  fontSize: "0.875rem",
+                }}
+              >
+                {behaviorystState.error}
+              </div>
+            )}
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
+            {isBehaviorystOwner && (
+              <button
+                onClick={() => onToggleBehaviorystDog(selectedDog.id)}
+                disabled={!currentUser || isBehaviorystToggleInProgress}
+                style={{
+                  ...styles.walkButton,
+                  backgroundColor: isBehaviorystDog ? "#16a34a" : "#2563eb",
+                  boxShadow: isBehaviorystDog
+                    ? "0 2px 4px rgba(22, 163, 74, 0.3)"
+                    : "0 2px 4px rgba(37, 99, 235, 0.3)",
+                  ...((!currentUser || isBehaviorystToggleInProgress)
+                    ? styles.walkButtonDisabled
+                    : {}),
+                }}
+              >
+                <Star size={24} style={{ marginRight: "0.75rem" }} />
+                {isBehaviorystToggleInProgress
+                  ? "Zapisywanie..."
+                  : isBehaviorystDog
+                  ? "Odłącz z panelu behawiorysty"
+                  : "Rozpocznij pracę"}
+              </button>
+            )}
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
@@ -1866,74 +1915,82 @@ const DogCardView = ({
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
+const [behaviorystDogIds, setBehaviorystDogIds] = useState(new Set());
+const [behaviorystActionState, setBehaviorystActionState] = useState({
+  loading: false,
+  dogId: "",
+  error: "",
+});
 
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
+    setBehaviorystDogIds(new Set());
     return undefined;
   }
 
   const unsub = onAuthStateChanged(auth, async (user) => {
     setCurrentUser(user || null);
     setAuthReady(true);
     setLoginError("");
     if (user) {
-      await fetchMyDogs(user);
+      await Promise.all([fetchMyDogs(user), fetchBehaviorystDogs(user)]);
     } else {
       setFavoriteDogIds(new Set());
+      setBehaviorystDogIds(new Set());
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
@@ -1966,87 +2023,151 @@ useEffect(() => {
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
 
+
+  const fetchBehaviorystDogs = async (user = currentUser) => {
+    if (!user) {
+      setBehaviorystDogIds(new Set());
+      return;
+    }
+
+    try {
+      const token = await user.getIdToken();
+      const response = await fetch("/api/gs", {
+        method: "POST",
+        headers: {
+          "Content-Type": "application/json",
+          Authorization: `Bearer ${token}`,
+        },
+        body: JSON.stringify({ action: "getBehaviorystDogs" }),
+      });
+      const result = await response.json();
+      if (response.ok && result?.ok === true && Array.isArray(result?.data)) {
+        setBehaviorystDogIds(new Set(result.data.map((dog) => cleanText(dog?.id))));
+      }
+    } catch (error) {
+      console.error("Błąd pobierania psów panelu behawiorysty:", error);
+    }
+  };
+
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
 
+
+  const handleToggleBehaviorystDog = async (dogId) => {
+    if (!currentUser || !dogId) return;
+
+    setBehaviorystActionState({ loading: true, dogId, error: "" });
+
+    try {
+      const token = await currentUser.getIdToken();
+      const response = await fetch("/api/gs", {
+        method: "POST",
+        headers: {
+          "Content-Type": "application/json",
+          Authorization: `Bearer ${token}`,
+        },
+        body: JSON.stringify({ action: "toggleBehaviorystDog", dogId }),
+      });
+      const result = await response.json();
+      if (response.ok && result?.ok === true) {
+        await fetchBehaviorystDogs(currentUser);
+        setBehaviorystActionState({ loading: false, dogId: "", error: "" });
+        return;
+      }
+
+      setBehaviorystActionState({
+        loading: false,
+        dogId: "",
+        error: result?.error || "Nie udało się zapisać zmiany w panelu behawiorysty.",
+      });
+    } catch (error) {
+      console.error("Błąd przypisywania psa do panelu behawiorysty:", error);
+      setBehaviorystActionState({
+        loading: false,
+        dogId: "",
+        error: "Wystąpił błąd połączenia podczas zapisywania. Spróbuj ponownie.",
+      });
+    }
+  };
+
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
@@ -2192,50 +2313,53 @@ const handleLogin = async () => {
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
+          behaviorystDogIds={behaviorystDogIds}
+          onToggleBehaviorystDog={handleToggleBehaviorystDog}
+          behaviorystActionState={behaviorystActionState}
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
           dogs={dogs}
           setCurrentView={setCurrentView}
         />
       )}
     </>
   );
 };
 
