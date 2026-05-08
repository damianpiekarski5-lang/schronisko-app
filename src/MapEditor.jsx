import React, { useState, useRef } from "react";
import { ArrowLeft, Copy, Check, Plus, Trash2 } from "lucide-react";

const VB = { x: -100, y: 0, w: 850, h: 600 };

const PAVILIONS = {
  R:  { x: -37,  y: 110, width: 110, height: 25,  special: "zewnętrzne" },
  P:  { x: -38,  y: 135, width: 110, height: 25,  special: "zewnętrzne" },
  Y:  { x: 523,  y: 144, width: 125, height: 25,  special: "zewnętrzne" },
  T:  { x: -41,  y: 176, width: 25,  height: 110, special: "zewnętrzne", rotation: 35 },
  V:  { x: -19,  y: 191, width: 25,  height: 110, special: "zewnętrzne", rotation: 35 },
  X:  { x: -54,  y: 398, width: 150, height: 25,  special: "zewnętrzne" },
  N:  { x: -12,  y: 465, width: 110, height: 25,  special: "zewnętrzne" },
  U:  { x: -13,  y: 492, width: 110, height: 25,  special: "zewnętrzne" },
  L:  { x: -53,  y: 426, width: 150, height: 25,  special: "zewnętrzne" },
  F:  { x: 153,  y: 147, width: 45,  height: 120, special: "wewnętrzne" },
  G:  { x: 199,  y: 147, width: 45,  height: 120, special: "wewnętrzne" },
  E:  { x: 153,  y: 267, width: 45,  height: 120, special: "wewnętrzne" },
  H:  { x: 198,  y: 267, width: 45,  height: 120, special: "wewnętrzne" },
  ZF: { x: 284,  y: 146, width: 45,  height: 180, special: "wewnętrzne" },
  ZG: { x: 330,  y: 146, width: 45,  height: 180, special: "wewnętrzne" },
  B:  { x: 412,  y: 150, width: 45,  height: 120, special: "wewnętrzne" },
  C:  { x: 458,  y: 149, width: 45,  height: 120, special: "wewnętrzne" },
  A:  { x: 411,  y: 269, width: 45,  height: 120, special: "wewnętrzne" },
  D:  { x: 458,  y: 269, width: 45,  height: 120, special: "wewnętrzne" },
  ZE: { x: 284,  y: 326, width: 45,  height: 60,  special: "szczeniaki" },
  ZH: { x: 330,  y: 326, width: 45,  height: 60,  special: "szczeniaki" },
};

const PRESETS = [
  { label: "Kwarantanna", color: "#fde68a", strokeColor: "#475569", width: 80, height: 60 },
  { label: "Szpital",     color: "#f08f8f", strokeColor: "#475569", width: 50, height: 100 },
  { label: "Wybiegi",     color: "#d4edda", strokeColor: "#475569", width: 80, height: 80 },
  { label: "Inne",        color: "#e0e7ff", strokeColor: "#475569", width: 60, height: 60 },
];

const DEFAULT_ELEMENTS = [
  { id: "wybiegi_lewe",  type: "building", label: "Wybiegi",     x: 529, y: 188, width: 50,  height: 149, color: "#d4edda", strokeColor: "#475569" },
  { id: "szpital",       type: "building", label: "Szpital",     x: 580, y: 239, width: 50,  height: 150, color: "#f08f8f", strokeColor: "#475569" },
  { id: "kwarantanna",   type: "building", label: "Kwarantanna", x: 300, y: 420, width: 80,  height: 60,  color: "#fde68a", strokeColor: "#475569" },
];

function getSVGCoords(e, svgEl) {
  const rect = svgEl.getBoundingClientRect();
  const scaleX = VB.w / rect.width;
  const scaleY = VB.h / rect.height;
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;
  return {
    x: Math.round((clientX - rect.left) * scaleX + VB.x),
    y: Math.round((clientY - rect.top)  * scaleY + VB.y),
  };
}

function pavilionColor(special) {
  if (special === "szczeniaki")  return "#fde047";
  if (special === "wewnętrzne") return "#93c5fd";
  return "#c084fc";
}

let nextId = 10;

export default function MapEditor({ onBack }) {
  const [elements, setElements] = useState(DEFAULT_ELEMENTS);
  const [selected, setSelected] = useState(null);
  const [copied, setCopied] = useState(false);
  const svgRef = useRef(null);
  const dragRef = useRef(null); // { id, offsetX, offsetY }

  // ── drag handlers ──────────────────────────────────────────
  const startDrag = (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    const coords = getSVGCoords(e, svgRef.current);
    const el = elements.find((x) => x.id === id);
    dragRef.current = { id, offsetX: coords.x - el.x, offsetY: coords.y - el.y };
    setSelected(id);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup",   onUp);
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend",  onUp);
  };

  const onMove = (e) => {
    if (!dragRef.current || !svgRef.current) return;
    e.preventDefault();
    const coords = getSVGCoords(e, svgRef.current);
    const { id, offsetX, offsetY } = dragRef.current;
    setElements((prev) =>
      prev.map((el) =>
        el.id === id ? { ...el, x: coords.x - offsetX, y: coords.y - offsetY } : el
      )
    );
  };

  const onUp = () => {
    dragRef.current = null;
    window.removeEventListener("mousemove", onMove);
    window.removeEventListener("mouseup",   onUp);
    window.removeEventListener("touchmove", onMove);
    window.removeEventListener("touchend",  onUp);
  };

  // ── add / remove ───────────────────────────────────────────
  const addElement = (preset) => {
    const id = `el_${nextId++}`;
    setElements((prev) => [...prev, { ...preset, id, type: "building", x: 200, y: 400 }]);
    setSelected(id);
  };

  const removeSelected = () => {
    setElements((prev) => prev.filter((el) => el.id !== selected));
    setSelected(null);
  };

  // ── inline edit of selected element ───────────────────────
  const updateField = (field, value) => {
    setElements((prev) =>
      prev.map((el) => (el.id === selected ? { ...el, [field]: Number(value) } : el))
    );
  };

  const updateLabel = (value) => {
    setElements((prev) =>
      prev.map((el) => (el.id === selected ? { ...el, label: value } : el))
    );
  };

  // ── export ─────────────────────────────────────────────────
  const generateCode = () => {
    const lines = elements.map((el) => {
      if (el.type === "area") {
        return `  { id: "${el.id}", type: "area", label: "${el.label}", points: ${JSON.stringify(el.points)}, color: "${el.color}", strokeColor: "${el.strokeColor}" }`;
      }
      return `  { id: "${el.id}", type: "building", label: "${el.label}", x: ${el.x}, y: ${el.y}, width: ${el.width}, height: ${el.height}, color: "${el.color}", strokeColor: "${el.strokeColor}" }`;
    });
    return `const infrastructure = [\n${lines.join(",\n")}\n];`;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generateCode()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const sel = elements.find((el) => el.id === selected);

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f9fafb", paddingBottom: "80px" }}>
      {/* header */}
      <div style={{ backgroundColor: "white", borderBottom: "1px solid #e5e7eb", padding: "1rem", position: "sticky", top: 0, zIndex: 100, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
        <button
          onClick={onBack}
          style={{ display: "flex", alignItems: "center", color: "#2563eb", background: "none", border: "none", cursor: "pointer", fontSize: "1rem", marginBottom: "0.5rem" }}
        >
          <ArrowLeft size={22} style={{ marginRight: "0.4rem" }} /> Powrót
        </button>
        <h1 style={{ fontSize: "1.25rem", fontWeight: "bold", margin: 0 }}>🗺️ Edytor mapy</h1>
        <p style={{ color: "#6b7280", fontSize: "0.8rem", marginTop: "0.25rem" }}>
          Przeciągaj elementy na mapie • zaznacz element żeby edytować rozmiar
        </p>
      </div>

      <div style={{ padding: "1rem" }}>

        {/* Dodaj element */}
        <div style={{ backgroundColor: "white", borderRadius: "1rem", padding: "1rem", marginBottom: "1rem", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
          <p style={{ fontWeight: "600", fontSize: "0.875rem", marginBottom: "0.75rem", color: "#374151" }}>
            Dodaj element
          </p>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => addElement(p)}
                style={{ display: "flex", alignItems: "center", gap: "0.35rem", padding: "0.5rem 0.75rem", borderRadius: "0.5rem", border: "2px solid #e5e7eb", backgroundColor: p.color, cursor: "pointer", fontSize: "0.875rem", fontWeight: "600" }}
              >
                <Plus size={14} /> {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Panel wybranego elementu */}
        {sel && (
          <div style={{ backgroundColor: "white", borderRadius: "1rem", padding: "1rem", marginBottom: "1rem", border: "2px solid #3b82f6", boxShadow: "0 1px 6px rgba(59,130,246,0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
              <p style={{ fontWeight: "700", color: "#1d4ed8", margin: 0 }}>✏️ {sel.label}</p>
              <button
                onClick={removeSelected}
                style={{ background: "#fee2e2", border: "none", borderRadius: "0.5rem", padding: "0.4rem 0.6rem", cursor: "pointer", color: "#dc2626" }}
              >
                <Trash2 size={16} />
              </button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
              {[
                { label: "X",       field: "x",      val: sel.x },
                { label: "Y",       field: "y",      val: sel.y },
                { label: "Szerokość", field: "width",  val: sel.width },
                { label: "Wysokość",  field: "height", val: sel.height },
              ].map(({ label, field, val }) => (
                <label key={field} style={{ fontSize: "0.8rem" }}>
                  <span style={{ display: "block", color: "#6b7280", marginBottom: "0.2rem" }}>{label}</span>
                  <input
                    type="number"
                    value={val}
                    onChange={(e) => updateField(field, e.target.value)}
                    style={{ width: "100%", padding: "0.4rem", border: "1px solid #d1d5db", borderRadius: "0.4rem", fontSize: "0.9rem" }}
                  />
                </label>
              ))}
            </div>
            <label style={{ fontSize: "0.8rem", display: "block", marginTop: "0.5rem" }}>
              <span style={{ display: "block", color: "#6b7280", marginBottom: "0.2rem" }}>Nazwa</span>
              <input
                type="text"
                value={sel.label}
                onChange={(e) => updateLabel(e.target.value)}
                style={{ width: "100%", padding: "0.4rem", border: "1px solid #d1d5db", borderRadius: "0.4rem", fontSize: "0.9rem", boxSizing: "border-box" }}
              />
            </label>
          </div>
        )}

        {/* SVG mapa */}
        <div style={{ backgroundColor: "white", borderRadius: "1rem", padding: "0.75rem", boxShadow: "0 1px 3px rgba(0,0,0,0.08)", marginBottom: "1rem", overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
          <svg
            ref={svgRef}
            viewBox="-100 0 850 600"
            style={{ width: "100%", minWidth: "600px", minHeight: "400px", display: "block", touchAction: "none" }}
          >
            <rect x="-100" y="0" width="850" height="600" fill="#eff6ff" />

            {/* wybiegi wielokąt (tło, nie draggable) */}
            <polygon
              points="139,160 99,160 -51,380 139,380 139,160"
              fill="#d4edda"
              opacity="0.5"
              stroke="#475569"
              strokeWidth="2"
            />

            {/* pawilony (tylko podgląd) */}
            {Object.entries(PAVILIONS).map(([code, cfg]) => (
              <g key={code}>
                <rect
                  x={cfg.x} y={cfg.y} width={cfg.width} height={cfg.height}
                  fill={pavilionColor(cfg.special)}
                  stroke="#64748b" strokeWidth="2" rx="3" opacity="0.6"
                  transform={cfg.rotation ? `rotate(${cfg.rotation} ${cfg.x + cfg.width / 2} ${cfg.y + cfg.height / 2})` : ""}
                />
                <text
                  x={cfg.x + cfg.width / 2} y={cfg.y + cfg.height / 2 + 5}
                  textAnchor="middle" fontSize="11" fontWeight="bold" fill="#1e293b"
                  style={{ pointerEvents: "none" }}
                >
                  {code}
                </text>
              </g>
            ))}

            {/* draggable infrastructure */}
            {elements.map((el) => {
              if (el.type !== "building") return null;
              const isSelected = el.id === selected;
              return (
                <g key={el.id}>
                  <rect
                    x={el.x} y={el.y} width={el.width} height={el.height}
                    fill={el.color}
                    stroke={isSelected ? "#2563eb" : el.strokeColor}
                    strokeWidth={isSelected ? 3 : 2}
                    rx="4"
                    style={{ cursor: "grab" }}
                    onMouseDown={(e) => startDrag(e, el.id)}
                    onTouchStart={(e) => startDrag(e, el.id)}
                  />
                  <text
                    x={el.x + el.width / 2}
                    y={el.y + el.height / 2 + 5}
                    textAnchor="middle"
                    fontSize="11"
                    fontWeight="bold"
                    fill="#1e293b"
                    style={{ pointerEvents: "none", userSelect: "none" }}
                  >
                    {el.label}
                  </text>
                  {isSelected && (
                    <text
                      x={el.x + el.width / 2}
                      y={el.y - 5}
                      textAnchor="middle"
                      fontSize="10"
                      fill="#2563eb"
                      style={{ pointerEvents: "none" }}
                    >
                      ({el.x}, {el.y})
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {/* Wszystkie pozycje */}
        <div style={{ backgroundColor: "white", borderRadius: "1rem", padding: "1rem", marginBottom: "1rem", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
          <p style={{ fontWeight: "600", fontSize: "0.875rem", marginBottom: "0.75rem", color: "#374151" }}>
            Aktualne pozycje
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            {elements.filter(e => e.type === "building").map((el) => (
              <div
                key={el.id}
                onClick={() => setSelected(el.id)}
                style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "0.5rem 0.75rem", borderRadius: "0.5rem", cursor: "pointer",
                  backgroundColor: el.id === selected ? "#eff6ff" : "#f9fafb",
                  border: `2px solid ${el.id === selected ? "#3b82f6" : "#e5e7eb"}`,
                  fontSize: "0.875rem",
                }}
              >
                <span style={{ fontWeight: "600" }}>
                  <span style={{ display: "inline-block", width: "12px", height: "12px", borderRadius: "2px", backgroundColor: el.color, marginRight: "0.4rem", verticalAlign: "middle", border: "1px solid #ccc" }} />
                  {el.label}
                </span>
                <span style={{ color: "#6b7280", fontFamily: "monospace", fontSize: "0.8rem" }}>
                  x:{el.x} y:{el.y} {el.width}×{el.height}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Kopiuj kod */}
        <button
          onClick={handleCopy}
          style={{
            width: "100%", padding: "1rem", borderRadius: "0.75rem", border: "none",
            backgroundColor: copied ? "#22c55e" : "#2563eb", color: "white",
            fontSize: "1rem", fontWeight: "700", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
          }}
        >
          {copied ? <><Check size={20} /> Skopiowano!</> : <><Copy size={20} /> Skopiuj konfigurację</>}
        </button>
        <p style={{ textAlign: "center", color: "#9ca3af", fontSize: "0.8rem", marginTop: "0.5rem" }}>
          Skopiuj i wklej do chatu — zaktualizuję mapę w aplikacji
        </p>
      </div>
    </div>
  );
}
