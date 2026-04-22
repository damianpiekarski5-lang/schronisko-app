import { initializeApp } from "firebase/app";
import {
  GoogleAuthProvider,
  browserLocalPersistence,
  getAuth,
  setPersistence,
} from "firebase/auth";

const getEnvValue = (...keys) => {
  for (const key of keys) {
    const value = process.env[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return "";
};

const firebaseConfig = {
  apiKey: getEnvValue("REACT_APP_FIREBASE_API_KEY", "FIREBASE_API_KEY"),
  authDomain: getEnvValue("REACT_APP_FIREBASE_AUTH_DOMAIN", "FIREBASE_AUTH_DOMAIN"),
  projectId: getEnvValue("REACT_APP_FIREBASE_PROJECT_ID", "FIREBASE_PROJECT_ID"),
  appId: getEnvValue("REACT_APP_FIREBASE_APP_ID", "FIREBASE_APP_ID"),
};

export const hasFirebaseConfig = Object.values(firebaseConfig).every(
  (value) => typeof value === "string" && value.trim().length > 0
);

export let auth = null;
export let googleProvider = null;
export let firebaseInitError = null;

if (hasFirebaseConfig) {
  try {
    const app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    googleProvider = new GoogleAuthProvider();

    setPersistence(auth, browserLocalPersistence).catch((error) => {
      console.error("Nie udało się ustawić trwałej sesji Firebase:", error);
    });
  } catch (error) {
    firebaseInitError = error;
    console.error("Błąd inicjalizacji Firebase:", error);
  }
}
