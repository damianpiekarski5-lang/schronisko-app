import React, { useMemo, useState } from "react";
import { X, AlertTriangle, CheckCircle } from "lucide-react";

const API_URL = "/api/gs";

const styles = {
  overlay: { position: "fixed", inset: 0, backgroundColor: "rgba(0, 0, 0, 0.5)", zIndex: 1100, overflowY: "auto" },
  container: { minHeight: "100vh", padding: "1rem", paddingBottom: "6rem" },
  panel: {
    backgroundColor: "white",
    borderRadius: "1rem",
    maxWidth: "700px",
    margin: "0 auto",
    boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
  },
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
  closeButton: {
    background: "rgba(255,255,255,0.2)", border: "none", cursor: "pointer", color: "white", padding: "0.5rem", borderRadius: "0.5rem",
  },
  content: { padding: "1.5rem" },
  section: { marginBottom: "2rem" },
  sectionTitle: {
    fontSize: "1.125rem",
    fontWeight: "bold",
    color: "#111827",
    marginBottom: "1rem",
    paddingBottom: "0.5rem",
    borderBottom: "2px solid #e5e7eb",
  },
  question: { marginBottom: "1.25rem" },
  questionLabel: {
    fontSize: "0.875rem",
    fontWeight: "600",
    color: "#374151",
    marginBottom: "0.75rem",
    display: "block",
  },
  required: { color: "#ef4444", marginLeft: "0.25rem" },
  input: {
    width: "100%", padding: "0.75rem", border: "2px solid #e5e7eb", borderRadius: "0.5rem", fontSize: "0.95rem", outline: "none", fontFamily: "inherit",
  },
  inputReadonly: { backgroundColor: "#f9fafb", color: "#4b5563" },
  textarea: {
    width: "100%", padding: "0.75rem", border: "2px solid #e5e7eb", borderRadius: "0.5rem", fontSize: "0.875rem", outline: "none", minHeight: "110px", resize: "vertical", fontFamily: "inherit",
  },
  radioGroup: { display: "grid", gridTemplateColumns: "1fr", gap: "0.5rem" },
  radioCard: {
    display: "flex", alignItems: "center", padding: "0.75rem", border: "2px solid #e5e7eb", borderRadius: "0.5rem", cursor: "pointer", backgroundColor: "white",
  },
  radioCardChecked: { borderColor: "#f59e0b", backgroundColor: "#fffbeb" },
  radio: { width: "1.25rem", height: "1.25rem", marginRight: "0.75rem", cursor: "pointer" },
  checkboxGroup: { display: "grid", gridTemplateColumns: "1fr", gap: "0.5rem" },
  checkboxCard: {
    display: "flex", alignItems: "flex-start", padding: "0.75rem", border: "2px solid #e5e7eb", borderRadius: "0.5rem", cursor: "pointer", backgroundColor: "white",
  },
  checkboxCardChecked: { borderColor: "#f59e0b", backgroundColor: "#fffbeb" },
  checkbox: { width: "1.25rem", height: "1.25rem", marginRight: "0.75rem", marginTop: "0.125rem", cursor: "pointer" },
  helper: { color: "#6b7280", fontSize: "0.8rem", marginTop: "0.35rem" },
  successMessage: {
    padding: "1rem", backgroundColor: "#dcfce7", color: "#166534", borderRadius: "0.5rem", marginBottom: "1rem", textAlign: "center", fontWeight: "700",
  },
  errorMessage: {
    padding: "1rem", backgroundColor: "#fee2e2", color: "#991b1b", borderRadius: "0.5rem", marginBottom: "1rem", textAlign: "center", fontWeight: "700",
  },
  saveButton: {
    position: "fixed", bottom: "1rem", left: "1rem", right: "1rem", maxWidth: "700px", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", backgroundColor: "#f59e0b", color: "white", border: "none", borderRadius: "0.75rem", fontSize: "1.125rem", fontWeight: "800", cursor: "pointer", boxShadow: "0 4px 12px rgba(245, 158, 11, 0.35)", zIndex: 1101,
  },
  saveButtonDisabled: { backgroundColor: "#9ca3af", cursor: "not-allowed", boxShadow: "none" },
};

const BehaviorReport = ({ dog, onClose }) => {
  const [volunteerName, setVolunteerName] = useState("");
  const [reason, setReason] = useState("");
  const [incident3P, setIncident3P] = useState("");
  const [priority, setPriority] = useState("");
  const [tagsEmotions, setTagsEmotions] = useState([]);
  const [tagsRelations, setTagsRelations] = useState([]);
  const [tagsWelfare, setTagsWelfare] = useState([]);
  const [risk, setRisk] = useState([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const words = useMemo(
    () => ({
      Emocje: ["Nadmierne dyszenie/ślinienie", "Zamieranie (freeze)", "Drżenie", "Chowanie się"],
      Relacje: ["Łapanie za smycz/ubranie (mouthiness)", "Skakanie", "Lunging (wyrywanie się)", "Twarde spojrzenie (hard eye)"],
      Dobrostan: ["Brak zainteresowania smakołykami", "Kręcenie się w kółko (stereotypie)", "Nagła zmiana zachowania (podejrzenie bólu)"],
    }),
    []
  );

  const riskOptions = useMemo(
    () => ["Zagrożenie dla wolontariusza", "Zagrożenie dla innych psów", "Samookaleczenie psa"],
    []
  );

  const reasons = [
    "Pogorszenie stanu psychicznego",
    "Nowe zachowanie lękowe/agresywne",
    "Trudności w obsłudze",
    "Podejrzenie bólu/choroby",
  ];

  const priorities = ["Niski", "Średni", "Wysoki"];

  const toggle = (value, list, setList) => {
    if (list.includes(value)) setList(list.filter((entry) => entry !== value));
    else setList([...list, value]);
  };

  const isValid =
    volunteerName.trim().length >= 2 && reason.trim().length > 0 && priority.trim().length > 0;

  const handleSave = async () => {
    if (!isValid) {
      setMessage({ type: "error", text: "❌ Uzupełnij: imię wolontariusza, powód i priorytet." });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reportBehavior",
          dogName: dog?.name || "",
          dogId: dog?.id || "",
          volunteerName: volunteerName.trim(),
          reason,
          incident3P: incident3P.trim().slice(0, 800),
          tagsEmotions: tagsEmotions.join(", "),
          tagsRelations: tagsRelations.join(", "),
          tagsWelfare: tagsWelfare.join(", "),
          risk: risk.join(", "),
          priority,
        }),
      });

      const result = await response.json();
      console.log("reportBehavior response:", result);

      if (result?.ok === true && result?.data?.success === true) {
        setMessage({
          type: "success",
          text: `Zgłoszenie przyjęte, pies ${dog?.name} wpisany na listę do konsultacji behawioralnej`,
        });
        setTimeout(() => onClose && onClose(), 1300);
      } else {
        setMessage({
          type: "error",
          text: "❌ Błąd: " + (result?.error || "Nie udało się zapisać zgłoszenia"),
        });
      }
    } catch (error) {
      console.error("reportBehavior error:", error);
      setMessage({ type: "error", text: "❌ Błąd połączenia" });
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
                <h2 style={styles.title}>🧠 Zgłoszenie do pracy behawioralnej</h2>
                <p style={styles.subtitle}>{dog?.name} ({dog?.id})</p>
              </div>
              <button onClick={onClose} style={styles.closeButton}><X size={24} /></button>
            </div>
          </div>

          <div style={styles.content}>
            {message && <div style={message.type === "success" ? styles.successMessage : styles.errorMessage}>{message.text}</div>}

            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>A. Identyfikacja</h3>
              <div style={styles.question}>
                <label style={styles.questionLabel}>Imię psa</label>
                <input value={dog?.name || ""} readOnly style={{ ...styles.input, ...styles.inputReadonly }} />
              </div>
              <div style={styles.question}>
                <label style={styles.questionLabel}>ID psa</label>
                <input value={dog?.id || ""} readOnly style={{ ...styles.input, ...styles.inputReadonly }} />
              </div>
              <div style={styles.question}>
                <label style={styles.questionLabel}>Imię wolontariusza <span style={styles.required}>*</span></label>
                <input value={volunteerName} onChange={(e) => setVolunteerName(e.target.value)} style={styles.input} placeholder="np. Anna Kowalska" />
              </div>
              <div style={styles.question}>
                <label style={styles.questionLabel}>Data</label>
                <input value="Teraz (timestamp doda backend)" readOnly style={{ ...styles.input, ...styles.inputReadonly }} />
              </div>
            </div>

            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>B. Powód zgłoszenia</h3>
              <div style={styles.radioGroup}>
                {reasons.map((option) => (
                  <label key={option} style={{ ...styles.radioCard, ...(reason === option ? styles.radioCardChecked : {}) }}>
                    <input type="radio" name="reason" checked={reason === option} onChange={() => setReason(option)} style={styles.radio} />
                    {option}
                  </label>
                ))}
              </div>
            </div>

            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>C. Opis incydentu</h3>
              <label style={styles.questionLabel}>Krótka notatka (3P: Prowokacja, Proporcja, Persystencja)</label>
              <textarea
                value={incident3P}
                onChange={(e) => setIncident3P(e.target.value.slice(0, 800))}
                style={styles.textarea}
                placeholder="Co wywołało zachowanie, jak silna była reakcja, jak długo trwała?"
              />
              <div style={styles.helper}>{incident3P.length}/800 znaków</div>
            </div>

            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>D. Bank słów</h3>
              {Object.entries(words).map(([group, options]) => {
                const state = group === "Emocje" ? tagsEmotions : group === "Relacje" ? tagsRelations : tagsWelfare;
                const setter = group === "Emocje" ? setTagsEmotions : group === "Relacje" ? setTagsRelations : setTagsWelfare;

                return (
                  <div key={group} style={{ marginBottom: "1rem" }}>
                    <div style={{ fontWeight: 800, marginBottom: "0.5rem", color: "#111827" }}>{group}</div>
                    <div style={styles.checkboxGroup}>
                      {options.map((option) => (
                        <label key={option} style={{ ...styles.checkboxCard, ...(state.includes(option) ? styles.checkboxCardChecked : {}) }}>
                          <input type="checkbox" checked={state.includes(option)} onChange={() => toggle(option, state, setter)} style={styles.checkbox} />
                          {option}
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>E. Ocena ryzyka</h3>
              <div style={styles.checkboxGroup}>
                {riskOptions.map((option) => (
                  <label key={option} style={{ ...styles.checkboxCard, ...(risk.includes(option) ? styles.checkboxCardChecked : {}) }}>
                    <input type="checkbox" checked={risk.includes(option)} onChange={() => toggle(option, risk, setRisk)} style={styles.checkbox} />
                    {option}
                  </label>
                ))}
              </div>
            </div>

            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>F. Priorytet</h3>
              <div style={styles.radioGroup}>
                {priorities.map((option) => (
                  <label key={option} style={{ ...styles.radioCard, ...(priority === option ? styles.radioCardChecked : {}) }}>
                    <input type="radio" name="priority" checked={priority === option} onChange={() => setPriority(option)} style={styles.radio} />
                    {option}
                  </label>
                ))}
              </div>
              <div style={{ marginTop: "1rem", padding: "0.75rem", borderRadius: "0.75rem", backgroundColor: "#fffbeb", color: "#92400e", display: "flex", gap: "0.75rem" }}>
                <AlertTriangle size={20} />
                <div style={{ fontSize: "0.9rem" }}>Wypełnienie powinno zająć około 2 minuty.</div>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving || !isValid}
          style={{ ...styles.saveButton, ...(saving || !isValid ? styles.saveButtonDisabled : {}) }}
        >
          {saving ? (
            <>Zapisywanie...</>
          ) : (
            <>
              <CheckCircle size={24} style={{ marginRight: "0.75rem" }} />
              Wyślij zgłoszenie
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default BehaviorReport;
