// Magazyn spacerów: Firestore (dokumenty per dzień) jest źródłem prawdy
// dla widoku tabeli; Arkusz Google pozostaje archiwum (zapis w tle z kolejką
// ponawiania w localStorage — działa też przy słabym zasięgu).

import {
  collection,
  doc,
  documentId,
  onSnapshot,
  query,
  where,
  setDoc,
  deleteField,
} from "firebase/firestore";
import { db } from "../firebase";

const QUEUE_KEY = "walkSheetQueue";
const POLAND_TZ = "Europe/Warsaw";

function nowPolandText() {
  const d = new Date();
  const date = new Intl.DateTimeFormat("sv-SE", { timeZone: POLAND_TZ }).format(d);
  const time = d.toLocaleTimeString("pl-PL", {
    hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: POLAND_TZ, hour12: false,
  });
  return `${date} ${time}`;
}

// ---------- Firestore: dokumenty dzienne ----------

// Subskrypcja dokumentów dziennych w zakresie dat.
// cb otrzymuje mapę { "YYYY-MM-DD": { dogId: {volunteerId, volunteerName, type, at} } }
export function subscribeDailyWalks(startDate, endDate, cb, errCb) {
  const q = query(
    collection(db, "dailyWalks"),
    where(documentId(), ">=", startDate),
    where(documentId(), "<=", endDate)
  );
  return onSnapshot(
    q,
    (snap) => {
      const result = {};
      snap.forEach((d) => {
        result[d.id] = d.data()?.walks || {};
      });
      cb(result);
    },
    (error) => {
      console.error("Błąd subskrypcji dailyWalks:", error);
      if (errCb) errCb(error);
    }
  );
}

export async function recordWalkFs(dateStr, dog, currentUser, typ = "spacer") {
  await setDoc(
    doc(db, "dailyWalks", dateStr),
    {
      walks: {
        [dog.id]: {
          volunteerId: currentUser.uid,
          volunteerName: currentUser.displayName || currentUser.email || "Wolontariusz",
          type: typ,
          at: nowPolandText(),
        },
      },
    },
    { merge: true }
  );
}

export async function undoWalkFs(dateStr, dogId) {
  // setDoc+merge zamiast updateDoc — nie rzuca not-found,
  // gdy dokument dnia jeszcze nie istnieje
  await setDoc(
    doc(db, "dailyWalks", dateStr),
    { walks: { [dogId]: deleteField() } },
    { merge: true }
  );
}

// ---------- Arkusz: zapis w tle + kolejka ponawiania ----------

function readQueue() {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
  } catch {
    return [];
  }
}

function writeQueue(items) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(items));
  } catch {}
}

export function pendingSheetSyncCount() {
  return readQueue().length;
}

async function postToSheet(item, currentUser) {
  const token = await currentUser.getIdToken();
  const res = await fetch("/api/gs", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(item.body),
  });
  const result = await res.json().catch(() => null);
  if (!res.ok || !result?.ok) {
    throw new Error(result?.error || `Błąd zapisu do arkusza (HTTP ${res.status})`);
  }
}

// Zapis spaceru do arkusza; przy niepowodzeniu ląduje w kolejce.
// Zwraca true = zapisano od razu, false = w kolejce (spróbujemy później).
export async function syncWalkToSheet(dog, typ, currentUser) {
  const item = {
    id: `${dog.id}_${Date.now()}`,
    body: {
      action: "recordWalk",
      dogId: dog.id,
      dogName: dog.name,
      notes: "",
      typ,
      walkAt: nowPolandText(),
    },
  };
  try {
    await postToSheet(item, currentUser);
    return true;
  } catch (e) {
    console.warn("Zapis do arkusza w kolejce:", e?.message);
    writeQueue([...readQueue(), item]);
    return false;
  }
}

// Cofnięcie spaceru w arkuszu (tylko dzisiejszy — backend to wymusza).
export async function syncUndoToSheet(dogId, dateStr, currentUser) {
  const item = {
    id: `undo_${dogId}_${Date.now()}`,
    body: { action: "deleteWalk", dogId, date: dateStr },
  };
  try {
    await postToSheet(item, currentUser);
    return true;
  } catch (e) {
    console.warn("Cofnięcie w arkuszu w kolejce:", e?.message);
    writeQueue([...readQueue(), item]);
    return false;
  }
}

// Ponów zaległe zapisy (wywoływane przy starcie i po powrocie online).
let flushing = false;
export async function flushSheetQueue(currentUser) {
  if (flushing || !currentUser) return;
  const queue = readQueue();
  if (queue.length === 0) return;
  flushing = true;
  try {
    const remaining = [];
    for (const item of queue) {
      try {
        await postToSheet(item, currentUser);
      } catch {
        remaining.push(item);
      }
    }
    writeQueue(remaining);
  } finally {
    flushing = false;
  }
}
