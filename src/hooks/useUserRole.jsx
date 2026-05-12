import React, { createContext, useContext, useEffect, useState } from "react";

const RoleContext = createContext(null);

const CACHE_KEY = "schronisko_role_cache";

function getCachedRole(uid) {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { userId, role } = JSON.parse(raw);
    return userId === uid ? role : null;
  } catch {
    return null;
  }
}

function setCachedRole(uid, role) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ userId: uid, role }));
  } catch {}
}

export function RoleProvider({ currentUser, children }) {
  const cachedRole = currentUser ? getCachedRole(currentUser.uid) : null;
  const [role, setRole] = useState(cachedRole);
  const [loading, setLoading] = useState(!cachedRole);

  useEffect(() => {
    if (!currentUser) {
      setRole(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const fetchRole = async () => {
      if (!cachedRole) setLoading(true);
      try {
        const token = await currentUser.getIdToken();
        const res = await fetch("/api/gs", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ action: "getUserRole" }),
        });
        const result = await res.json();
        if (!cancelled) {
          const fetched = result?.ok && result?.data?.role ? result.data.role : "volunteer";
          setRole(fetched);
          setCachedRole(currentUser.uid, fetched);
        }
      } catch {
        if (!cancelled && !cachedRole) setRole("volunteer");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchRole();
    return () => { cancelled = true; };
  }, [currentUser]); // eslint-disable-line

  const value = {
    role: role ?? "volunteer",
    loading,
    isAdmin: role === "admin",
    isStaff: role === "staff" || role === "admin",
    isAmbulatorium: role === "ambulatorium" || role === "admin",
    isVolunteer: !role || role === "volunteer",
  };

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useUserRole() {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error("useUserRole musi być użyty wewnątrz RoleProvider");
  return ctx;
}
