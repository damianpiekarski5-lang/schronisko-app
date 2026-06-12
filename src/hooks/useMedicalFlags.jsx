import { useState, useEffect, useCallback } from "react";

const EMPTY_FLAG = { active: false, pending: false, note: "", validUntil: null, validFrom: null, createdBy: "" };

function parseFlag(f) {
  if (!f) return EMPTY_FLAG;
  const now = new Date();
  const validFrom = f.validFrom ? new Date(f.validFrom) : null;
  const validUntil = f.validUntil ? new Date(f.validUntil) : null;
  const started = !validFrom || validFrom <= now;
  const notExpired = !validUntil || validUntil > now;
  return {
    active: started && notExpired,
    pending: !started,
    note: f.note || "",
    validUntil,
    validFrom,
    createdBy: f.createdBy || "",
  };
}

const EMPTY_RAW = { noFood: null, walkBlocked: null, próbkaKału: null, pobranieKrwi: null, zakropienieOczu: null, inne: null };

export default function useMedicalFlags(dogId) {
  const [raw, setRaw] = useState(EMPTY_RAW);
  const [loading, setLoading] = useState(true);

  const fetchFlags = useCallback(async () => {
    if (!dogId) {
      setRaw(EMPTY_RAW);
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`/api/gs?action=getMedicalFlags&dogId=${encodeURIComponent(dogId)}`);
      const result = await res.json();
      if (result?.ok && result?.data) setRaw(result.data);
    } catch {}
    setLoading(false);
  }, [dogId]);

  useEffect(() => {
    setLoading(true);
    setRaw(EMPTY_RAW);
    fetchFlags();
    const id = setInterval(() => {
      if (document.visibilityState === "visible") fetchFlags();
    }, 60000);
    return () => clearInterval(id);
  }, [fetchFlags]);

  return {
    noFood: parseFlag(raw.noFood),
    walkBlocked: parseFlag(raw.walkBlocked),
    próbkaKału: parseFlag(raw.próbkaKału),
    pobranieKrwi: parseFlag(raw.pobranieKrwi),
    zakropienieOczu: parseFlag(raw.zakropienieOczu),
    inne: parseFlag(raw.inne),
    loading,
    refresh: fetchFlags,
  };
}
