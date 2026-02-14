import React, { useState } from "react";
import { X, Save, CheckCircle } from "lucide-react";

// WAŻNE: Ten sam URL co w DashboardView.jsx i DogWorkEditor.jsx
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
    background: "linear-gradient(135deg, #22c55e, #16a34a)",
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
  title: {
    fontSize: "1.5rem",
    fontWeight: "bold",
  },
  subtitle: {
    opacity: 0.9,
    fontSize: "0.875rem",
  },
  closeButton: {
    background: "rgba(255,255,255,0.2)",
    border: "none",
    cursor: "pointer",
    color: "white",
    padding: "0.5rem",
    borderRadius: "0.5rem",
  },
  content: {
    padding: "1.5rem",
  },
  section: {
    marginBottom: "2rem",
  },
  sectionTitle: {
    fontSize: "1.125rem",
    fontWeight: "bold",
    color: "#111827",
    marginBottom: "1rem",
    paddingBottom: "0.5rem",
    borderBottom: "2px solid #e5e7eb",
  },
  question: {
    marginBottom: "1.5rem",
  },
  questionLabel: {
    fontSize: "0.875rem",
    fontWeight: "600",
    color: "#374151",
    marginBottom: "0.75rem",
    display: "block",
  },
  checkboxGroup: {
    display: "flex",
    flexDirection: "column",
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
    borderColor: "#22c55e",
    backgroundColor: "#f0fdf4",
  },
  checkbox: {
    width: "1.25rem",
    height: "1.25rem",
    marginRight: "0.75rem",
    cursor: "pointer",
    flexShrink: 0,
    marginTop: "0.125rem",
  },
  checkboxText: {
    fontSize: "0.875rem",
    color: "#374151",
    lineHeight: "1.4",
  },
  radioGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  },
  radioLabel: {
    display: "flex",
    alignItems: "center",
    padding: "0.75rem",
    border: "2px solid #e5e7eb",
    borderRadius: "0.5rem",
    cursor: "pointer",
    transition: "all 0.2s",
    backgroundColor: "white",
  },
  radioLabelChecked: {
    borderColor: "#3b82f6",
    backgroundColor: "#eff6ff",
  },
  radio: {
    width: "1.25rem",
    height: "1.25rem",
    marginRight: "0.75rem",
    cursor: "pointer",
    flexShrink: 0,
  },
  radioText: {
    fontSize: "0.875rem",
    color: "#374151",
  },
  textarea: {
    width: "100%",
    padding: "0.75rem",
    border: "2px solid #e5e7eb",
    borderRadius: "0.5rem",
    fontSize: "0.875rem",
    outline: "none",
    minHeight: "100px",
    resize: "vertical",
    fontFamily: "inherit",
  },
  required: {
    color: "#ef4444",
    marginLeft: "0.25rem",
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
    backgroundColor: "#22c55e",
    color: "white",
    border: "none",
    borderRadius: "0.75rem",
    fontSize: "1.125rem",
    fontWeight: "700",
    cursor: "pointer",
    boxShadow: "0 4px 12px rgba(34, 197, 94, 0.4)",
    zIndex: 1001,
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
    fontWeight: "600",
  },
  errorMessage: {
    padding: "1rem",
    backgroundColor: "#fee2e2",
    color: "#991b1b",
    borderRadius: "0.5rem",
    marginBottom: "1rem",
    textAlign: "center",
    fontWeight: "600",
  },
};

const WalkSurvey = ({ dog, onClose, onSave }) => {
  // Stan dla odpowiedzi
  const [contact, setContact] = useState([]);
  const [walking, setWalking] = useState([]);
  const [dogs, setDogs] = useState("");
  const [people, setPeople] = useState("");
  const [traffic, setTraffic] = useState("");
  const [emotionalState, setEmotionalState] = useState("");
  const [notes, setNotes] = useState("");

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  // Toggle checkbox
  const toggleCheckbox = (value, state, setState) => {
    if (state.includes(value)) {
      setState(state.filter((v) => v !== value));
    } else {
      setState([...state, value]);
    }
  };

  // Walidacja
  const isValid = () => {
    return emotionalState !== ""; // Tylko stan emocjonalny jest wymagany
  };

  const handleSave = async () => {
    if (!isValid()) {
      setMessage({ type: "error", text: "❌ Stan emocjonalny jest wymagany!" });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "recordWalk",
          dogId: dog.id,
          volunteer: "Wolontariusz", // Można dodać logowanie
          responses: {
            contact: contact.join(", "),
            walking: walking.join(", "),
            dogs: dogs,
            people: people,
            traffic: traffic,
            emotionalState: emotionalState,
            notes: notes,
          },
        }),
      });

      const result = await response.json();

      if (result?.ok && result?.data?.success) {
  setMessage({ type: "success", text: "✅ Spacer zapisany!" });
  onSave && onSave();
} else {
  setMessage({
    type: "error",
    text: "❌ Nie udało się zapisać ankiety: " + (result?.error || "brak info"),
  });
}
    } catch (err) {
      console.error("Błąd zapisu:", err);
      setMessage({ type: "error", text: "❌ Błąd połączenia" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.container}>
        <div style={styles.panel}>
          {/* Header */}
          <div style={styles.header}>
            <div style={styles.headerTop}>
              <div>
                <h2 style={styles.title}>🚶 Ankieta spaceru</h2>
                <p style={styles.subtitle}>
                  {dog.name} ({dog.id})
                </p>
              </div>
              <button onClick={onClose} style={styles.closeButton}>
                <X size={24} />
              </button>
            </div>
          </div>

          {/* Content */}
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

            {/* SEKCJA 1: Wyjście z boksu */}
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>1. WYJŚCIE Z BOKSU I OBSŁUGA</h3>

              <div style={styles.question}>
                <label style={styles.questionLabel}>Reakcja na kontakt:</label>
                <div style={styles.checkboxGroup}>
                  {[
                    "Chętnie podchodzi do krat boksowych",
                    "Pozwala na zapięcie smyczy",
                    "Skacze na wolontariusza z ekscytacji",
                    "Podchodzi powoli, niepewnie",
                    "Tylko obserwuje, nie podchodzi sam",
                    "Szczeka z ekscytacji (nie agresywnie)",
                    "Chwyta za smycz lub ręce",
                    "Unika kontaktu",
                    "Cofa się do tyłu boksu",
                    "Zamiera w bezruchu",
                    "Warczy lub kłapie zębami",
                  ].map((option) => (
                    <label
                      key={option}
                      style={{
                        ...styles.checkboxLabel,
                        ...(contact.includes(option)
                          ? styles.checkboxLabelChecked
                          : {}),
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={contact.includes(option)}
                        onChange={() =>
                          toggleCheckbox(option, contact, setContact)
                        }
                        style={styles.checkbox}
                      />
                      <span style={styles.checkboxText}>{option}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* SEKCJA 2: Zachowanie na spacerze */}
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>2. ZACHOWANIE NA SPACERZE</h3>

              <div style={styles.question}>
                <label style={styles.questionLabel}>Sposób chodzenia:</label>
                <div style={styles.checkboxGroup}>
                  {[
                    "Idzie na luźnej smyczy",
                    "Potrafi usiąść lub uspokoić się na chwilę na sygnał",
                    "Ciągnie umiarkowanie (da się opanować)",
                    "Silnie ciągnie",
                    "Często węszy i eksploruje teren nie zwraca uwagi na człowieka",
                    "Atakuje/gryzie smycz podczas marszu",
                    "Zapiera się / nie chce iść w konkretnym kierunku",
                    "Szarpie gwałtownie w różnych kierunkach",
                  ].map((option) => (
                    <label
                      key={option}
                      style={{
                        ...styles.checkboxLabel,
                        ...(walking.includes(option)
                          ? styles.checkboxLabelChecked
                          : {}),
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={walking.includes(option)}
                        onChange={() =>
                          toggleCheckbox(option, walking, setWalking)
                        }
                        style={styles.checkbox}
                      />
                      <span style={styles.checkboxText}>{option}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* SEKCJA 3: Reakcja na bodźce */}
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>3. REAKCJA NA BODŹCE</h3>

              {/* Inne psy */}
              <div style={styles.question}>
                <label style={styles.questionLabel}>Inne psy:</label>
                <div style={styles.radioGroup}>
                  {[
                    "Ignoruje całkowicie",
                    "Zauważa, ale szybko wraca do swoich spraw",
                    "Obserwuje z dystansu bez napięcia",
                    "Wpatruje się intensywnie",
                    "Sztywnieje, zatrzymuje się",
                    "Napina smycz, ciągnie w kierunku psa",
                    "Chce podejść (sygnały zabawy - luźne ciało, merdanie)",
                    "Skomli/pojękuje z ekscytacji",
                    "Szczeka, ale pozostaje w miejscu",
                    "Szczeka i rzuca się",
                    "Boi się - cofa się",
                    "Boi się - zamiera",
                  ].map((option) => (
                    <label
                      key={option}
                      style={{
                        ...styles.radioLabel,
                        ...(dogs === option ? styles.radioLabelChecked : {}),
                      }}
                    >
                      <input
                        type="radio"
                        name="dogs"
                        checked={dogs === option}
                        onChange={() => setDogs(option)}
                        style={styles.radio}
                      />
                      <span style={styles.radioText}>{option}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Ludzie */}
              <div style={styles.question}>
                <label style={styles.questionLabel}>Ludzie:</label>
                <div style={styles.radioGroup}>
                  {[
                    "Przyjazny - podchodzi sam z radością",
                    "Przyjazny - czeka na zaproszenie",
                    "Zainteresowany, ale niepewny",
                    "Podchodzi ostrożnie, węszy",
                    "Ignoruje",
                    "Obserwuje z dystansu bez podchodzenia",
                    "Szczeka",
                    "Warczy",
                    "Unika - oddala się",
                    "Unika - chowa się za wolontariusza",
                    "Skacze na ludzi (zbyt pobudzony)",
                  ].map((option) => (
                    <label
                      key={option}
                      style={{
                        ...styles.radioLabel,
                        ...(people === option ? styles.radioLabelChecked : {}),
                      }}
                    >
                      <input
                        type="radio"
                        name="people"
                        checked={people === option}
                        onChange={() => setPeople(option)}
                        style={styles.radio}
                      />
                      <span style={styles.radioText}>{option}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Ruch uliczny */}
              <div style={styles.question}>
                <label style={styles.questionLabel}>
                  Ruch uliczny (auta, rowery, biegacze):
                </label>
                <div style={styles.radioGroup}>
                  {[
                    "Brak reakcji / ignoruje",
                    "Zauważa, ale pozostaje spokojny",
                    "Napina się, sztywnieje",
                    "Szczeka, ale da się opanować",
                    "Rzuca się i szczeka",
                    "Unika / chowa się",
                    "Panikuje - szarpie, próbuje uciec",
                  ].map((option) => (
                    <label
                      key={option}
                      style={{
                        ...styles.radioLabel,
                        ...(traffic === option ? styles.radioLabelChecked : {}),
                      }}
                    >
                      <input
                        type="radio"
                        name="traffic"
                        checked={traffic === option}
                        onChange={() => setTraffic(option)}
                        style={styles.radio}
                      />
                      <span style={styles.radioText}>{option}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* SEKCJA 4: Podsumowanie */}
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>4. PODSUMOWANIE</h3>

              {/* Stan emocjonalny - WYMAGANE */}
              <div style={styles.question}>
                <label style={styles.questionLabel}>
                  Stan emocjonalny: <span style={styles.required}>*</span>
                </label>
                <div style={styles.radioGroup}>
                  {[
                    "A – Bardzo przyjazny, zrelaksowany",
                    "B – Aktywny, zainteresowany, ale opanowany",
                    "C – Neutralny, lekko niepewny",
                    "D – Bardzo pobudzony / trudny do opanowania",
                    "E – Bardzo przestraszony / unikający",
                    "F – Wykazujący zachowania grożące (warczenie, rzucanie się)",
                  ].map((option) => (
                    <label
                      key={option}
                      style={{
                        ...styles.radioLabel,
                        ...(emotionalState === option
                          ? styles.radioLabelChecked
                          : {}),
                      }}
                    >
                      <input
                        type="radio"
                        name="emotionalState"
                        checked={emotionalState === option}
                        onChange={() => setEmotionalState(option)}
                        style={styles.radio}
                      />
                      <span style={styles.radioText}>{option}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Dodatkowe uwagi */}
              <div style={styles.question}>
                <label style={styles.questionLabel}>Dodatkowe uwagi:</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  style={styles.textarea}
                  placeholder="Opcjonalne uwagi, obserwacje..."
                />
              </div>
            </div>
          </div>
        </div>

        {/* Save Button - Fixed na dole */}
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
              Zakończ spacer
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default WalkSurvey;




