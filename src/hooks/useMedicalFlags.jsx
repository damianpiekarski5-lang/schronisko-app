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

export default function useMedicalFlags(dogId) {
  const [raw, setRaw] = useState({ noFood: null, walkBlocked: null });
  const [loading, setLoading] = useState(true);

  const fetchFlags = useCallback(async () => {
    if (!dogId) {
      setRaw({ noFood: null, walkBlocked: null });
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
    setRaw({ noFood: null, walkBlocked: null });
    fetchFlags();
    const id = setInterval(fetchFlags, 60000);
    return () => clearInterval(id);
  }, [fetchFlags]);

  return {
    noFood: parseFlag(raw.noFood),
    walkBlocked: parseFlag(raw.walkBlocked),
    loading,
    refresh: fetchFlags,
  };
}
