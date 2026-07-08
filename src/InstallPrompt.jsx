import React, { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [visible, setVisible] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Nie pokazuj jeśli już zainstalowana (działa jako standalone)
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    if (window.navigator.standalone === true) return;

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setVisible(true);
    };

    const installedHandler = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", installedHandler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setInstalled(true);
    setDeferredPrompt(null);
    setVisible(false);
  };

  if (!visible || installed) return null;

  return (
    <div style={{
      position: "fixed",
      bottom: "90px",
      left: "1rem",
      right: "1rem",
      backgroundColor: "white",
      borderRadius: "1rem",
      boxShadow: "0 4px 24px rgba(0,0,0,0.18)",
      border: "2px solid #2563eb",
      padding: "1rem 1.25rem",
      zIndex: 999,
      display: "flex",
      alignItems: "center",
      gap: "0.75rem",
    }}>
      <img src="/icon-192.png" alt="logo" style={{ width: "48px", height: "48px", borderRadius: "10px", flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <p style={{ fontWeight: "700", fontSize: "0.95rem", color: "#111827", margin: 0 }}>
          Zainstaluj aplikację
        </p>
        <p style={{ fontSize: "0.8rem", color: "#6b7280", margin: "0.15rem 0 0" }}>
          Dodaj Schronisko do ekranu głównego
        </p>
      </div>
      <button
        onClick={handleInstall}
        style={{
          backgroundColor: "#2563eb",
          color: "white",
          border: "none",
          borderRadius: "0.6rem",
          padding: "0.5rem 0.9rem",
          fontWeight: "700",
          fontSize: "0.875rem",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "0.35rem",
          flexShrink: 0,
        }}
      >
        <Download size={16} /> Zainstaluj
      </button>
      <button
        onClick={() => setVisible(false)}
        style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", padding: "0.25rem", flexShrink: 0 }}
      >
        <X size={20} />
      </button>
    </div>
  );
}
