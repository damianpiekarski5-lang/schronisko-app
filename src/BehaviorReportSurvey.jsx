import React, { useMemo, useState } from "react";
import { X, Briefcase } from "lucide-react";

const API_URL = "/api/gs";

const styles = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    zIndex: 1000,
    overflowY: "auto",
  },
  container: {
    minHeight: "100vh",
    padding: "1rem",
    paddingBottom: "6rem",
  },
  panel: {
    backgroundColor: "white",
    borderRadius: "1rem",
    maxWidth: "600px",
    margin: "0 auto",
    boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
  },
  header: {
    background: "linear-gradient(135deg, #7c3aed, #5b21b6)",
    padding: "1.5rem",
    borderTopLeftRadius: "1rem",
    borderTopRightRadius: "1rem",
    color: "white",
  },
  headerTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "0.5rem",
  },
  title: { fontSize: "1.25rem", fontWeight: "bold" },
  subtitle: { opacity: 0.9, fontSize: "0.875rem" },
  closeButton: {
    background: "rgba(255,255,255,0.2)",
    border: "none",
    cursor: "pointer",
    color: "white",
    padding: "0.5rem",
    borderRadius: "0.5rem",
  },
  content: { padding: "1.25rem" },
  sectionTitle: {
    fontSize: "1rem",
    fontWeight: "bold",
    color: "#111827",
    marginBottom: "0.75rem",
  },
  field: { marginBottom: "1rem" },
  label: {
    fontSize: "0.875rem",
    fontWeight: "600",
    color: "#374151",
    marginBottom: "0.4rem",
    display: "block",
  },
  required: { color: "#ef4444", marginLeft: "0.25rem" },
  input: {
    width: "100%",
    padding: "0.75rem",
    border: "2px solid #e5e7eb",
    borderRadius: "0.5rem",
    fontSize: "0.875rem",
    outline: "none",
    fontFamily: "inherit",
    boxSizing: "border-box",
  },
  textarea: {
    width: "100%",
    padding: "0.75rem",
    border: "2px solid #e5e7eb",
    borderRadius: "0.5rem",
    fontSize: "0.875rem",
    outline: "none",
    minHeight: "90px",
    resize: "vertical",
    fontFamily: "inherit",
    boxSizing: "border-box",
  },
  select: {
    width: "100%",
    padding: "0.75rem",
    border: "2px solid #e5e7eb",
    borderRadius: "0.5rem",
    fontSize: "0.875rem",
    outline: "none",
    fontFamily: "inherit",
    backgroundColor: "white",
    boxSizing: "border-box",
  },
  saveButton: {
    position: "fixed",
    bottom: "1rem",
    left: "1rem",
    right: "1rem",
    maxWidth: "600px",
    margin: "0 auto",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "1rem",
    backgroundColor: "#7c3aed",
    color: "white",
    border: "none",
    borderRadius: "0.75rem",
    fontSize: "1.05rem",
    fontWeight: "700",
    cursor: "pointer",
    boxShadow: "0 4px 12px rgba(124, 58, 237, 0.35)",
    zIndex: 1001,
  },
  saveButtonDisabled: {
    backgroundColor: "#9ca3af",
    cursor: "not-allowed",
    boxShadow: "none",
  },
  successMessage: {
    padding: "0.75rem",
    backgroundColor: "#dcfce7",
    color: "#166534",
    borderRadius: "0.5rem",
    marginBottom: "1rem",
    fontWeight: "600",
  },
  errorMessage: {
    padding: "0.75rem",
    backgroundColor: "#fee2e2",
    color: "#991b1b",
    borderRadius: "0.5rem",
    marginBottom: "1rem",
    fontWeight: "600",
  },
};

const toCsv = (value) =>
  String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .join(", ");

const BehaviorReportSurvey = ({ dog, currentUser, onClose, onSave }) => {
  const [reason, setReason] = useState("");
  const [incident3P, setIncident3P] = useState("");
  const [tagsEmotions, setTagsEmotions] = useState("");
  const [tagsRelations, setTagsRelations] = useState("");
  const [tagsWelfare, setTagsWelfare] = useState("");
  const [risk, setRisk] = useState("LOW");
  const [priority, setPriority] = useState("MEDIUM");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const dogId = useMemo(
    () => String(dog?.id ?? dog?.dogId ?? dog?.ID ?? "").trim(),
    [dog]
  );

  const dogName = useMemo(() => String(dog?.name ?? "").trim(), [dog]);

  const canSubmit = reason.trim().length > 0 && !saving;

  const handleSave = async () => {
    if (!reason.trim()) {
      setMessage({ type: "error", text: "❌ Uzupełnij opis problemu." });
      return;
    }

    if (!currentUser) {
      setMessage({ type: "error", text: "❌ Zaloguj się, aby wysłać zgłoszenie." });
      return;
    }

    if (!dogId || !dogName) {
      setMessage({ type: "error", text: "❌ Brak imienia lub ID psa." });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const token = await currentUser.getIdToken();
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: "reportBehavior",
          dogName,
          dogId,
          reason: reason.trim(),
          incident3P: incident3P.trim(),
          tagsEmotions: toCsv(tagsEmotions),
          tagsRelations: toCsv(tagsRelations),
          tagsWelfare: toCsv(tagsWelfare),
          risk,
          priority,
          user: {
            displayName: currentUser.displayName,
            email: currentUser.email,
          },
        }),
      });

      const result = await response.json();
      const isSuccess =
        response.ok &&
        result?.ok === true &&
        (result?.data?.success === true || result?.success === true || result?.data === undefined);

      if (isSuccess) {
        setMessage({ type: "success", text: "✅ Zgłoszenie wysłane do behawiorysty." });
        setTimeout(() => {
          onSave && onSave();
          onClose && onClose();
        }, 1000);
      } else {
        setMessage({
          type: "error",
          text: `❌ Nie udało się wysłać zgłoszenia. ${result?.error || "Spróbuj ponownie."}`,
        });
      }
    } catch (error) {
      console.error("reportBehavior error:", error);
      setMessage({ type: "error", text: "❌ Błąd połączenia z serwerem." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.container}>
        <div style={styles.panel}>
          <div style={styles.header}>
            <div style={styles.headerTop}>
              <div>
                <h2 style={styles.title}>🧠 Ankieta zgłoszenia behawioralnego</h2>
                <p style={styles.subtitle}>
                  {dogName} ({dogId})
                </p>
              </div>
              <button onClick={onClose} style={styles.closeButton}>
                <X size={24} />
              </button>
            </div>
          </div>

          <div style={styles.content}>
            {message && (
              <div style={message.type === "success" ? styles.successMessage : styles.errorMessage}>
                {message.text}
              </div>
            )}

            <div style={styles.field}>
              <label style={styles.label}>
                Opis problemu
                <span style={styles.required}>*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                style={styles.textarea}
                placeholder="Co się wydarzyło? Jak pies reagował?"
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Kontekst zdarzenia (3P)</label>
              <textarea
                value={incident3P}
                onChange={(e) => setIncident3P(e.target.value)}
                style={styles.textarea}
                placeholder="Przed / Podczas / Po zdarzeniu"
              />
            </div>

            <h3 style={styles.sectionTitle}>Tagi (oddzielaj przecinkami)</h3>
            <div style={styles.field}>
              <label style={styles.label}>Emocje</label>
              <input
                value={tagsEmotions}
                onChange={(e) => setTagsEmotions(e.target.value)}
                style={styles.input}
                placeholder="np. lęk, pobudzenie"
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Relacje</label>
              <input
                value={tagsRelations}
                onChange={(e) => setTagsRelations(e.target.value)}
                style={styles.input}
                placeholder="np. człowiek, inne psy"
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Dobrostan</label>
              <input
                value={tagsWelfare}
                onChange={(e) => setTagsWelfare(e.target.value)}
                style={styles.input}
                placeholder="np. ból, frustracja"
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <div style={styles.field}>
                <label style={styles.label}>Ryzyko</label>
                <select value={risk} onChange={(e) => setRisk(e.target.value)} style={styles.select}>
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
                </select>
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Priorytet</label>
                <select value={priority} onChange={(e) => setPriority(e.target.value)} style={styles.select}>
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={!canSubmit}
        style={{ ...styles.saveButton, ...(!canSubmit ? styles.saveButtonDisabled : {}) }}
      >
        <Briefcase size={22} style={{ marginRight: "0.65rem" }} />
        {saving ? "Wysyłanie..." : "Wyślij zgłoszenie"}
      </button>
    </div>
  );
};

export default BehaviorReportSurvey;
