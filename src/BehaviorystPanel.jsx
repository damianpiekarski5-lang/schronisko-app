import React, { useMemo, useState } from "react";
import { ArrowLeft, RefreshCw, Search, Star } from "lucide-react";
import { behaviorystApi } from "./api/behawiorystaApi";

const sectionStyle = { background: "white", borderRadius: 12, border: "1px solid #e5e7eb", padding: 12, marginBottom: 12 };
const searchCardStyle = {
  backgroundColor: "white",
  border: "2px solid #e5e7eb",
  borderRadius: "1rem",
  padding: "1.25rem",
  marginBottom: "1rem",
};

const BEHAVIORYST_ASSIGN_EMAIL = "damian.piekarski5@gmail.com";

const BehaviorystPanel = ({ cache, onRefresh, onOpenDog, getIdToken, onBackToVolunteer, currentUser }) => {
  const [search, setSearch] = useState("");
  const [workDogIds, setWorkDogIds] = useState(new Set());
  const [assigningDogId, setAssigningDogId] = useState("");

  const psy = cache?.psy || [];
  const canAssign = String(currentUser?.email || "").toLowerCase() === BEHAVIORYST_ASSIGN_EMAIL;

  React.useEffect(() => {
    const loadWorkDogs = async () => {
      if (!currentUser) {
        setWorkDogIds(new Set());
        return;
      }

      const result = await behaviorystApi.getBehaviorystDogs(getIdToken);
      if (result.ok && Array.isArray(result.data)) {
        setWorkDogIds(new Set(result.data.map((dog) => String(dog?.id || ""))));
      }
    };

    loadWorkDogs();
  }, [currentUser, getIdToken]);

  const workDogs = useMemo(
    () => psy.filter((dog) => workDogIds.has(String(dog.idPsa || dog.id || ""))),
    [psy, workDogIds]
  );

  const filteredDogs = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return workDogs;

    return workDogs.filter((dog) => {
      const id = String(dog.idPsa || dog.id || "").toLowerCase();
      const imie = String(dog.imie || dog.name || "").toLowerCase();
      const pawilon = String(dog.pawilon || dog.pavilion || "").toLowerCase();
      const nrBoksu = String(dog.nrBoksu || dog.box || "").toLowerCase();
      return id.includes(term) || imie.includes(term) || pawilon.includes(term) || nrBoksu.includes(term);
    });
  }, [search, workDogs]);

  const handleAssignDogToWork = async (dogId) => {
    if (!dogId || !canAssign || assigningDogId) return;

    setAssigningDogId(String(dogId));
    const result = await behaviorystApi.toggleBehaviorystDog(dogId, getIdToken);

    if (result.ok) {
      const refreshed = await behaviorystApi.getBehaviorystDogs(getIdToken);
      if (refreshed.ok && Array.isArray(refreshed.data)) {
        setWorkDogIds(new Set(refreshed.data.map((dog) => String(dog?.id || ""))));
      }
      onRefresh?.();
    }

    setAssigningDogId("");
  };

  return (
    <div style={{ padding: 12, paddingBottom: 90 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 8 }}>
        <button
          onClick={onBackToVolunteer}
          style={{ border: "1px solid #d1d5db", background: "white", borderRadius: 999, padding: "0.45rem 0.8rem", display: "flex", alignItems: "center", gap: 6 }}
        >
          <ArrowLeft size={16} /> Wróć do wolontariuszy
        </button>
        <button onClick={onRefresh} style={{ border: "1px solid #d1d5db", background: "white", borderRadius: 999, padding: "0.45rem 0.8rem", display: "flex", alignItems: "center", gap: 6 }}><RefreshCw size={16} /> Odśwież</button>
      </div>

      <div style={{ ...sectionStyle, position: "sticky", top: 8, zIndex: 5 }}>
        <h3 style={{ marginTop: 0, marginBottom: 8 }}>Psy do pracy behawiorysty</h3>
        <div style={{ position: "relative" }}>
          <Search size={18} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#6b7280" }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Szukaj po imieniu, ID, pawilonie lub boksie"
            style={{ width: "100%", boxSizing: "border-box", border: "2px solid #e5e7eb", borderRadius: 10, padding: "0.75rem 0.8rem 0.75rem 2.2rem" }}
          />
        </div>
        <small style={{ color: "#6b7280" }}>Wyniki: {filteredDogs.length} / {workDogs.length}</small>
      </div>

      <div style={sectionStyle}>
        {filteredDogs.length === 0 ? (
          <div style={{ color: "#6b7280" }}>Brak psów przypisanych do panelu behawiorysty.</div>
        ) : (
          filteredDogs.map((dog) => {
            const idPsa = String(dog.idPsa || dog.id || "");
            return (
              <div key={idPsa} style={searchCardStyle}>
                <div
                  onClick={() => onOpenDog(idPsa)}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "96px 1fr",
                    gap: "1rem",
                    alignItems: "start",
                    cursor: "pointer",
                  }}
                >
                  <img
                    src={dog.photo || dog.zdjecie || ""}
                    alt={dog.imie || dog.name || "Pies"}
                    style={{ width: "100%", aspectRatio: "1 / 1", objectFit: "cover", borderRadius: "0.75rem", background: "#f3f4f6" }}
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                  <div>
                    <h3 style={{ fontSize: "1.25rem", fontWeight: "bold", color: "#111827", margin: 0 }}>{dog.imie || dog.name || "Bez imienia"}</h3>
                    <p style={{ color: "#374151", marginTop: "0.35rem", marginBottom: 0 }}>
                      {dog.pawilon || dog.pavilion || "-"} / Boks {dog.nrBoksu || dog.box || "-"}
                    </p>
                    <p style={{ color: "#6b7280", marginTop: "0.35rem", marginBottom: 0 }}>ID: {idPsa}</p>
                  </div>
                </div>
                {canAssign && (
                  <button
                    onClick={() => handleAssignDogToWork(idPsa)}
                    disabled={assigningDogId === idPsa}
                    style={{
                      marginTop: "0.85rem",
                      border: "none",
                      borderRadius: "0.75rem",
                      padding: "0.65rem 0.9rem",
                      background: "#2563eb",
                      color: "white",
                      fontWeight: 700,
                      cursor: assigningDogId === idPsa ? "wait" : "pointer",
                      opacity: assigningDogId === idPsa ? 0.7 : 1,
                    }}
                  >
                    <Star size={16} style={{ marginRight: 6, verticalAlign: "text-bottom" }} />
                    {assigningDogId === idPsa ? "Zapisywanie..." : "Odłącz od panelu behawiorysty"}
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default BehaviorystPanel;
