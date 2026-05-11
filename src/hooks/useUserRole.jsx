import React, { createContext, useContext, useEffect, useState } from "react";

const RoleContext = createContext(null);

export function RoleProvider({ currentUser, children }) {
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) {
      setRole(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const fetchRole = async () => {
      setLoading(true);
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
          setRole(result?.ok && result?.data?.role ? result.data.role : "volunteer");
        }
      } catch {
        if (!cancelled) setRole("volunteer");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchRole();
    return () => { cancelled = true; };
  }, [currentUser]);

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
