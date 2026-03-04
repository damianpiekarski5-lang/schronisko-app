import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";

const API_URL = "/api/gs";

const style = {
  page: { padding: "1rem", paddingBottom: "5rem", background: "#f8fafc", minHeight: "100vh" },
  topBar: { display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" },
  backButton: { border: "none", background: "white", borderRadius: "0.7rem", padding: "0.55rem", cursor: "pointer" },
  title: { margin: 0, fontSize: "1.25rem", color: "#0f172a" },
  sub: { margin: "0.25rem 0 0", color: "#64748b", fontSize: "0.85rem" },
  card: { background: "white", border: "1px solid #e2e8f0", borderRadius: "0.8rem", padding: "0.8rem", marginBottom: "0.75rem" },
  row: { display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" },
  btn: { border: "none", borderRadius: "0.6rem", padding: "0.5rem 0.75rem", fontWeight: 700, cursor: "pointer" },
  input: { border: "1px solid #cbd5e1", borderRadius: "0.55rem", padding: "0.55rem", width: "100%" },
  select: { border: "1px solid #cbd5e1", borderRadius: "0.55rem", padding: "0.55rem", width: "100%" },
  nav: { position: "fixed", left: 0, right: 0, bottom: 0, background: "white", borderTop: "1px solid #e2e8f0", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.4rem", padding: "0.45rem" },
};

const priorytetWaga = { Wysoki: 3, Średni: 2, Niski: 1 };

const daysSince = (iso) => {
  if (!iso) return 999;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 999;
  return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
};

const BehavioristPanel = ({ currentUser, dogs, onBack }) => {
  const [widok, setWidok] = useState("pulpit");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [dane, setDane] = useState({ psy: [], zgłoszenia: [], planer: [], ćwiczenia: [] });
  const [szukaj, setSzukaj] = useState("");
  const [statusFiltr, setStatusFiltr] = useState("Wszystkie");
  const [podgladZgloszenia, setPodgladZgloszenia] = useState(null);
  const [kartaPsa, setKartaPsa] = useState(null);
  const [kontekstZgloszenia, setKontekstZgloszenia] = useState(null);
  const [sesjaLive, setSesjaLive] = useState(null);
  const [noweCwiczenieOpen, setNoweCwiczenieOpen] = useState(false);
  const [sessionForm, setSessionForm] = useState({ typSesji: "Spacer terapeutyczny", czasTrwaniaMin: 15, przebiegSesji: "", wynik: 3, coDziałało: "", coNieDziałało: "", następnyKrok: "", prowadzący: "", wybrane: [] });
  const [planerForm, setPlanerForm] = useState({ dataPlanowana: "", godzina: "", idPsa: "", typSesji: "Spacer terapeutyczny", celSesji: "", ćwiczeniaSugerowane: [], notatka: "" });
  const [planForm, setPlanForm] = useState({ obszarPracy: "", cel: "", kryteriumSukcesu: "", ćwiczeniaPowiązane: [], notatka: "" });
  const [exerciseForm, setExerciseForm] = useState({ nazwaĆwiczenia: "", kategoria: "Spacer", poziomTrudności: 1, opis: "", wskazówki: "", typoweBłędy: "" });

  const dogsById = useMemo(() => Object.fromEntries((dogs || []).map((d) => [String(d.id), d])), [dogs]);
  const mapaPsow = useMemo(() => Object.fromEntries((dane.psy || []).map((p) => [String(p["ID psa"]), p])), [dane.psy]);
  const mapaCwiczen = useMemo(() => Object.fromEntries((dane.ćwiczenia || []).map((c) => [String(c["ID ćwiczenia"]), c])), [dane.ćwiczenia]);

  const authHeaders = async () => {
    const token = await currentUser.getIdToken();
    return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  };

  const getAction = async (action, params = {}) => {
    const token = await currentUser.getIdToken();
    const query = new URLSearchParams({ action, ...params }).toString();
    const res = await fetch(`${API_URL}?${query}`, { headers: { Authorization: `Bearer ${token}` } });
    const result = await res.json();
    if (!res.ok || result?.ok !== true) throw new Error(result?.error || "Błąd odczytu danych");
    return result.data;
  };

  const postAction = async (action, body = {}) => {
    const headers = await authHeaders();
    const res = await fetch(API_URL, { method: "POST", headers, body: JSON.stringify({ action, ...body }) });
    const result = await res.json();
    if (!res.ok || result?.ok !== true) throw new Error(result?.error || "Błąd zapisu danych");
    return result.data;
  };

  const odswiezStart = async () => {
    if (!currentUser) return;
    setLoading(true);
    setError("");
    try {
      const payload = await getAction("panelStart");
      setDane({
        psy: Array.isArray(payload?.psy) ? payload.psy : [],
        zgłoszenia: Array.isArray(payload?.zgłoszenia) ? payload.zgłoszenia : [],
        planer: Array.isArray(payload?.planer) ? payload.planer : [],
        ćwiczenia: Array.isArray(payload?.ćwiczenia) ? payload.ćwiczenia : [],
      });
    } catch (err) {
      setError(err.message || "Nie udało się pobrać panelu");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    odswiezStart();
  }, [currentUser]);

  const otworzKartePsa = async (idPsa, zgl = null, zakladka = "podsumowanie") => {
    try {
      const details = await getAction("getDogCard", { idPsa });
      setKartaPsa({ ...details, aktywnaZakladka: zakladka });
      setKontekstZgloszenia(zgl);
      setWidok("karta");
    } catch (err) {
      setError(err.message || "Nie udało się otworzyć karty psa");
    }
  };

  const rozpocznijPrace = async (zgl) => {
    setMessage("");
    setError("");
    setWidok("karta");
    try {
      const wynik = await postAction("startBehaviorReport", { idZgłoszenia: zgl["ID zgłoszenia"] });
      setMessage("Rozpoczęto pracę ze zgłoszeniem.");
      await otworzKartePsa(wynik?.idPsa || zgl["ID psa"], zgl, "plan");
      odswiezStart();
    } catch (err) {
      setError(err.message || "Nie udało się rozpocząć pracy");
    }
  };

  const startSesji = (idPsa, planSlot = null) => {
    const sugerowane = [];
    if (planSlot?.["Ćwiczenia sugerowane (lista)"]) {
      String(planSlot["Ćwiczenia sugerowane (lista)"]).split(",").map((x) => x.trim()).filter(Boolean).forEach((id) => sugerowane.push(id));
    } else if (kartaPsa?.planPracy) {
      kartaPsa.planPracy.forEach((p) => {
        if (String(p?.Status || p?.["Status"]) === "Aktywny") {
          String(p?.["Ćwiczenia powiązane (lista ID ćwiczeń, CSV)"] || "").split(",").map((x) => x.trim()).filter(Boolean).forEach((id) => sugerowane.push(id));
        }
      });
    }
    setSessionForm((prev) => ({ ...prev, wybrane: [...new Set(sugerowane)] }));
    setSesjaLive({ idPsa, idPlanuSesji: planSlot?.["ID planu sesji"] || null, idTerapia: kartaPsa?.terapia?.["ID terapii"] || null });
    setWidok("sesja");
  };

  const zapiszSesje = async () => {
    if (!sesjaLive?.idPsa) return;
    await postAction("saveBehaviorSession", {
      idPsa: sesjaLive.idPsa,
      idTerapia: sesjaLive.idTerapia,
      ...sessionForm,
      ćwiczenia: sessionForm.wybrane,
      idPlanuSesji: sesjaLive.idPlanuSesji,
    });
    setMessage("Sesja zapisana.");
    setWidok("karta");
    await otworzKartePsa(sesjaLive.idPsa, kontekstZgloszenia, "sesje");
    odswiezStart();
  };

  const dodajDoPlanera = async () => {
    await postAction("addPlannerSession", planerForm);
    setMessage("Dodano pozycję do planera.");
    setPlanerForm({ dataPlanowana: "", godzina: "", idPsa: "", typSesji: "Spacer terapeutyczny", celSesji: "", ćwiczeniaSugerowane: [], notatka: "" });
    odswiezStart();
  };

  const dodajPlanPracy = async () => {
    if (!kartaPsa?.terapia?.["ID terapii"]) return;
    await postAction("addWorkPlan", { ...planForm, idTerapia: kartaPsa.terapia["ID terapii"] });
    setPlanForm({ obszarPracy: "", cel: "", kryteriumSukcesu: "", ćwiczeniaPowiązane: [], notatka: "" });
    await otworzKartePsa(kartaPsa.pies?.["ID psa"], kontekstZgloszenia, "plan");
  };

  const dodajCwiczenie = async () => {
    await postAction("addExercise", exerciseForm);
    setExerciseForm({ nazwaĆwiczenia: "", kategoria: "Spacer", poziomTrudności: 1, opis: "", wskazówki: "", typoweBłędy: "" });
    setNoweCwiczenieOpen(false);
    odswiezStart();
  };

  const filtrowaneZgloszenia = useMemo(() => {
    const term = szukaj.trim().toLowerCase();
    return (dane.zgłoszenia || []).filter((z) => {
      if (statusFiltr !== "Wszystkie" && String(z["Status zgłoszenia"] || "") !== statusFiltr) return false;
      if (!term) return true;
      const id = String(z["ID psa"] || "").toLowerCase();
      const box = String(z["Boks"] || "").toLowerCase();
      const name = String(mapaPsow[z["ID psa"]]?.["Imię"] || dogsById[z["ID psa"]]?.name || "").toLowerCase();
      return id.includes(term) || box.includes(term) || name.includes(term);
    });
  }, [dane.zgłoszenia, szukaj, statusFiltr, mapaPsow, dogsById]);

  const psyWTerapii = useMemo(() => {
    const term = szukaj.trim().toLowerCase();
    return (dane.psy || [])
      .filter((p) => String(p["Status terapii"] || "").includes("terapi"))
      .filter((p) => {
        if (!term) return true;
        const id = String(p["ID psa"] || "").toLowerCase();
        const box = String(p["Boks"] || "").toLowerCase();
        const name = String(p["Imię"] || dogsById[p["ID psa"]]?.name || "").toLowerCase();
        return id.includes(term) || box.includes(term) || name.includes(term);
      })
      .map((p) => ({ ...p, dni: daysSince(p["Data ostatniej sesji"]) }))
      .sort((a, b) => (priorytetWaga[b["Priorytet"]] || 0) - (priorytetWaga[a["Priorytet"]] || 0) || b.dni - a.dni);
  }, [dane.psy, szukaj, dogsById]);

  const dzis = new Date().toISOString().slice(0, 10);
  const dzisiejszyPlan = (dane.planer || []).filter((p) => String(p["Data planowana"] || "").slice(0, 10) === dzis);

  return (
    <div style={style.page}>
      <div style={style.topBar}>
        <button onClick={onBack} style={style.backButton}><ArrowLeft size={18} /></button>
        <div>
          <h1 style={style.title}>Panel behawiorysty</h1>
          <p style={style.sub}>Dziennik + planer + karta psa</p>
        </div>
      </div>

      {loading && <div style={style.card}>Ładowanie danych...</div>}
      {!!message && <div style={{ ...style.card, borderColor: "#86efac", background: "#f0fdf4" }}>{message}</div>}
      {!!error && <div style={{ ...style.card, borderColor: "#fca5a5", background: "#fef2f2" }}>{error}</div>}

      {widok === "pulpit" && (
        <>
          <div style={style.card}>
            <h3 style={{ marginTop: 0 }}>Dzisiaj</h3>
            {!dzisiejszyPlan.length && <div>Brak zaplanowanych sesji na dziś.</div>}
            {dzisiejszyPlan.map((p) => (
              <div key={p["ID planu sesji"]} style={{ ...style.row, justifyContent: "space-between", marginBottom: "0.4rem" }}>
                <div>
                  <b>{p["ID psa"]}</b> · {mapaPsow[p["ID psa"]]?.["Imię"] || dogsById[p["ID psa"]]?.name || "Pies"} · {p["Typ sesji"]}
                </div>
                <button style={{ ...style.btn, background: "#16a34a", color: "white" }} onClick={() => startSesji(p["ID psa"], p)}>Start sesji</button>
              </div>
            ))}
          </div>
          <div style={style.card}>
            <h3 style={{ marginTop: 0 }}>Top zgłoszeń</h3>
            {(dane.zgłoszenia || []).slice(0, 5).map((z) => (
              <div key={z["ID zgłoszenia"]} style={{ ...style.row, justifyContent: "space-between", marginBottom: "0.3rem" }}>
                <span>{z["ID psa"]} · {z["Opis problemu"] || "Brak opisu"}</span>
                <button style={{ ...style.btn, background: "#e2e8f0" }} onClick={() => { setPodgladZgloszenia(z); setWidok("zgloszenia"); }}>Podgląd</button>
              </div>
            ))}
          </div>
          <div style={style.card}>
            <h3 style={{ marginTop: 0 }}>Top psy w terapii</h3>
            {psyWTerapii.slice(0, 5).map((p) => (
              <div key={p["ID psa"]} style={{ ...style.row, justifyContent: "space-between", marginBottom: "0.3rem" }}>
                <span>{p["Imię"] || dogsById[p["ID psa"]]?.name || p["ID psa"]} · {p["Priorytet"]} · {p.dni} dni od sesji</span>
                <button style={{ ...style.btn, background: "#dbeafe" }} onClick={() => otworzKartePsa(p["ID psa"])}>Karta</button>
              </div>
            ))}
          </div>
        </>
      )}

      {widok === "zgloszenia" && (
        <>
          <div style={style.card}>
            <div style={style.row}>
              <input placeholder="Szukaj po ID psa / imię / boks" style={style.input} value={szukaj} onChange={(e) => setSzukaj(e.target.value)} />
              <select style={style.select} value={statusFiltr} onChange={(e) => setStatusFiltr(e.target.value)}>
                <option>Wszystkie</option><option>Nowe</option><option>W trakcie</option><option>Zamknięte</option>
              </select>
            </div>
            {filtrowaneZgloszenia.map((z) => (
              <button key={z["ID zgłoszenia"]} onClick={() => setPodgladZgloszenia(z)} style={{ ...style.card, width: "100%", textAlign: "left", marginBottom: "0.35rem" }}>
                <b>{z["ID psa"]} · {mapaPsow[z["ID psa"]]?.["Imię"] || dogsById[z["ID psa"]]?.name || "Pies"}</b>
                <div>{z["Opis problemu"] || "Brak opisu"}</div>
              </button>
            ))}
          </div>
          {podgladZgloszenia && (
            <div style={style.card}>
              <h3 style={{ marginTop: 0 }}>Podgląd zgłoszenia</h3>
              <div><b>ID:</b> {podgladZgloszenia["ID zgłoszenia"]}</div>
              <div><b>Status:</b> {podgladZgloszenia["Status zgłoszenia"]}</div>
              <div><b>Priorytet:</b> {podgladZgloszenia["Priorytet"]}</div>
              <div><b>Kategoria:</b> {podgladZgloszenia["Kategoria"]}</div>
              <p>{podgladZgloszenia["Opis problemu"]}</p>
              <div style={style.row}>
                <button style={{ ...style.btn, background: "#16a34a", color: "white" }} onClick={() => rozpocznijPrace(podgladZgloszenia)}>Rozpocznij pracę</button>
              </div>
            </div>
          )}
        </>
      )}

      {widok === "psy" && (
        <div style={style.card}>
          <input placeholder="Szukaj po ID psa / imię / boks" style={style.input} value={szukaj} onChange={(e) => setSzukaj(e.target.value)} />
          {psyWTerapii.map((p) => (
            <div key={p["ID psa"]} style={{ ...style.row, justifyContent: "space-between", marginTop: "0.4rem" }}>
              <span>{p["ID psa"]} · {p["Imię"] || dogsById[p["ID psa"]]?.name} · {p["Priorytet"]} · {p.dni} dni</span>
              <div style={style.row}>
                <button style={{ ...style.btn, background: "#dbeafe" }} onClick={() => otworzKartePsa(p["ID psa"])}>Karta psa</button>
                <button style={{ ...style.btn, background: "#16a34a", color: "white" }} onClick={() => startSesji(p["ID psa"])}>Start sesji</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {widok === "karta" && kartaPsa && (
        <>
          <div style={style.card}>
            <h3 style={{ marginTop: 0 }}>Karta psa: {kartaPsa?.pies?.["Imię"] || dogsById[kartaPsa?.pies?.["ID psa"]]?.name || kartaPsa?.pies?.["ID psa"]}</h3>
            <div style={style.row}>
              {[["podsumowanie", "Podsumowanie"], ["plan", "Plan pracy"], ["sesje", "Sesje"], ["zgloszenia", "Zgłoszenia"], ["notatki", "Notatki"]].map(([id, label]) => (
                <button key={id} style={{ ...style.btn, background: kartaPsa.aktywnaZakladka === id ? "#2563eb" : "#e2e8f0", color: kartaPsa.aktywnaZakladka === id ? "white" : "#0f172a" }} onClick={() => setKartaPsa((prev) => ({ ...prev, aktywnaZakladka: id }))}>{label}</button>
              ))}
            </div>
            {kontekstZgloszenia && <div style={{ marginTop: "0.6rem", padding: "0.5rem", background: "#eff6ff", borderRadius: "0.6rem" }}>Kontekst zgłoszenia: {kontekstZgloszenia["Opis problemu"]}</div>}
          </div>

          {kartaPsa.aktywnaZakladka === "podsumowanie" && <div style={style.card}><div>Status terapii: {kartaPsa?.pies?.["Status terapii"]}</div><div>Priorytet: {kartaPsa?.pies?.["Priorytet"]}</div><button style={{ ...style.btn, background: "#16a34a", color: "white", marginTop: "0.4rem" }} onClick={() => startSesji(kartaPsa.pies?.["ID psa"])}>Start sesji</button></div>}

          {kartaPsa.aktywnaZakladka === "plan" && (
            <div style={style.card}>
              {(kartaPsa.planPracy || []).map((p) => <div key={p["ID planu"]} style={{ marginBottom: "0.45rem" }}><b>{p["Obszar pracy"]}</b> · {p["Cel"]}</div>)}
              <h4>Dodaj plan pracy</h4>
              <input style={style.input} placeholder="Obszar pracy" value={planForm.obszarPracy} onChange={(e) => setPlanForm((prev) => ({ ...prev, obszarPracy: e.target.value }))} />
              <input style={style.input} placeholder="Cel" value={planForm.cel} onChange={(e) => setPlanForm((prev) => ({ ...prev, cel: e.target.value }))} />
              <input style={style.input} placeholder="Kryterium sukcesu" value={planForm.kryteriumSukcesu} onChange={(e) => setPlanForm((prev) => ({ ...prev, kryteriumSukcesu: e.target.value }))} />
              <button style={{ ...style.btn, background: "#2563eb", color: "white" }} onClick={dodajPlanPracy}>Dodaj do planu</button>
            </div>
          )}

          {kartaPsa.aktywnaZakladka === "sesje" && <div style={style.card}>{(kartaPsa.sesje || []).map((s) => <div key={s["ID sesji"]}>{s["Data sesji"]} · {s["Typ sesji"]} · wynik {s["Wynik (1–5)"]}</div>)}</div>}
          {kartaPsa.aktywnaZakladka === "zgloszenia" && <div style={style.card}>{(kartaPsa.zgłoszenia || []).map((z) => <div key={z["ID zgłoszenia"]}>{z["Data zgłoszenia"]} · {z["Status zgłoszenia"]} · {z["Opis problemu"]}</div>)}</div>}
          {kartaPsa.aktywnaZakladka === "notatki" && <div style={style.card}>{kartaPsa?.pies?.["Notatka ogólna"] || "Brak notatek."}</div>}
        </>
      )}

      {widok === "sesja" && sesjaLive && (
        <div style={style.card}>
          <h3 style={{ marginTop: 0 }}>Sesja na żywo – {sesjaLive.idPsa}</h3>
          <select style={style.select} value={sessionForm.typSesji} onChange={(e) => setSessionForm((prev) => ({ ...prev, typSesji: e.target.value }))}>
            <option>Spacer terapeutyczny</option><option>Sesja w boksie</option><option>Sesja środowiskowa</option><option>Socjalizacja kontrolowana</option><option>Trening umiejętności</option><option>Diagnostyka</option>
          </select>
          <input style={style.input} type="number" placeholder="Czas trwania (min)" value={sessionForm.czasTrwaniaMin} onChange={(e) => setSessionForm((prev) => ({ ...prev, czasTrwaniaMin: Number(e.target.value || 0) }))} />
          <div style={{ marginBottom: "0.45rem" }}><b>Ćwiczenia</b></div>
          {(dane.ćwiczenia || []).map((c) => (
            <label key={c["ID ćwiczenia"]} style={{ display: "block", marginBottom: "0.25rem" }}>
              <input
                type="checkbox"
                checked={sessionForm.wybrane.includes(c["ID ćwiczenia"])}
                onChange={(e) => setSessionForm((prev) => ({ ...prev, wybrane: e.target.checked ? [...prev.wybrane, c["ID ćwiczenia"]] : prev.wybrane.filter((id) => id !== c["ID ćwiczenia"]) }))}
              /> {c["Nazwa ćwiczenia"]}
            </label>
          ))}
          <button style={{ ...style.btn, background: "#e2e8f0", marginBottom: "0.5rem" }} onClick={() => setNoweCwiczenieOpen((x) => !x)}>Dodaj nowe ćwiczenie</button>
          {noweCwiczenieOpen && (
            <div style={{ ...style.card, background: "#f8fafc" }}>
              <input style={style.input} placeholder="Nazwa ćwiczenia" value={exerciseForm.nazwaĆwiczenia} onChange={(e) => setExerciseForm((prev) => ({ ...prev, nazwaĆwiczenia: e.target.value }))} />
              <input style={style.input} placeholder="Kategoria" value={exerciseForm.kategoria} onChange={(e) => setExerciseForm((prev) => ({ ...prev, kategoria: e.target.value }))} />
              <button style={{ ...style.btn, background: "#2563eb", color: "white" }} onClick={dodajCwiczenie}>Zapisz ćwiczenie</button>
            </div>
          )}
          <textarea style={{ ...style.input, minHeight: 80 }} placeholder="Przebieg sesji" value={sessionForm.przebiegSesji} onChange={(e) => setSessionForm((prev) => ({ ...prev, przebiegSesji: e.target.value }))} />
          <input style={style.input} type="number" min="1" max="5" value={sessionForm.wynik} onChange={(e) => setSessionForm((prev) => ({ ...prev, wynik: Number(e.target.value || 1) }))} />
          <input style={style.input} placeholder="Co działało" value={sessionForm.coDziałało} onChange={(e) => setSessionForm((prev) => ({ ...prev, coDziałało: e.target.value }))} />
          <input style={style.input} placeholder="Co nie działało" value={sessionForm.coNieDziałało} onChange={(e) => setSessionForm((prev) => ({ ...prev, coNieDziałało: e.target.value }))} />
          <input style={style.input} placeholder="Następny krok" value={sessionForm.następnyKrok} onChange={(e) => setSessionForm((prev) => ({ ...prev, następnyKrok: e.target.value }))} />
          <button style={{ ...style.btn, background: "#16a34a", color: "white" }} onClick={zapiszSesje}>Zapisz sesję</button>
        </div>
      )}

      {widok === "cwiczenia" && (
        <div style={style.card}>
          <h3 style={{ marginTop: 0 }}>Baza ćwiczeń</h3>
          {(dane.ćwiczenia || []).map((c) => (
            <div key={c["ID ćwiczenia"]} style={{ marginBottom: "0.35rem" }}><b>{c["Nazwa ćwiczenia"]}</b> · {c["Kategoria"]} · poziom {c["Poziom trudności"]}</div>
          ))}
          <h4>Planer sesji</h4>
          <input style={style.input} placeholder="Data planowana YYYY-MM-DD" value={planerForm.dataPlanowana} onChange={(e) => setPlanerForm((prev) => ({ ...prev, dataPlanowana: e.target.value }))} />
          <input style={style.input} placeholder="ID psa" value={planerForm.idPsa} onChange={(e) => setPlanerForm((prev) => ({ ...prev, idPsa: e.target.value }))} />
          <input style={style.input} placeholder="Cel sesji" value={planerForm.celSesji} onChange={(e) => setPlanerForm((prev) => ({ ...prev, celSesji: e.target.value }))} />
          <button style={{ ...style.btn, background: "#2563eb", color: "white" }} onClick={dodajDoPlanera}>Dodaj do planera</button>
        </div>
      )}

      <div style={style.nav}>
        {[ ["pulpit", "Pulpit"], ["zgloszenia", "Zgłoszenia"], ["psy", "Psy w terapii"], ["cwiczenia", "Baza ćwiczeń"] ].map(([id, label]) => (
          <button key={id} style={{ ...style.btn, background: widok === id ? "#2563eb" : "#e2e8f0", color: widok === id ? "white" : "#0f172a" }} onClick={() => setWidok(id)}>{label}</button>
        ))}
      </div>
    </div>
  );
};

export default BehavioristPanel;
