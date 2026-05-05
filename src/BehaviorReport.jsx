import React, { useState } from "react";
import { X, CheckCircle } from "lucide-react";

const API_URL = "/api/gs";

const styles = {
  overlay: { position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1100, overflowY: "auto" },
  container: { minHeight: "100vh", padding: "1rem", paddingBottom: "6rem" },
  panel: { backgroundColor: "white", borderRadius: "1rem", maxWidth: "600px", margin: "0 auto", boxShadow: "0 4px 20px rgba(0,0,0,0.2)" },
  header: {
    background: "linear-gradient(135deg, #f59e0b, #d97706)",
    padding: "1.5rem",
    borderTopLeftRadius: "1rem",
    borderTopRightRadius: "1rem",
    color: "white",
  },
  headerTop: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" },
  title: { fontSize: "1.5rem", fontWeight: "bold" },
  subtitle: { opacity: 0.9, fontSize: "0.875rem" },
  closeButton: { background: "rgba(255,255,255,0.2)", border: "none", cursor: "pointer", color: "white", padding: "0.5rem", borderRadius: "0.5rem" },
  content: { padding: "1.5rem" },
  label: { display: "block", fontSize: "0.875rem", fontWeight: "600", color: "#374151", marginBottom: "0.5rem" },
  required: { color: "#ef4444", marginLeft: "0.25rem" },
  textareaWrapper: { position: "relative" },
  textarea: {
    width: "100%",
    padding: "0.75rem",
    paddingBottom: "1.75rem",
    border: "2px solid #e5e7eb",
    borderRadius: "0.5rem",
    fontSize: "0.95rem",
    outline: "none",
    minHeight: "160px",
    resize: "vertical",
    fontFamily: "inherit",
    boxSizing: "border-box",
  },
  counter: {
    position: "absolute",
    bottom: "0.4rem",
    right: "0.6rem",
    fontSize: "0.75rem",
    color: "#9ca3af",
    pointerEvents: "none",
  },
  successMessage: { padding: "1rem", backgroundColor: "#dcfce7", color: "#166534", borderRadius: "0.5rem", marginBottom: "1rem", textAlign: "center", fontWeight: "700" },
  errorMessage: { padding: "1rem", backgroundColor: "#fee2e2", color: "#991b1b", borderRadius: "0.5rem", marginBottom: "1rem", textAlign: "center", fontWeight: "700" },
  saveButton: {
    position: "fixed", bottom: "1rem", left: "1rem", right: "1rem",
    maxWidth: "600px", margin: "0 auto",
    display: "flex", alignItems: "center", justifyContent: "center",
    padding: "1rem",
    backgroundColor: "#f59e0b", color: "white",
    border: "none", borderRadius: "0.75rem",
    fontSize: "1.125rem", fontWeight: "800",
    cursor: "pointer", boxShadow: "0 4px 12px rgba(245,158,11,0.35)", zIndex: 1101,
  },
  saveButtonDisabled: { backgroundColor: "#9ca3af", cursor: "not-allowed", boxShadow: "none" },
};

const MAX_CHARS = 800;

const BehaviorReport = ({ dog, onClose, currentUser }) => {
  const [opis, setOpis] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const isValid = opis.trim().length >= 10;

  const handleSave = async () => {
    if (!isValid) {
      setMessage({ type: "error", text: "❌ Opisz problem (minimum 10 znaków)." });
      return;
    }
    if (!currentUser) {
      setMessage({ type: "error", text: "❌ Zaloguj się, aby wysłać zgłoszenie." });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const token = await currentUser.getIdToken();
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          action: "reportBehavior",
          dogName: dog?.name || "",
          dogId: dog?.id || "",
          opis: opis.trim(),
        }),
      });

      const result = await response.json();

      if (result?.ok === true && result?.data?.success === true) {
        setMessage({ type: "success", text: `✅ Zgłoszenie zapisane dla psa ${dog?.name}.` });
        setTimeout(() => onClose?.(), 1300);
      } else {
        setMessage({ type: "error", text: "❌ " + (result?.error || "Nie udało się zapisać zgłoszenia") });
      }
    } catch {
      setMessage({ type: "error", text: "❌ Błąd połączenia. Spróbuj ponownie." });
    } finally {
      setSaving(false);
    }
  };

  const location = [dog?.pavilion, dog?.box ? `Boks ${dog.box}` : ""].filter(Boolean).join(" / ");
  const subtitle = [dog?.name, location].filter(Boolean).join(" · ");

  return (
    <div style={styles.overlay}>
      <div style={styles.container}>
        <div style={styles.panel}>
          <div style={styles.header}>
            <div style={styles.headerTop}>
              <div>
                <h2 style={styles.title}>🧠 Zgłoszenie do behawiorysty</h2>
                <p style={styles.subtitle}>{subtitle}</p>
              </div>
              <button onClick={onClose} style={styles.closeButton}><X size={24} /></button>
            </div>
          </div>

          <div style={styles.content}>
            {message && (
              <div style={message.type === "success" ? styles.successMessage : styles.errorMessage}>
                {message.text}
              </div>
            )}

            <label style={styles.label}>
              Opisz problem behawioralny<span style={styles.required}> *</span>
            </label>
            <div style={styles.textareaWrapper}>
              <textarea
                value={opis}
                onChange={(e) => setOpis(e.target.value.slice(0, MAX_CHARS))}
                style={styles.textarea}
                placeholder="Opisz zachowanie psa, które Twoim zdaniem wymaga konsultacji behawioralnej..."
                autoFocus
              />
              <span style={styles.counter}>{opis.length}/{MAX_CHARS}</span>
            </div>

            <p style={{ color: "#6b7280", fontSize: "0.875rem", marginTop: "1rem" }}>
              Twoje imię i czas zgłoszenia zostaną zapisane automatycznie z konta Google.
            </p>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving || !isValid}
          style={{ ...styles.saveButton, ...(saving || !isValid ? styles.saveButtonDisabled : {}) }}
        >
          {saving ? "Zapisywanie..." : <><CheckCircle size={24} style={{ marginRight: "0.75rem" }} />Wyślij zgłoszenie</>}
        </button>
      </div>
    </div>
  );
};

export default BehaviorReport;
