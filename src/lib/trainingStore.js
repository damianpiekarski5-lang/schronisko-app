import {
  collection, doc, getDocs, addDoc, setDoc, updateDoc,
  serverTimestamp, writeBatch, query, where,
} from "firebase/firestore";
import { db } from "../firebase";
import LIBRARY_SEED from "../data/exerciseLibrary.json";

// Ćwiczenia treningowe — model rozszerzony o materiał instruktażowy:
// instrukcje krok po kroku, kryterium sukcesu, częste błędy, wideo oraz
// opcjonalne etapy (stages) z własnymi instrukcjami.
//
// Ćwiczenie psa: dogTraining/{dogId}/exercises/{id}
// Biblioteka:    exercises/{id}

export const EMPTY_EXERCISE = {
  name: "",
  category: "",
  difficulty: "",
  description: "",
  durationMinutes: 0,
  instructions: [],
  successCriteria: "",
  commonMistakes: [],
  tags: [],
  vimeoId: "",
  stages: [],
};

// Odsiewa pola spoza modelu i normalizuje typy — do Firestore nie trafia
// undefined ani przypadkowe pola z formularza.
export function normalizeExercise(raw) {
  // Uwaga: String(null) daje "null", więc puste wartości odsiewamy PRZED konwersją.
  const arr = (v) => (Array.isArray(v)
    ? v.filter((x) => x !== null && x !== undefined).map((x) => String(x).trim()).filter(Boolean)
    : []);
  const out = {
    name: String(raw?.name || "").trim(),
    category: String(raw?.category || "").trim(),
    difficulty: String(raw?.difficulty || "").trim(),
    description: String(raw?.description || "").trim(),
    durationMinutes: Number(raw?.durationMinutes) || 0,
    instructions: arr(raw?.instructions),
    successCriteria: String(raw?.successCriteria || "").trim(),
    commonMistakes: arr(raw?.commonMistakes),
    tags: arr(raw?.tags),
    vimeoId: String(raw?.vimeoId || "").trim(),
  };
  const stages = Array.isArray(raw?.stages) ? raw.stages : [];
  if (stages.length) {
    out.stages = stages.map((s, i) => ({
      order: Number(s?.order ?? i),
      name: String(s?.name || `Poziom ${i + 1}`).trim(),
      description: String(s?.description || "").trim(),
      instructions: arr(s?.instructions),
      successCriteria: String(s?.successCriteria || "").trim(),
      commonMistakes: arr(s?.commonMistakes),
      durationMinutes: Number(s?.durationMinutes) || 0,
      vimeoId: String(s?.vimeoId || "").trim(),
      progression: {
        successPct: Number(s?.progression?.successPct ?? 80),
        requiredDays: Number(s?.progression?.requiredDays ?? 3),
      },
    }));
  }
  return out;
}

// Etap, na którym pies aktualnie pracuje. Bez etapów zwraca null,
// wtedy materiał brany jest wprost z ćwiczenia.
export function activeStage(exercise, progress) {
  const stages = exercise?.stages;
  if (!Array.isArray(stages) || stages.length === 0) return null;
  const idx = Math.min(Math.max(Number(progress?.currentStage) || 0, 0), stages.length - 1);
  return { ...stages[idx], index: idx, total: stages.length };
}

// Materiał do pokazania: etap ma pierwszeństwo, ale puste pola etapu
// uzupełniamy z ćwiczenia, żeby nie było pustych sekcji.
export function exerciseContent(exercise, stage) {
  if (!stage) {
    return {
      description: exercise?.description || "",
      instructions: exercise?.instructions || [],
      successCriteria: exercise?.successCriteria || "",
      commonMistakes: exercise?.commonMistakes || [],
      vimeoId: exercise?.vimeoId || "",
      durationMinutes: exercise?.durationMinutes || 0,
    };
  }
  return {
    description: stage.description || exercise?.description || "",
    instructions: stage.instructions?.length ? stage.instructions : (exercise?.instructions || []),
    successCriteria: stage.successCriteria || exercise?.successCriteria || "",
    commonMistakes: stage.commonMistakes?.length ? stage.commonMistakes : (exercise?.commonMistakes || []),
    vimeoId: stage.vimeoId || exercise?.vimeoId || "",
    durationMinutes: stage.durationMinutes || exercise?.durationMinutes || 0,
  };
}

// Vimeo bywa wklejane jako sam numer albo pełny adres, także prywatny
// (vimeo.com/ID/HASH). Wyciągamy ID i opcjonalny hash.
export function vimeoEmbedUrl(raw) {
  const s = String(raw || "").trim();
  if (!s) return "";
  const id = (s.match(/\d{6,}/) || [])[0];
  if (!id) return "";
  const hash = (s.match(/[?&]h=([0-9a-zA-Z]+)/) || [])[1]
    || (s.match(new RegExp(`${id}/([0-9a-zA-Z]{6,})`)) || [])[1]
    || "";
  const q = `title=0&byline=0&portrait=0${hash ? `&h=${hash}` : ""}`;
  return `https://player.vimeo.com/video/${id}?${q}`;
}

export async function fsUpdateDogExercise(dogId, exId, data) {
  return updateDoc(doc(db, "dogTraining", dogId, "exercises", exId), normalizeExercise(data));
}

// Ręczna zmiana etapu przez behawiorystę. Licznik dni zaliczonych zerujemy,
// bo dotyczył poprzedniego poziomu.
export async function fsSetCurrentStage(dogId, exId, stageIndex, exerciseName) {
  return setDoc(
    doc(db, "dogTraining", dogId, "progress", exId),
    {
      exerciseId: exId,
      exerciseName: exerciseName || "",
      currentStage: Number(stageIndex) || 0,
      stageDaysMet: [],
      lastUpdated: serverTimestamp(),
    },
    { merge: true }
  );
}

export const LIBRARY_SIZE = LIBRARY_SEED.length;

// Import biblioteki — pomija ćwiczenia o nazwie, która już istnieje,
// więc można go uruchomić ponownie bez tworzenia duplikatów.
export async function importLibrarySeed(currentUser, onProgress) {
  if (!db) throw new Error("Firestore nie jest skonfigurowany");

  const snap = await getDocs(collection(db, "exercises"));
  const existing = new Set(snap.docs.map((d) => String(d.data()?.name || "").trim().toLowerCase()));

  const toAdd = LIBRARY_SEED.filter((e) => !existing.has(e.name.trim().toLowerCase()));
  if (toAdd.length === 0) return { added: 0, skipped: LIBRARY_SEED.length };

  // Firestore ogranicza batch do 500 operacji.
  const CHUNK = 400;
  let added = 0;
  for (let i = 0; i < toAdd.length; i += CHUNK) {
    const batch = writeBatch(db);
    toAdd.slice(i, i + CHUNK).forEach((e) => {
      batch.set(doc(collection(db, "exercises")), {
        ...normalizeExercise(e),
        createdBy: currentUser?.uid || "",
        createdAt: serverTimestamp(),
      });
    });
    await batch.commit();
    added += Math.min(CHUNK, toAdd.length - i);
    if (onProgress) onProgress(added, toAdd.length);
  }
  return { added, skipped: LIBRARY_SEED.length - toAdd.length };
}

// Kopia z biblioteki do psa — przenosimy pełną treść, żeby dało się ją
// potem zmienić pod konkretnego psa bez ruszania biblioteki.
export async function fsCopyLibraryExerciseToDog(dogId, libraryExercise, currentUser) {
  return addDoc(collection(db, "dogTraining", dogId, "exercises"), {
    ...normalizeExercise(libraryExercise),
    libraryId: libraryExercise.id || "",
    createdBy: currentUser?.uid || "",
    createdAt: serverTimestamp(),
  });
}

export async function fsCountLibrary() {
  const snap = await getDocs(query(collection(db, "exercises")));
  return snap.size;
}

export { LIBRARY_SEED };
