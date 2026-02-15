import React, { useMemo, useState } from "react";
import { X, AlertTriangle, CheckCircle } from "lucide-react";

const API_URL = "/api/gs";

const styles = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    zIndex: 1100,
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
  headerTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "0.5rem",
  },
  title: { fontSize: "1.5rem", fontWeight: "bold" },
  subtitle: { opacity: 0.9, fontSize: "0.875rem" },
  closeButton: {
    background: "rgba(255,255,255,0.2)",
    border: "none",
    cursor: "pointer",
    color: "white",
    padding: "0.5rem",
    borderRadius: "0.5rem",
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
    width: "100%",
    padding: "0.75rem",
    border: "2px solid #e5e7eb",
    borderRadius: "0.5rem",
    fontSize: "0.95rem",
    outline: "none",
    fontFamily: "inherit",
  },
  select: {
    width: "100%",
    padding: "0.75rem",
    border: "2px solid #e5e7eb",
    borderRadius: "0.5rem",
    fontSize: "0.95rem",
    outline: "none",
    fontFamily: "inherit",
    backgroundColor: "white",
  },
  textarea: {
    width: "100%",
    padding: "0.75rem",
    border: "2px solid #e5e7eb",
    borderRadius: "0.5rem",
    fontSize: "0.875rem",
    outline: "none",
    minHeight: "110px",
    resize: "vertical",
    fontFamily: "inherit",
  },

  checkboxGroup: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: "0.5rem",
  },
  checkboxLabel: {
    display: "flex",
    alignItems: "flex-start",
    padding: "0.75rem",
    border: "2px solid #e5e7eb",
    borderRadius: "0.5rem",
    cursor: "pointer",
    transition: "all 0.2s",
    backgroundColor: "white",
  },
  checkboxLabelChecked: {
    borderColor: "#f59e0b",
    backgroundColor: "#fffbeb",
  },
  checkbox: {
    width: "1.25rem",
    height: "1.25rem",
    marginRight: "0.75rem",
    cursor: "pointer",
    flexShrink: 0,
    marginTop: "0.125rem",
  },
  checkboxText: { fontSize: "0.875rem", color: "#374151", lineHeight: "1.4" },

  saveButton: {
    position: "fixed",
    bottom: "1rem",
    left: "1rem",
    right: "1rem",
    maxWidth: "700px",
    margin: "0 auto",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "1rem",
    backgroundColor: "#f59e0b",
    color: "white",
    border: "none",
    borderRadius: "0.75rem",
    fontSize: "1.125rem",
    fontWeight: "800",
    cursor: "pointer",
    boxShadow: "0 4px 12px rgba(245, 158, 11, 0.35)",
    zIndex: 1101,
  },
  saveButtonDisabled: {
    backgroundColor: "#9ca3af",
    cursor: "not-allowed",
    boxShadow: "none",
  },

  successMessage: {
    padding: "1rem",
    backgroundColor: "#dcfce7",
    color: "#166534",
    borderRadius: "0.5rem",
    marginBottom: "1rem",
    textAlign: "center",
    fontWeight: "700",
  },
  errorMessage: {
    padding: "1rem",
    backgroundColor: "#fee2e2",
    color: "#991b1b",
    borderRadius: "0.5rem",
    marginBottom: "1rem",
    textAlign: "center",
    fontWeight: "700",
  },
};

const BehaviorReport = ({ dog, onClose }) => {
  const [volunteerName, setVolunteerName] = useState("");
  const [priority, setPriority] = useState("Średni");
  const [reason, setReason] = useState("");

  const [pProvocation, setPProvocation] = useState("");
  const [pProportion, setPProportion] = useState("");
  const [pPersistence, setPPersistence] = useState("");

  const [bankSelected, setBankSelected] = useState([]);
  const [riskSelected, setRiskSelected] = useState([]);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const bank = useMemo(
    () => ({
      Emocje: [
        "Nadmierne dyszenie/ślinienie",
        "Zamieranie (freeze)",
        "Drżenie",
        "Chowanie się",
      ],
      Relacje: [
        "Łapanie za smycz/ubranie (mouthiness)",
        "Skakanie",
        "Lunging (wyrywanie się)",
        "Twarde spojrzenie (hard eye)",
      ],
      Dobrostan: [
        "Brak zainteresowania smakołykami",
        "Kręcenie się w kółko (stereotypie)",
        "Nagła zmiana zachowania (podejrzenie bólu)",
      ],
    }),
    []
  );

  const riskOptions = useMemo(
    () => [
      "Zagrożenie dla wolontariusza",
      "Zagrożenie dla innych psów",
      "Samookaleczenie psa",
    ],
    []
  );

  const toggle = (value, state, setState) => {
    if (state.includes(value)) setState(state.filter((v) => v !== value));
    else setState([...state, value]);
  };

  const isValid = () =>
    volunteerName.trim().length >= 2 && reason !== "" && pProvocation.trim() !== "";

  const handleSave = async () => {
    if (!isValid()) {
      setMessage({
        type: "error",
        text: "❌ Uzupełnij: kto zgłasza, powód oraz Prowokację (3P).",
      });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const payload = {
        action: "addBehaviorReport",
        dogId: dog?.id,
        dogName: dog?.name,
        volunteer: volunteerName.trim(),
        priority,
        reason,
        threeP: {
          provocation: pProvocation.trim(),
          proportion: pProportion.trim(),
          persistence: pPersistence.trim(),
        },
        bank: bankSelected,
        risk: riskSelected,
      };

      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      let result = null;
      try {
        result = await response.json();
      } catch {
        result = null;
      }

      const ok =
        result?.success === true ||
        (result?.ok === true && result?.data?.success === true) ||
        result?.status === "success";

      if (ok) {
        setMessage({
          type: "success",
          text: `✅ Zgłoszenie przyjęte. Pies ${dog?.name} został wpisany na listę do konsultacji.`,
        });
        setTimeout(() => {
          onClose && onClose();
        }, 1200);
      } else {
        setMessage({
          type: "error",
          text: "❌ Błąd: " + (result?.error || result?.message || "Nieznany błąd"),
        });
      }
    } catch (err) {
      console.error("Błąd zgłoszenia:", err);
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
                <p style={styles.subtitle}>
                  {dog?.name} ({dog?.id})
                </p>
              </div>
              <button onClick={onClose} style={styles.closeButton}>
                <X size={24} />
              </button>
            </div>
          </div>

          <div style={styles.content}>
            {message && (
              <div
                style={
                  message.type === "success"
                    ? styles.successMessage
                    : styles.errorMessage
                }
              >
                {message.text}
              </div>
            )}

            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>A. Identyfikacja</h3>

              <div style={styles.question}>
                <label style={styles.questionLabel}>
                  Imię / ksywa wolontariusza <span style={styles.required}>*</span>
                </label>
                <input
                  value={volunteerName}
                  onChange={(e) => setVolunteerName(e.target.value)}
                  style={styles.input}
                  placeholder="np. Ania / Bartek"
                />
              </div>

              <div style={styles.question}>
                <label style={styles.questionLabel}>Priorytet:</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  style={styles.select}
                >
                  <option>Niski</option>
                  <option>Średni</option>
                  <option>Wysoki</option>
                  <option>Pilny</option>
                </select>
              </div>
            </div>

            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>B. Powód zgłoszenia</h3>
              <div style={styles.question}>
                <label style={styles.questionLabel}>
                  Wybierz powód <span style={styles.required}>*</span>
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  style={styles.select}
                >
                  <option value="">— wybierz —</option>
                  <option>Pogorszenie stanu psychicznego (deterioracja)</option>
                  <option>Nowe zachowanie lękowe/agresywne</option>
                  <option>Trudności w obsłudze (np. problem z powrotem do boksu)</option>
                  <option>Podejrzenie bólu/choroby</option>
                </select>
              </div>
            </div>

            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>C. Opis incydentu (Model 3P)</h3>

              <div style={styles.question}>
                <label style={styles.questionLabel}>
                  Prowokacja (co dokładnie wywołało zachowanie?){" "}
                  <span style={styles.required}>*</span>
                </label>
                <textarea
                  value={pProvocation}
                  onChange={(e) => setPProvocation(e.target.value)}
                  style={styles.textarea}
                  placeholder='np. "Widział psa za siatką / próba podejścia obcej osoby / zapięcie smyczy"'
                />
              </div>

              <div style={styles.question}>
                <label style={styles.questionLabel}>
                  Proporcja (jak silna była reakcja vs wyzwalacz?)
                </label>
                <textarea
                  value={pProportion}
                  onChange={(e) => setPProportion(e.target.value)}
                  style={styles.textarea}
                  placeholder='np. "Szczeknął 2x i wrócił / wpadł w szał, rzuty, nie dało się odejść"'
                />
              </div>

              <div style={styles.question}>
                <label style={styles.questionLabel}>
                  Persystencja (ile czasu wracał do spokoju?)
                </label>
                <textarea
                  value={pPersistence}
                  onChange={(e) => setPPersistence(e.target.value)}
                  style={styles.textarea}
                  placeholder='np. "po 30 sekundach ok / 5 minut i dalej napięty"'
                />
              </div>
            </div>

            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>D. Bank słów</h3>

              {Object.entries(bank).map(([groupName, options]) => (
                <div key={groupName} style={{ marginBottom: "1rem" }}>
                  <div
                    style={{
                      fontWeight: 800,
                      marginBottom: "0.5rem",
                      color: "#111827",
                    }}
                  >
                    {groupName}
                  </div>

                  <div style={styles.checkboxGroup}>
                    {options.map((opt) => (
                      <label
                        key={opt}
                        style={{
                          ...styles.checkboxLabel,
                          ...(bankSelected.includes(opt)
                            ? styles.checkboxLabelChecked
                            : {}),
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={bankSelected.includes(opt)}
                          onChange={() => toggle(opt, bankSelected, setBankSelected)}
                          style={styles.checkbox}
                        />
                        <span style={styles.checkboxText}>{opt}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>E. Ocena ryzyka</h3>
              <div style={styles.checkboxGroup}>
                {riskOptions.map((opt) => (
                  <label
                    key={opt}
                    style={{
                      ...styles.checkboxLabel,
                      ...(riskSelected.includes(opt)
                        ? styles.checkboxLabelChecked
                        : {}),
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={riskSelected.includes(opt)}
                      onChange={() => toggle(opt, riskSelected, setRiskSelected)}
                      style={styles.checkbox}
                    />
                    <span style={styles.checkboxText}>{opt}</span>
                  </label>
                ))}
              </div>

              <div
                style={{
                  marginTop: "1rem",
                  padding: "0.75rem",
                  borderRadius: "0.75rem",
                  backgroundColor: "#fffbeb",
                  color: "#92400e",
                  display: "flex",
                  gap: "0.75rem",
                  alignItems: "flex-start",
                }}
              >
                <AlertTriangle size={20} style={{ marginTop: "2px" }} />
                <div style={{ fontSize: "0.9rem", lineHeight: 1.4 }}>
                  Zasada: <b>maks 2 minuty</b>. Zaznacz co trzeba, dopisz krótko 3P i jedziemy dalej.
                </div>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving || !isValid()}
          style={{
            ...styles.saveButton,
            ...(saving || !isValid() ? styles.saveButtonDisabled : {}),
          }}
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
