import React, { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import KartaPsa from "./components/KartaPsa";
import { behaviorystApi } from "./api/behawiorystaApi";

const box = { background: "white", border: "1px solid #e5e7eb", borderRadius: 12, padding: 12, marginBottom: 12 };

const BehaviorystDogCard = ({ idPsa, planContext, getIdToken, currentUser, onBack, onPlannerUpdated }) => {
  const [loading, setLoading] = useState(true);
  const [dogCard, setDogCard] = useState(null);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      const result = await behaviorystApi.getDogCard(idPsa, getIdToken);
      if (result.ok) setDogCard(result.data);
      setLoading(false);
    };
    run();
  }, [idPsa, getIdToken]);

  if (loading) return <div style={{ padding: 12 }}>Ładowanie karty psa...</div>;

  const pies = dogCard?.pies || { idPsa };
  const terapia = dogCard?.terapia || {};
  const planPracy = dogCard?.planPracy || [];
  const sesje = dogCard?.sesje || [];
  const zgloszenia = dogCard?.zgłoszenia || [];

  const addWorkPlan = async () => {
    if (!terapia?.idTerapia) return;
    const cel = window.prompt("Cel");
    if (!cel) return;
    const payload = {
      idTerapia: terapia.idTerapia,
      obszarPracy: window.prompt("Obszar pracy", "Skupienie") || "Skupienie",
      cel,
      kryteriumSukcesu: window.prompt("Kryterium sukcesu", "3 minuty spokoju") || "",
      ćwiczeniaPowiązane: [],
      notatka: "",
    };
    const result = await behaviorystApi.addWorkPlan(payload, getIdToken);
    if (result.ok) setDogCard((prev) => ({ ...prev, planPracy: [result.data || payload, ...(prev.planPracy || [])] }));
  };

  const addSession = async () => {
    const payload = {
      idPsa,
      idTerapia: terapia?.idTerapia,
      idPlanuSesji: planContext?.idPlanuSesji,
      typSesji: (planContext?.plan?.typSesji || "WALK"),
      czasTrwaniaMin: Number(window.prompt("Czas trwania (min)", "30") || 30),
      ćwiczenia: [],
      przebiegSesji: window.prompt("Przebieg sesji", "") || "",
      wynik: Number(window.prompt("Wynik 1-5", "3") || 3),
      coDziałało: window.prompt("Co działało", "") || "",
      coNieDziałało: window.prompt("Co nie działało", "") || "",
      następnyKrok: window.prompt("Następny krok", "") || "",
      prowadzący: currentUser?.email || "",
    };
    const result = await behaviorystApi.saveBehaviorSession(payload, getIdToken);
    if (result.ok) {
      setDogCard((prev) => ({ ...prev, sesje: [result.data || payload, ...(prev.sesje || [])] }));
      if (planContext?.idPlanuSesji) onPlannerUpdated?.(planContext.idPlanuSesji);
    }
  };

  const addPlanner = async () => {
    const payload = {
      dataPlanowana: window.prompt("Data (yyyy-MM-dd)", new Date().toISOString().slice(0, 10)) || "",
      godzina: window.prompt("Godzina (opcjonalnie)", "") || "",
      idPsa,
      typSesji: window.prompt("Typ (WALK/BOX)", "WALK") || "WALK",
      celSesji: window.prompt("Cel sesji", "") || "",
      ćwiczeniaSugerowane: [],
      notatka: "",
    };
    const result = await behaviorystApi.addPlannerSession(payload, getIdToken);
    if (result.ok) onPlannerUpdated?.(null, result.data || payload);
  };

  return (
    <div style={{ padding: 12, paddingBottom: 80 }}>
      <button onClick={onBack} style={{ marginBottom: 8, border: "none", background: "transparent", display: "flex", alignItems: "center" }}><ArrowLeft size={16} /> Wróć</button>
      <KartaPsa pies={{ id: pies.idPsa || pies.id, imie: pies.imie || pies.name, boks: pies.boks, photo: pies.photo, priorytet: terapia?.priorytet }} />
      <div style={box}><b>Terapia</b><div>Status: {terapia?.status || "-"}</div><div>Priorytet: {terapia?.priorytet || "-"}</div></div>
      <div style={box}><b>Plan pracy</b><button onClick={addWorkPlan}>Dodaj cel do planu pracy</button>{planPracy.map((p, i) => <div key={p.idCelu || i}>{p.obszarPracy} • {p.cel}</div>)}</div>
      <div style={box}><b>Sesje</b><button onClick={addSession}>Dodaj sesję (log)</button>{sesje.slice(0, 50).map((s, i) => <div key={s.idSesji || i}>{s.dataSesji || ""} • {s.typSesji} • wynik {s.wynik}</div>)}</div>
      <div style={box}><b>Zgłoszenia</b>{zgloszenia.map((z, i) => <div key={z.idZgłoszenia || i}>{z.idZgłoszenia || z.id} • {z.status}</div>)}</div>
      <div style={box}><b>Planowanie</b><button onClick={addPlanner}>Zaplanuj sesję</button></div>
    </div>
  );
};

export default BehaviorystDogCard;
