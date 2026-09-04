import {
  collection, doc, getDocs, addDoc, setDoc, updateDoc, deleteDoc, deleteField,
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

// ─── Cele pracy z psem ───────────────────────────────────────────────────────
// dogTraining/{dogId}/goals/{id} — nad czym pracujemy z tym psem.

export async function fsGetGoals(dogId) {
  const snap = await getDocs(collection(db, "dogTraining", dogId, "goals"));
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (a.done === b.done ? 0 : a.done ? 1 : -1));
}

export async function fsAddGoal(dogId, text, currentUser) {
  return addDoc(collection(db, "dogTraining", dogId, "goals"), {
    text: String(text || "").trim().slice(0, 300),
    done: false,
    createdBy: currentUser?.uid || "",
    createdAt: serverTimestamp(),
  });
}

export async function fsUpdateGoal(dogId, goalId, patch) {
  return updateDoc(doc(db, "dogTraining", dogId, "goals", goalId), patch);
}

export async function fsDeleteGoal(dogId, goalId) {
  return deleteDoc(doc(db, "dogTraining", dogId, "goals", goalId));
}

// ─── Okres pracy z psem ──────────────────────────────────────────────────────
// startedAt zapisujemy przy dołączeniu psa, endedAt przy zakończeniu pracy.
// Obie daty trafiają do raportu miesięcznego.

export async function fsStartWork(dogId, dogName, currentUser) {
  return setDoc(
    doc(db, "dogTraining", dogId),
    {
      behavioristId: currentUser?.uid || "",
      dogName: dogName || "",
      status: "in_progress",
      startedAt: serverTimestamp(),
      endedAt: deleteField(),
    },
    { merge: true }
  );
}

export async function fsFinishWork(dogId, summary) {
  return setDoc(
    doc(db, "dogTraining", dogId),
    {
      status: "finished",
      endedAt: serverTimestamp(),
      finishSummary: String(summary || "").trim().slice(0, 1000),
    },
    { merge: true }
  );
}

// ─── Awans między poziomami ──────────────────────────────────────────────────
// Reguła jak w Doggycorp: pies awansuje, gdy osiągnął wymagany procent
// sukcesu w wymaganej liczbie DNI treningowych. Dni nie muszą być pod rząd.
// Drugi, gorszy trening tego samego dnia nie odbiera już zdobytego dnia.

export function dayKey(d = new Date()) {
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}

// Skuteczność sesji dla jednego ćwiczenia. W odróżnieniu od Doggycorp
// "częściowo" liczymy jako pół sukcesu — inaczej byłoby traktowane
// dokładnie tak samo jak porażka.
export function sessionSuccessRate(results) {
  const list = (results || []).filter((r) => r && r.result);
  if (list.length === 0) return 0;
  const score = list.reduce((sum, r) => {
    if (r.result === "sukces") return sum + 1;
    if (r.result === "częściowo") return sum + 0.5;
    return sum;
  }, 0);
  return Math.round((score / list.length) * 100);
}

export function checkStageProgression(stage, successRate, daysMet, sessionDay) {
  const prog = stage?.progression;
  const days = Array.isArray(daysMet) ? daysMet : [];
  if (!prog) return { advance: false, daysMet: days, requiredPct: null, requiredDays: null };

  const requiredPct = Number(prog.successPct ?? 80);
  const requiredDays = Number(prog.requiredDays ?? 3);
  const today = sessionDay || dayKey();

  const metToday = successRate >= requiredPct;
  const alreadyCounted = days.includes(today);

  let updated = days.filter((d) => d !== today);
  if (metToday || alreadyCounted) updated = [...updated, today];
  updated = updated.slice(-60);

  return {
    advance: updated.length >= requiredDays,
    daysMet: updated,
    requiredPct,
    requiredDays,
  };
}

export { LIBRARY_SEED };
