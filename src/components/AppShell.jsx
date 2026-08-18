// Wspólna powłoka aplikacji: górny pasek (TopBar), dolna nawigacja (AppNav)
// z arkuszem "Więcej" oraz podstawowe komponenty UI (Button, Banner,
// EmptyState, ConfirmDialog). Jedno miejsce zamiast sześciu kopii nawigacji.

import React, { useState } from "react";
import {
  Home, Table, CalendarDays, Star, Menu, MapPin, LogOut,
  Building2, Shield, Dumbbell, PawPrint, X, FileText,
} from "lucide-react";
import { useUserRole } from "../hooks/useUserRole";
import { canViewSector, canViewWalkReport } from "../lib/roles";
import { color, font, radius, shadow } from "../theme";

// Tytuły widoków w górnym pasku — użytkownik zawsze wie, gdzie jest
const VIEW_TITLES = {
  home: "Start",
  walkTable: "Tabela spacerów",
  schedule: "Grafik obecności",
  introWalk: "Spacery zapoznawcze",
  map: "Mapa schroniska",
  boxes: "Boksy",
  dogs: "Lista psów",
  dogCard: "Karta psa",
  myDogs: "Moje psy",
  sector: "Sektor",
  panel: "Panel admina",
  mapEditor: "Edytor mapy",
};

export function TopBar({ currentView, onLogout }) {
  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 180,
        display: "flex",
        alignItems: "center",
        gap: "0.6rem",
        padding: "0.45rem 0.9rem",
        background: color.white,
        borderBottom: `1px solid ${color.border}`,
        boxShadow: shadow.card,
      }}
    >
      <img src="/icon-192.png" alt="" style={{ width: 26, height: 26 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: font.sm, fontWeight: 700, color: color.text, lineHeight: 1.1 }}>
          Schronisko Kraków
        </div>
        <div style={{ fontSize: font.xs, color: color.textMuted, lineHeight: 1.1 }}>
          {VIEW_TITLES[currentView] || ""}
        </div>
      </div>
      {onLogout && (
        <button
          onClick={onLogout}
          aria-label="Wyloguj"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.3rem",
            background: "none",
            border: `1px solid ${color.border}`,
            borderRadius: radius.full,
            padding: "0.3rem 0.7rem",
            color: color.textSecondary,
            fontSize: font.xs,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          <LogOut size={14} /> Wyloguj
        </button>
      )}
    </header>
  );
}

// Główne zakładki wolontariusza; reszta pod "Więcej"
const MAIN_TABS = [
  { view: "home", label: "Start", Icon: Home },
  { view: "walkTable", label: "Tabela", Icon: Table },
  { view: "schedule", label: "Grafik", Icon: CalendarDays },
  { view: "myDogs", label: "Moje psy", Icon: Star },
];

export function AppNav({ currentView, onNavigate, isAdmin, isBehavioryst }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const { role } = useUserRole();

  const moreItems = [
    { view: "map", label: "Mapa schroniska", Icon: MapPin },
    { view: "introWalk", label: "Spacery zapoznawcze", Icon: PawPrint },
    ...(canViewSector(role) ? [{ view: "sector", label: "Sektor", Icon: Building2 }] : []),
    ...(canViewWalkReport(role) ? [{ view: "walkReport", label: "Raport spacerów", Icon: FileText }] : []),
    ...(isAdmin ? [{ view: "panel", label: "Panel admina", Icon: Shield }] : []),
    ...(isBehavioryst ? [{ view: "behaviorystPanel", label: "Trening", Icon: Dumbbell }] : []),
  ];
  const moreActive = moreItems.some((i) => i.view === currentView)
    || ["boxes", "dogs"].includes(currentView);

  const go = (view) => {
    setMoreOpen(false);
    onNavigate(view);
  };

  return (
    <>
      {moreOpen && (
        <div
          onClick={() => setMoreOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 190 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "fixed",
              bottom: 64,
              left: 0,
              right: 0,
              background: color.white,
              borderRadius: "1rem 1rem 0 0",
              padding: "0.75rem 0.75rem 0.9rem",
              boxShadow: shadow.raised,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
              <span style={{ fontSize: font.sm, fontWeight: 700, color: color.textMuted, padding: "0 0.4rem" }}>
                Więcej
              </span>
              <button
                onClick={() => setMoreOpen(false)}
                aria-label="Zamknij"
                style={{ background: "none", border: "none", cursor: "pointer", color: color.textMuted, padding: "0.3rem" }}
              >
                <X size={18} />
              </button>
            </div>
            {moreItems.map(({ view, label, Icon }) => (
              <button
                key={view}
                onClick={() => go(view)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  width: "100%",
                  padding: "0.8rem 0.6rem",
                  background: currentView === view ? color.primarySoft : "none",
                  border: "none",
                  borderRadius: radius.sm,
                  color: currentView === view ? color.primaryText : color.textSecondary,
                  fontSize: font.base,
                  fontWeight: 600,
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <Icon size={20} /> {label}
              </button>
            ))}
          </div>
        </div>
      )}

      <nav
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 200,
          display: "flex",
          justifyContent: "space-around",
          alignItems: "stretch",
          background: color.white,
          borderTop: `1px solid ${color.border}`,
          boxShadow: shadow.nav,
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        {MAIN_TABS.map(({ view, label, Icon }) => (
          <NavButton
            key={view}
            active={currentView === view}
            label={label}
            Icon={Icon}
            onClick={() => go(view)}
          />
        ))}
        <NavButton
          active={moreActive || moreOpen}
          label="Więcej"
          Icon={Menu}
          onClick={() => setMoreOpen((o) => !o)}
        />
      </nav>
    </>
  );
}

function NavButton({ active, label, Icon, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "0.15rem",
        padding: "0.5rem 0.25rem 0.55rem",
        background: "none",
        border: "none",
        borderTop: active ? `3px solid ${color.primary}` : "3px solid transparent",
        color: active ? color.primary : color.textMuted,
        fontSize: font.xs,
        fontWeight: active ? 700 : 500,
        cursor: "pointer",
        minWidth: 0,
      }}
    >
      <Icon size={22} />
      <span style={{ whiteSpace: "nowrap" }}>{label}</span>
    </button>
  );
}

// ---------- Podstawowe komponenty UI ----------

const BUTTON_VARIANTS = {
  primary: { background: color.primary, color: color.white, border: "none" },
  success: { background: color.success, color: color.white, border: "none" },
  danger: { background: color.danger, color: color.white, border: "none" },
  secondary: {
    background: color.white,
    color: color.textSecondary,
    border: `1px solid ${color.borderStrong}`,
  },
};

export function Button({ variant = "primary", disabled, style, children, ...props }) {
  return (
    <button
      disabled={disabled}
      style={{
        padding: "0.65rem 1rem",
        borderRadius: radius.sm,
        fontSize: font.base,
        fontWeight: 700,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.55 : 1,
        ...BUTTON_VARIANTS[variant],
        ...style,
      }}
      {...props}
    >
      {children}
    </button>
  );
}

const BANNER_KINDS = {
  success: { bg: color.successSoft, border: color.successBorder, text: color.successDark },
  warning: { bg: color.warningSoft, border: color.warningBorder, text: color.warningDark },
  error: { bg: color.dangerSoft, border: color.dangerBorder, text: color.dangerDark },
  info: { bg: color.primarySoft, border: color.primaryBorder, text: color.primaryText },
};

export function Banner({ kind = "info", onClose, style, children }) {
  const k = BANNER_KINDS[kind] || BANNER_KINDS.info;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "0.5rem",
        padding: "0.6rem 0.8rem",
        borderRadius: radius.sm,
        background: k.bg,
        border: `1px solid ${k.border}`,
        color: k.text,
        fontSize: font.sm,
        fontWeight: 600,
        ...style,
      }}
    >
      <span style={{ flex: 1 }}>{children}</span>
      {onClose && (
        <button
          onClick={onClose}
          aria-label="Zamknij komunikat"
          style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", padding: 0 }}
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}

export function EmptyState({ icon = "🐾", title, hint, action }) {
  return (
    <div style={{ padding: "2.5rem 1.5rem", textAlign: "center", color: color.textMuted }}>
      <div style={{ fontSize: "2.2rem", marginBottom: "0.6rem" }}>{icon}</div>
      <p style={{ fontSize: font.md, fontWeight: 600, color: color.textSecondary, margin: 0 }}>{title}</p>
      {hint && <p style={{ fontSize: font.sm, margin: "0.4rem 0 0" }}>{hint}</p>}
      {action && <div style={{ marginTop: "1rem" }}>{action}</div>}
    </div>
  );
}

// Spójne potwierdzenie zamiast window.confirm — po polsku i czytelne
export function ConfirmDialog({ open, title, message, confirmLabel = "Usuń", danger = true, onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div
      onClick={onCancel}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000,
        display: "flex", alignItems: "center", justifyContent: "center", padding: "1.25rem",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: color.white, borderRadius: radius.md, padding: "1.25rem",
          width: "100%", maxWidth: 380, boxShadow: shadow.raised,
        }}
      >
        <h3 style={{ margin: 0, fontSize: font.md, fontWeight: 700, color: color.text }}>{title}</h3>
        {message && (
          <p style={{ margin: "0.5rem 0 0", fontSize: font.sm, color: color.textMuted }}>{message}</p>
        )}
        <div style={{ display: "flex", gap: "0.6rem", marginTop: "1.1rem" }}>
          <Button variant="secondary" style={{ flex: 1 }} onClick={onCancel}>
            Anuluj
          </Button>
          <Button variant={danger ? "danger" : "primary"} style={{ flex: 1 }} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
