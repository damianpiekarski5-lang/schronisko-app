import React, { useMemo, useState } from "react";

const API_URL = "/api/gs";

export default function WalkSurvey({ dog, onClose, onSave }) {
  const [volunteer, setVolunteer] = useState("");
  const [responses, setResponses] = useState({
    contact: "",
    walking: "",
    dogs: "",
    people: "",
    traffic: "",
    emotionalState: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  const dogId = useMemo(() => {
    // wspieramy różne formaty obiektu psa
    return dog?.id ?? dog?.dogId ?? dog?.DogId ?? dog?.ID ?? "";
  }, [dog]);

  const update = (key, value) => {
    setResponses((prev) => ({ ...prev, [key]: value }));
  };

  const submit = async () => {
    if (!dogId) {
      setMessage({ type: "error", text: "❌ Brak ID psa" });
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      const payload = {
        action: "recordWalk",
        dogId: String(dogId),
        volunteer: volunteer?.trim() || "Wolontariusz",
        responses,
      };

      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result?.ok && result?.data?.success) {
        setMessage({ type: "success", text: "✅ Spacer zapisany!" });
        setTimeout(() => {
          onSave && onSave();
          onClose && onClose();
        }, 800);
      } else {
        setMessage({
          type: "error",
          text: "❌ Błąd: " + (result?.error || "Nieznany błąd"),
        });
      }
    } catch (err) {
      setMessage({ type: "error", text: "❌ Błąd połączenia" });
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div>
            <div style={styles.title}>Spacer – ankieta</div>
            <div style={styles.subtitle}>
              {dog?.name || dog?.dogName || "Pies"} {dogId ? `(#${dogId})` : ""}
            </div>
          </div>
          <button onClick={onClose} style={styles.closeBtn} aria-label="Zamknij">
            ✕
          </button>
        </div>

        <div style={styles.body}>
          <label style={styles.label}>Wolontariusz (opcjonalnie)</label>
          <input
            style={styles.input}
            value={volunteer}
            onChange={(e) => setVolunteer(e.target.value)}
            placeholder="np. Damian"
          />

          <div style={styles.grid}>
            <Field
              label="Reakcja na kontakt"
              value={responses.contact}
              onChange={(v) => update("contact", v)}
              placeholder="np. chętnie podchodzi / unika"
            />
            <Field
              label="Sposób chodzenia"
              value={responses.walking}
              onChange={(v) => update("walking", v)}
              placeholder="np. luźna smycz / ciągnie"
            />
            <Field
              label="Inne psy"
              value={responses.dogs}
              onChange={(v) => update("dogs", v)}
              placeholder="np. ignoruje / szczeka"
            />
            <Field
              label="Ludzie"
              value={responses.people}
              onChange={(v) => update("people", v)}
              placeholder="np. spokojny / obszczekuje"
            />
            <Field
              label="Ruch uliczny"
              value={responses.traffic}
              onChange={(v) => update("traffic", v)}
              placeholder="auta/rowery/biegacze"
            />
            <Field
              label="Stan emocjonalny"
              value={responses.emotionalState}
              onChange={(v) => update("emotionalState", v)}
              placeholder="np. spokojny / pobudzony"
            />
          </div>

          <label style={styles.label}>Dodatkowe uwagi</label>
          <textarea
            style={{ ...styles.input, minHeight: 90, resize: "vertical" }}
            value={responses.notes}
            onChange={(e) => update("notes", e.target.value)}
            placeholder="krótko: co ważne z tego spaceru"
          />

          {message?.text ? (
            <div
              style={{
                ...styles.msg,
                ...(message.type === "success" ? styles.msgOk : styles.msgErr),
              }}
            >
              {message.text}
            </div>
          ) : null}

          <button
            onClick={submit}
            disabled={submitting}
            style={{ ...styles.btn, ...(submitting ? styles.btnDisabled : {}) }}
          >
            {submitting ? "Zapisywanie..." : "Zapisz spacer"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={styles.label}>{label}</label>
      <input
        style={styles.input}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.45)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    zIndex: 9999,
  },
  card: {
    width: "100%",
    maxWidth: 720,
    background: "#fff",
    borderRadius: 14,
    overflow: "hidden",
    boxShadow: "0 10px 40px rgba(0,0,0,0.25)",
  },
  header: {
    padding: "14px 16px",
    borderBottom: "1px solid #eee",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  title: { fontSize: 18, fontWeight: 700 },
  subtitle: { fontSize: 13, opacity: 0.7, marginTop: 2 },
  closeBtn: {
    border: "none",
    background: "transparent",
    fontSize: 20,
    cursor: "pointer",
    padding: 6,
    lineHeight: 1,
  },
  body: { padding: 16, display: "flex", flexDirection: "column", gap: 10 },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 10,
    marginTop: 6,
  },
  label: { fontSize: 12, fontWeight: 700, opacity: 0.75 },
  input: {
    padding: "10px 12px",
    border: "1px solid #ddd",
    borderRadius: 10,
    outline: "none",
    fontSize: 14,
  },
  btn: {
    marginTop: 6,
    padding: "12px 14px",
    borderRadius: 12,
    border: "none",
    cursor: "pointer",
    fontWeight: 800,
    fontSize: 14,
  },
  btnDisabled: { opacity: 0.6, cursor: "not-allowed" },
  msg: {
    padding: "10px 12px",
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 700,
  },
  msgOk: { background: "rgba(0,0,0,0.06)" },
  msgErr: { background: "rgba(0,0,0,0.06)" },
};
