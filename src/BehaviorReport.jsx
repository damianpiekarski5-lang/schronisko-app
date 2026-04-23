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
  saveHint: {
    position: "fixed",
    bottom: "5.25rem",
    left: "1rem",
    right: "1rem",
    maxWidth: "700px",
    margin: "0 auto",
    padding: "0.65rem 0.85rem",
    borderRadius: "0.65rem",
    fontSize: "0.875rem",
    fontWeight: "600",
    textAlign: "center",
    zIndex: 1101,
  },
  saveHintSuccess: { backgroundColor: "#dcfce7", color: "#166534" },
  saveHintError: { backgroundColor: "#fee2e2", color: "#991b1b" },
};

const BehaviorReport = ({ dog, onClose, currentUser }) => {
  const [context, setContext] = useState([]);
  const [mainConcern, setMainConcern] = useState("");
  const [trigger, setTrigger] = useState("");
  const [proportion, setProportion] = useState("");
  const [persistence, setPersistence] = useState("");
  const [fearSignals, setFearSignals] = useState([]);
  const [arousalSignals, setArousalSignals] = useState([]);
  const [resourceSignals, setResourceSignals] = useState([]);
  const [risk, setRisk] = useState([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const contextOptions = useMemo(
    () => [
      "Wyjście z boksu / powrót do boksu",
      "Spacer na smyczy (reakcja na otoczenie)",
      "Bezpośredni kontakt / głaskanie",
      "Reakcja na inne zwierzęta",
      "Inne",
    ],
    []
  );

  const reasons = useMemo(
    () => [
      "Nagłe pogorszenie stanu: Pies stał się apatyczny lub nadmiernie pobudzony",
      "Problemy z obsługą: Trudności z zapięciem obroży/smyczy",
      "Zachowania lękowe: Pies kuli się, drży, unika kontaktu",
      "Agresja/Reaktywność: Warczenie, kłapanie, lunging (rzucanie się)",
      "Zachowania stereotypowe: Kręcenie się w kółko, wygryzanie łap",
    ],
    []
  );

  const fearSignalOptions = useMemo(
    () => [
      '"Oko wieloryba" (whale eye – widoczne białka oczu)',
      "Twarde, nieruchome spojrzenie (hard stare)",
      "Piloerekcja (zjeżona sierść na karku/grzbiecie)",
      "Nadmierne dyszenie lub ślinienie (nie z gorąca)",
      "Oblizywanie pyska / ziewanie",
      "Zamieranie w bezruchu (freeze)",
    ],
    []
  );

  const arousalSignalOptions = useMemo(
    () => [
      "Łapanie za smycz / ubranie (mouthy)",
      "Skakanie na człowieka (trudne do przerwania)",
      "Wyrywanie się w stronę bodźca",
      "Podszczypywanie (bolesne lub niebolesne)",
    ],
    []
  );

  const resourceSignalOptions = useMemo(
    () => ["Zamieranie/Warczenie przy misce lub zabawce"],
    []
  );

  const riskOptions = useMemo(
    () => [
      "Pies stanowi bezpośrednie zagrożenie dla wolontariusza",
      "Pies może zranić inne zwierzęta",
      "Pies rani samego siebie (np. gryzie ogon)",
    ],
    []
  );

  const toggle = (value, list, setList) => {
    if (list.includes(value)) setList(list.filter((entry) => entry !== value));
    else setList([...list, value]);
  };

  const isValid = mainConcern.trim().length > 0;

  const handleSave = async () => {
    if (!isValid) {
      setMessage({ type: "error", text: "❌ Uzupełnij główny powód zgłoszenia." });
      return;
    }

    if (!currentUser) {
      setMessage({ type: "error", text: "❌ Zaloguj się, aby wysłać zgłoszenie." });
      return;
    }

    const incident3P = [
      `Kontekst: ${context.length ? context.join(", ") : "brak danych"}`,
      `Prowokacja (wyzwalacz): ${trigger.trim() || "brak danych"}`,
      `Proporcja: ${proportion || "brak danych"}`,
      `Persystencja: ${persistence || "brak danych"}`,
    ].join("\n");

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
          dogName: dog?.name || "",
          dogId: dog?.id || "",
          reason: mainConcern,
          incident3P: incident3P.slice(0, 800),
          tagsEmotions: fearSignals.join(", "),
          tagsRelations: [...arousalSignals, ...resourceSignals].join(", "),
          tagsWelfare: context.join(", "),
          risk: risk.join(", "),
          priority: "Do konsultacji",
        }),
      });

      const result = await response.json();

      if (result?.ok === true && result?.data?.success === true) {
        setMessage({
          type: "success",
          text: `✅ Zgłoszenie zapisane i przekazane do konsultacji behawioralnej dla psa ${dog?.name}.`,
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
                <h2 style={styles.title}>🧠 Zgłoszenie do konsultacji behawioralnej</h2>
                <p style={styles.subtitle}>{dog?.name} ({dog?.id})</p>
              </div>
              <button onClick={onClose} style={styles.closeButton}><X size={24} /></button>
            </div>
          </div>

          <div style={styles.content}>
            {message && <div style={message.type === "success" ? styles.successMessage : styles.errorMessage}>{message.text}</div>}

            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>Dane podstawowe</h3>
              <div style={styles.question}>
                <label style={styles.questionLabel}>Imię psa / ID</label>
                <input value={`${dog?.name || ""} (${dog?.id || ""})`} readOnly style={{ ...styles.input, ...styles.inputReadonly }} />
              </div>
              <div style={styles.question}>
                <label style={styles.questionLabel}>Data i godzina</label>
                <input value="Uzupełniane automatycznie przy zapisie" readOnly style={{ ...styles.input, ...styles.inputReadonly }} />
              </div>
              <p style={{ color: "#374151", fontSize: "0.875rem" }}>
                Wolontariusz zostanie zapisany automatycznie z konta Google.
              </p>
            </div>

            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>1. Kontekst (Gdzie i kiedy wystąpił problem?)</h3>
              <div style={styles.checkboxGroup}>
                {contextOptions.map((option) => (
                  <label key={option} style={{ ...styles.checkboxCard, ...(context.includes(option) ? styles.checkboxCardChecked : {}) }}>
                    <input type="checkbox" checked={context.includes(option)} onChange={() => toggle(option, context, setContext)} style={styles.checkbox} />
                    {option}
                  </label>
                ))}
              </div>
            </div>

            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>2. Powód zgłoszenia (Główna obawa)</h3>
              <div style={styles.radioGroup}>
                {reasons.map((option) => (
                  <label key={option} style={{ ...styles.radioCard, ...(mainConcern === option ? styles.radioCardChecked : {}) }}>
                    <input type="radio" name="mainConcern" checked={mainConcern === option} onChange={() => setMainConcern(option)} style={styles.radio} />
                    {option}
                  </label>
                ))}
              </div>
            </div>

            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>3. Analiza incydentu (Model Trzech P)</h3>
              <div style={styles.question}>
                <label style={styles.questionLabel}>Prowokacja (wyzwalacz) – co wywołało reakcję?</label>
                <textarea value={trigger} onChange={(e) => setTrigger(e.target.value.slice(0, 350))} style={styles.textarea} placeholder="np. widok mężczyzny, inny pies, dotyk łapy" />
                <div style={styles.helper}>{trigger.length}/350 znaków</div>
              </div>
              <div style={styles.question}>
                <label style={styles.questionLabel}>Proporcja – czy reakcja była adekwatna do bodźca?</label>
                <div style={styles.radioGroup}>
                  {["Tak", "Nie (reakcja była ekstremalna)"].map((option) => (
                    <label key={option} style={{ ...styles.radioCard, ...(proportion === option ? styles.radioCardChecked : {}) }}>
                      <input type="radio" name="proportion" checked={proportion === option} onChange={() => setProportion(option)} style={styles.radio} />
                      {option}
                    </label>
                  ))}
                </div>
              </div>
              <div style={styles.question}>
                <label style={styles.questionLabel}>Persystencja (powrót do równowagi) – jak długo pies się uspokajał?</label>
                <div style={styles.radioGroup}>
                  {["< 2 minuty", "> 2 minuty (powolny powrót do spokoju)"].map((option) => (
                    <label key={option} style={{ ...styles.radioCard, ...(persistence === option ? styles.radioCardChecked : {}) }}>
                      <input type="radio" name="persistence" checked={persistence === option} onChange={() => setPersistence(option)} style={styles.radio} />
                      {option}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>4. Checklista zachowań</h3>
              <div style={{ fontWeight: 800, marginBottom: "0.5rem", color: "#111827" }}>Lęk i niepokój:</div>
              <div style={styles.checkboxGroup}>
                {fearSignalOptions.map((option) => (
                  <label key={option} style={{ ...styles.checkboxCard, ...(fearSignals.includes(option) ? styles.checkboxCardChecked : {}) }}>
                    <input type="checkbox" checked={fearSignals.includes(option)} onChange={() => toggle(option, fearSignals, setFearSignals)} style={styles.checkbox} />
                    {option}
                  </label>
                ))}
              </div>

              <div style={{ fontWeight: 800, margin: "1rem 0 0.5rem", color: "#111827" }}>Pobudzenie i frustracja:</div>
              <div style={styles.checkboxGroup}>
                {arousalSignalOptions.map((option) => (
                  <label key={option} style={{ ...styles.checkboxCard, ...(arousalSignals.includes(option) ? styles.checkboxCardChecked : {}) }}>
                    <input type="checkbox" checked={arousalSignals.includes(option)} onChange={() => toggle(option, arousalSignals, setArousalSignals)} style={styles.checkbox} />
                    {option}
                  </label>
                ))}
              </div>

              <div style={{ fontWeight: 800, margin: "1rem 0 0.5rem", color: "#111827" }}>Obrona zasobów (jeśli dotyczy):</div>
              <div style={styles.checkboxGroup}>
                {resourceSignalOptions.map((option) => (
                  <label key={option} style={{ ...styles.checkboxCard, ...(resourceSignals.includes(option) ? styles.checkboxCardChecked : {}) }}>
                    <input type="checkbox" checked={resourceSignals.includes(option)} onChange={() => toggle(option, resourceSignals, setResourceSignals)} style={styles.checkbox} />
                    {option}
                  </label>
                ))}
              </div>
            </div>

            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>5. Ocena ryzyka</h3>
              <div style={styles.checkboxGroup}>
                {riskOptions.map((option) => (
                  <label key={option} style={{ ...styles.checkboxCard, ...(risk.includes(option) ? styles.checkboxCardChecked : {}) }}>
                    <input type="checkbox" checked={risk.includes(option)} onChange={() => toggle(option, risk, setRisk)} style={styles.checkbox} />
                    {option}
                  </label>
                ))}
              </div>

              <div style={{ marginTop: "1rem", padding: "0.75rem", borderRadius: "0.75rem", backgroundColor: "#fffbeb", color: "#92400e", display: "flex", gap: "0.75rem" }}>
                <AlertTriangle size={20} />
                <div style={{ fontSize: "0.9rem" }}>Opisuj to, co pies robi. Jeśli pies wykazuje agresję, przerwij spacer i zgłoś to natychmiast.</div>
              </div>
            </div>
          </div>
        </div>

        {message && (
          <div
            style={{
              ...styles.saveHint,
              ...(message.type === "success"
                ? styles.saveHintSuccess
                : styles.saveHintError),
            }}
          >
            {message.text}
          </div>
        )}

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
