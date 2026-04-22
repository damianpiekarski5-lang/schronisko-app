import React, { useState } from "react";
import { Hash, MapPin } from "lucide-react";

const styles = {
  card: {
    backgroundColor: "white",
    border: "2px solid #e5e7eb",
    borderRadius: "1rem",
    padding: "1rem",
    cursor: "pointer",
    transition: "all 0.2s",
    width: "100%",
    textAlign: "left",
  },
  cardSmall: {
    borderRadius: "0.8rem",
    padding: "0.65rem",
  },
  photo: {
    width: "100%",
    aspectRatio: "1 / 1",
    objectFit: "cover",
    borderRadius: "0.75rem",
    backgroundColor: "#f3f4f6",
  },
  photoSmall: {
    borderRadius: "0.6rem",
  },
};

const normalizeName = (pies) => pies?.imie || pies?.name || "Pies";
const normalizeBox = (pies) => pies?.boks || (pies?.pavilion && pies?.box ? `${pies.pavilion} / Boks ${pies.box}` : "");

const DogPhoto = ({ photo, imie, wariant }) => {
  const [imgError, setImgError] = useState(false);
  const hasValidPhoto = typeof photo === "string" && photo.trim().length > 5;
  const initial = String(imie || "P").charAt(0).toUpperCase();

  if (!hasValidPhoto || imgError) {
    return (
      <div
        style={{
          ...styles.photo,
          ...(wariant === "mala" ? styles.photoSmall : {}),
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: wariant === "mala" ? "1.4rem" : "2.4rem",
          color: "#6b7280",
          fontWeight: 700,
        }}
      >
        {initial}
      </div>
    );
  }

  return <img src={photo} alt={imie} style={{ ...styles.photo, ...(wariant === "mala" ? styles.photoSmall : {}) }} onError={() => setImgError(true)} />;
};

const KartaPsa = ({ pies, onClick, wariant = "duza" }) => {
  const imie = normalizeName(pies);
  const id = pies?.id || "";
  const boks = normalizeBox(pies);

  return (
    <button type="button" onClick={() => onClick?.(pies)} style={{ ...styles.card, ...(wariant === "mala" ? styles.cardSmall : {}) }}>
      <div style={{ display: "grid", gridTemplateColumns: wariant === "mala" ? "72px 1fr" : "120px 1fr", gap: "0.8rem", alignItems: "center" }}>
        <DogPhoto photo={pies?.photo} imie={imie} wariant={wariant} />
        <div>
          <h3 style={{ fontSize: wariant === "mala" ? "1rem" : "1.25rem", fontWeight: "bold", color: "#111827", margin: "0 0 0.45rem" }}>{imie}</h3>
          <div style={{ display: "flex", alignItems: "center", fontSize: "0.8rem", color: "#6b7280", marginBottom: "0.35rem" }}>
            <Hash size={14} style={{ marginRight: "0.25rem", flexShrink: 0 }} />
            <b style={{ color: "#111827" }}>{id || "Brak ID"}</b>
          </div>
          {!!boks && (
            <div style={{ display: "flex", alignItems: "center", fontSize: "0.78rem", color: "#6b7280" }}>
              <MapPin size={14} style={{ marginRight: "0.25rem", flexShrink: 0 }} />
              {boks}
            </div>
          )}
        </div>
      </div>
    </button>
  );
};

export default KartaPsa;
