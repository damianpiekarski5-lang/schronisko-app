import React, { useState } from "react";
import { exerciseContent, vimeoEmbedUrl } from "../lib/trainingStore";

// Materiał instruktażowy ćwiczenia: opis, instrukcje krok po kroku,
// kryterium sukcesu, częste błędy i wideo. Gdy ćwiczenie ma etapy,
// pokazuje treść aktualnego etapu.

const S = {
  label: { fontSize: "0.72rem", fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: "0.3rem" },
  text: { fontSize: "0.85rem", color: "#374151", lineHeight: 1.5 },
  block: { marginTop: "0.85rem" },
  step: { display: "flex", gap: "0.55rem", alignItems: "flex-start", marginBottom: "0.4rem" },
  stepNo: {
    width: 20, height: 20, borderRadius: "50%", backgroundColor: "#7c3aed", color: "white",
    fontSize: "0.7rem", fontWeight: 700, display: "flex", alignItems: "center",
    justifyContent: "center", flexShrink: 0, marginTop: "0.1rem",
  },
  criteria: {
    backgroundColor: "#ecfdf5", border: "1px solid #a7f3d0", borderRadius: "0.6rem",
    padding: "0.6rem 0.7rem", fontSize: "0.84rem", color: "#065f46", lineHeight: 1.45,
  },
  mistake: { fontSize: "0.82rem", color: "#92400e", lineHeight: 1.45, marginBottom: "0.25rem" },
  toggle: {
    background: "none", border: "none", padding: 0, cursor: "pointer",
    color: "#b45309", fontSize: "0.8rem", fontWeight: 700,
  },
  stageBar: {
    display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap",
    backgroundColor: "#f5f3ff", border: "1px solid #ddd6fe", borderRadius: "0.6rem",
    padding: "0.5rem 0.65rem", marginBottom: "0.6rem",
  },
  stageName: { fontSize: "0.85rem", fontWeight: 700, color: "#5b21b6" },
  select: {
    padding: "0.35rem 0.5rem", borderRadius: "0.5rem", border: "1px solid #d1d5db",
    fontSize: "0.8rem", backgroundColor: "white", color: "#111827", maxWidth: "100%",
  },
  video: { position: "relative", paddingBottom: "56.25%", height: 0, borderRadius: "0.6rem", overflow: "hidden", marginTop: "0.85rem" },
  iframe: { position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: 0 },
  meta: { fontSize: "0.78rem", color: "#6b7280" },
};

export default function ExerciseContent({ exercise, stage, onChangeStage, savingStage }) {
  const [showMistakes, setShowMistakes] = useState(false);
  const c = exerciseContent(exercise, stage);
  const embed = vimeoEmbedUrl(c.vimeoId);

  return (
    <div>
      {stage && (
        <div style={S.stageBar}>
          <div style={{ flex: 1, minWidth: 140 }}>
            <div style={S.stageName}>
              Poziom {stage.index + 1}/{stage.total}: {stage.name}
            </div>
            {c.durationMinutes > 0 && (
              <div style={S.meta}>~{c.durationMinutes} min</div>
            )}
          </div>
          {onChangeStage && (
            <select
              value={stage.index}
              disabled={savingStage}
              onChange={(e) => onChangeStage(Number(e.target.value))}
              style={S.select}
              aria-label="Zmień poziom"
            >
              {exercise.stages.map((s, i) => (
                <option key={i} value={i}>
                  {i + 1}. {s.name}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {c.description && <div style={S.text}>{c.description}</div>}

      {c.instructions.length > 0 && (
        <div style={S.block}>
          <div style={S.label}>Jak to zrobić</div>
          {c.instructions.map((step, i) => (
            <div key={i} style={S.step}>
              <span style={S.stepNo}>{i + 1}</span>
              <span style={S.text}>{step}</span>
            </div>
          ))}
        </div>
      )}

      {c.successCriteria && (
        <div style={S.block}>
          <div style={S.label}>Kryterium sukcesu</div>
          <div style={S.criteria}>✓ {c.successCriteria}</div>
        </div>
      )}

      {c.commonMistakes.length > 0 && (
        <div style={S.block}>
          <button onClick={() => setShowMistakes((v) => !v)} style={S.toggle}>
            ⚠️ Częste błędy ({c.commonMistakes.length}) {showMistakes ? "▲" : "▼"}
          </button>
          {showMistakes && (
            <div style={{ marginTop: "0.4rem" }}>
              {c.commonMistakes.map((m, i) => (
                <div key={i} style={S.mistake}>• {m}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {embed && (
        <div style={S.video}>
          <iframe
            src={embed}
            style={S.iframe}
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            loading="lazy"
            title={`Instruktaż: ${exercise?.name || "ćwiczenie"}`}
          />
        </div>
      )}

      {exercise?.tags?.length > 0 && (
        <div style={{ ...S.block, display: "flex", gap: "0.3rem", flexWrap: "wrap" }}>
          {exercise.tags.map((t) => (
            <span key={t} style={{ fontSize: "0.72rem", backgroundColor: "#f3f4f6", color: "#6b7280", padding: "0.15rem 0.45rem", borderRadius: "0.4rem" }}>
              {t}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
