import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  onSnapshot, query, where, serverTimestamp, Timestamp,
} from "firebase/firestore";
import { db } from "../firebase";

// Obecność wolontariusza w schronisku — „jestem" / „kończę".
// Kolekcja: attendance/{autoId}
//   volunteerId, volunteerName, startAt, endAt (null = trwa), date, month
//
// Zapytania używają wyłącznie równości (volunteerId + endAt / month), więc
// nie wymagają indeksów złożonych w Firestore.

const COLLECTION = "attendance";

// Zapomniane zakończenie wizyty nie może zawyżać miesięcznego licznika.
// Wizyta dłuższa niż tyle godzin liczy się do sumy jako dokładnie tyle.
export const MAX_VISIT_HOURS = 12;

export function toDate(ts) {
  if (!ts) return null;
  return ts instanceof Timestamp ? ts.toDate() : new Date(ts);
}

export function dayKey(d = new Date()) {
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}

export function monthKey(d = new Date()) {
  return dayKey(d).slice(0, 7);
}

// Czas trwania w minutach. Wizyta trwająca liczona jest do teraz.
export function visitMinutes(visit, now = Date.now()) {
  const start = toDate(visit?.startAt);
  if (!start) return 0;
  const end = toDate(visit?.endAt);
  const ms = (end ? end.getTime() : now) - start.getTime();
  if (!isFinite(ms) || ms < 0) return 0;
  return Math.floor(ms / 60000);
}

// Minuty zaliczane do sumy miesięcznej — z ograniczeniem MAX_VISIT_HOURS.
export function countedMinutes(visit, now = Date.now()) {
  return Math.min(visitMinutes(visit, now), MAX_VISIT_HOURS * 60);
}

export function isCapped(visit, now = Date.now()) {
  return visitMinutes(visit, now) > MAX_VISIT_HOURS * 60;
}

export function formatMinutes(min) {
  const m = Math.max(0, Math.round(min));
  const h = Math.floor(m / 60);
  const rest = m % 60;
  if (h === 0) return `${rest} min`;
  if (rest === 0) return `${h} godz`;
  return `${h} godz ${rest} min`;
}

export function formatClock(ts) {
  const d = toDate(ts);
  if (!d) return "—";
  return d.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" });
}

// Trwająca wizyta zalogowanego użytkownika (jeśli jest).
export function subscribeOpenVisit(uid, onChange, onError) {
  if (!db || !uid) return () => {};
  const q = query(
    collection(db, COLLECTION),
    where("volunteerId", "==", uid),
    where("endAt", "==", null)
  );
  return onSnapshot(
    q,
    (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      // Przy dublach (np. dwa urządzenia) bierzemy najwcześniejszą.
      rows.sort((a, b) => (toDate(a.startAt)?.getTime() || 0) - (toDate(b.startAt)?.getTime() || 0));
      onChange(rows[0] || null);
    },
    (e) => { if (onError) onError(e); }
  );
}

// Wizyty użytkownika w danym miesiącu ("YYYY-MM").
export function subscribeMonthVisits(uid, month, onChange, onError) {
  if (!db || !uid || !month) return () => {};
  const q = query(
    collection(db, COLLECTION),
    where("volunteerId", "==", uid),
    where("month", "==", month)
  );
  return onSnapshot(
    q,
    (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      rows.sort((a, b) => (toDate(b.startAt)?.getTime() || 0) - (toDate(a.startAt)?.getTime() || 0));
      onChange(rows);
    },
    (e) => { if (onError) onError(e); }
  );
}

export async function startVisit(currentUser) {
  if (!db) throw new Error("Firestore nie jest skonfigurowany");
  if (!currentUser?.uid) throw new Error("Brak zalogowanego użytkownika");
  const now = new Date();
  return addDoc(collection(db, COLLECTION), {
    volunteerId: currentUser.uid,
    volunteerName: currentUser.displayName || "Wolontariusz",
    startAt: serverTimestamp(),
    endAt: null,
    date: dayKey(now),
    month: monthKey(now),
  });
}

export async function endVisit(visitId) {
  if (!db) throw new Error("Firestore nie jest skonfigurowany");
  if (!visitId) throw new Error("Brak wizyty do zakończenia");
  return updateDoc(doc(db, COLLECTION, visitId), { endAt: serverTimestamp() });
}

// Wpis omyłkowy — usuwany tylko przez autora.
export async function deleteVisit(visitId) {
  if (!db) throw new Error("Firestore nie jest skonfigurowany");
  return deleteDoc(doc(db, COLLECTION, visitId));
}
