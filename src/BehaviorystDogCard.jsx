import React, { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import KartaPsa from "./components/KartaPsa";
import { behaviorystApi } from "./api/behawiorystaApi";

const box = { background: "white", border: "1px solid #e5e7eb", borderRadius: 12, padding: 12, marginBottom: 12 };
const field = { width: "100%", boxSizing: "border-box", border: "2px solid #e5e7eb", borderRadius: 10, padding: "0.7rem 0.8rem", marginTop: 6 };
const label = { display: "block", fontSize: 13, color: "#374151", marginTop: 10, fontWeight: 600 };

const BehaviorystDogCard = ({ idPsa, planContext, getIdToken, currentUser, onBack, onPlannerUpdated }) => {
  const [loading, setLoading] = useState(true);
  const [dogCard, setDogCard] = useState(null);
  const [workPlanForm, setWorkPlanForm] = useState({
    obszarPracy: "Skupienie",
    cel: "",
    kryteriumSukcesu: "",
    notatka: "",
  });
  const [sessionForm, setSessionForm] = useState({
    typSesji: planContext?.plan?.typSesji || "WALK",
    czasTrwaniaMin: 30,
    przebiegSesji: "",
    wynik: 3,
    coDzialalo: "",
    coNieDzialalo: "",
    nastepnyKrok: "",
  });
  const [plannerForm, setPlannerForm] = useState({
    dataPlanowana: new Date().toISOString().slice(0, 10),
    godzina: "",
    typSesji: "WALK",
    celSesji: "",
    notatka: "",
  });

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
  const zaplanowaneSesje =
    dogCard?.zaplanowaneSesje || dogCard?.planSesji || dogCard?.planerSesji || dogCard?.planner || [];
  const zgloszenia = dogCard?.zgłoszenia || [];

  const addWorkPlan = async () => {
    if (!terapia?.idTerapia) return;
    if (!workPlanForm.cel.trim()) return;
    const payload = {
      idTerapia: terapia.idTerapia,
      obszarPracy: workPlanForm.obszarPracy,
      cel: workPlanForm.cel.trim(),
      kryteriumSukcesu: workPlanForm.kryteriumSukcesu.trim(),
      ćwiczeniaPowiązane: [],
      notatka: workPlanForm.notatka.trim(),
    };
    const result = await behaviorystApi.addWorkPlan(payload, getIdToken);
    if (result.ok) {
      setDogCard((prev) => ({ ...prev, planPracy: [result.data || payload, ...(prev.planPracy || [])] }));
      setWorkPlanForm((prev) => ({ ...prev, cel: "", kryteriumSukcesu: "", notatka: "" }));
    }
  };

  const addSession = async () => {
    const payload = {
      idPsa,
      idTerapia: terapia?.idTerapia,
      idPlanuSesji: planContext?.idPlanuSesji,
      typSesji: sessionForm.typSesji || planContext?.plan?.typSesji || "WALK",
      czasTrwaniaMin: Number(sessionForm.czasTrwaniaMin || 30),
      ćwiczenia: [],
      przebiegSesji: sessionForm.przebiegSesji.trim(),
      wynik: Number(sessionForm.wynik || 3),
      coDziałało: sessionForm.coDzialalo.trim(),
      coNieDziałało: sessionForm.coNieDzialalo.trim(),
      następnyKrok: sessionForm.nastepnyKrok.trim(),
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
      dataPlanowana: plannerForm.dataPlanowana,
      godzina: plannerForm.godzina,
      idPsa,
      typSesji: plannerForm.typSesji,
      celSesji: plannerForm.celSesji,
      ćwiczeniaSugerowane: [],
      notatka: plannerForm.notatka,
    };
    const result = await behaviorystApi.addPlannerSession(payload, getIdToken);
    if (result.ok) {
      const savedPlanner = result.data || payload;
      setDogCard((prev) => ({
        ...prev,
        zaplanowaneSesje: [savedPlanner, ...(prev?.zaplanowaneSesje || [])],
      }));
      onPlannerUpdated?.(null, savedPlanner);
      setPlannerForm((prev) => ({ ...prev, celSesji: "", notatka: "", godzina: "" }));
    }
  };

  return (
    <div style={{ padding: 12, paddingBottom: 80 }}>
      <button onClick={onBack} style={{ marginBottom: 8, border: "none", background: "transparent", display: "flex", alignItems: "center" }}><ArrowLeft size={16} /> Wróć</button>
      <KartaPsa pies={{ id: pies.idPsa || pies.id, imie: pies.imie || pies.name, boks: pies.boks, photo: pies.photo, priorytet: terapia?.priorytet }} />
      <div style={box}><b>Terapia</b><div>Status: {terapia?.status || "-"}</div><div>Priorytet: {terapia?.priorytet || "-"}</div></div>
      <div style={box}>
        <b>Plan pracy</b>
        <label style={label}>Obszar pracy
          <input value={workPlanForm.obszarPracy} onChange={(e) => setWorkPlanForm((prev) => ({ ...prev, obszarPracy: e.target.value }))} style={field} />
        </label>
        <label style={label}>Cel *
          <textarea value={workPlanForm.cel} onChange={(e) => setWorkPlanForm((prev) => ({ ...prev, cel: e.target.value }))} style={{ ...field, minHeight: 72 }} />
        </label>
        <label style={label}>Kryterium sukcesu
          <textarea value={workPlanForm.kryteriumSukcesu} onChange={(e) => setWorkPlanForm((prev) => ({ ...prev, kryteriumSukcesu: e.target.value }))} style={{ ...field, minHeight: 64 }} />
        </label>
        <label style={label}>Notatka
          <textarea value={workPlanForm.notatka} onChange={(e) => setWorkPlanForm((prev) => ({ ...prev, notatka: e.target.value }))} style={{ ...field, minHeight: 64 }} />
        </label>
        <button onClick={addWorkPlan} style={{ marginTop: 10 }}>Dodaj cel do planu pracy</button>
        {planPracy.length === 0 ? (
          <div style={{ marginTop: 10, color: "#6b7280" }}>Brak zapisanych celów w planie pracy.</div>
        ) : (
          planPracy.map((p, i) => <div key={p.idCelu || i} style={{ marginTop: 8 }}>{p.obszarPracy} • {p.cel}</div>)
        )}
      </div>
      <div style={box}>
        <b>Sesje treningowe</b>
        <label style={label}>Typ sesji
          <select value={sessionForm.typSesji} onChange={(e) => setSessionForm((prev) => ({ ...prev, typSesji: e.target.value }))} style={field}><option value="WALK">WALK</option><option value="BOX">BOX</option></select>
        </label>
        <label style={label}>Czas trwania (min)
          <input type="number" value={sessionForm.czasTrwaniaMin} onChange={(e) => setSessionForm((prev) => ({ ...prev, czasTrwaniaMin: e.target.value }))} style={field} />
        </label>
        <label style={label}>Przebieg sesji
          <textarea value={sessionForm.przebiegSesji} onChange={(e) => setSessionForm((prev) => ({ ...prev, przebiegSesji: e.target.value }))} style={{ ...field, minHeight: 64 }} />
        </label>
        <label style={label}>Wynik (1-5)
          <input type="number" min="1" max="5" value={sessionForm.wynik} onChange={(e) => setSessionForm((prev) => ({ ...prev, wynik: e.target.value }))} style={field} />
        </label>
        <label style={label}>Co działało
          <textarea value={sessionForm.coDzialalo} onChange={(e) => setSessionForm((prev) => ({ ...prev, coDzialalo: e.target.value }))} style={{ ...field, minHeight: 64 }} />
        </label>
        <label style={label}>Co nie działało
          <textarea value={sessionForm.coNieDzialalo} onChange={(e) => setSessionForm((prev) => ({ ...prev, coNieDzialalo: e.target.value }))} style={{ ...field, minHeight: 64 }} />
        </label>
        <label style={label}>Następny krok
          <textarea value={sessionForm.nastepnyKrok} onChange={(e) => setSessionForm((prev) => ({ ...prev, nastepnyKrok: e.target.value }))} style={{ ...field, minHeight: 64 }} />
        </label>
        <button onClick={addSession} style={{ marginTop: 10 }}>Dodaj sesję (log)</button>
        {sesje.length === 0 ? (
          <div style={{ marginTop: 10, color: "#6b7280" }}>Brak zapisanych sesji treningowych.</div>
        ) : (
          sesje.slice(0, 50).map((s, i) => <div key={s.idSesji || i} style={{ marginTop: 8 }}>{s.dataSesji || ""} • {s.typSesji} • wynik {s.wynik}</div>)
        )}
      </div>
      <div style={box}><b>Zgłoszenia</b>{zgloszenia.map((z, i) => <div key={z.idZgłoszenia || i}>{z.idZgłoszenia || z.id} • {z.status}</div>)}</div>
      <div style={box}>
        <b>Planowanie sesji</b>
        <label style={label}>Data
          <input type="date" value={plannerForm.dataPlanowana} onChange={(e) => setPlannerForm((prev) => ({ ...prev, dataPlanowana: e.target.value }))} style={field} />
        </label>
        <label style={label}>Godzina
          <input type="time" value={plannerForm.godzina} onChange={(e) => setPlannerForm((prev) => ({ ...prev, godzina: e.target.value }))} style={field} />
        </label>
        <label style={label}>Typ sesji
          <select value={plannerForm.typSesji} onChange={(e) => setPlannerForm((prev) => ({ ...prev, typSesji: e.target.value }))} style={field}><option value="WALK">WALK</option><option value="BOX">BOX</option></select>
        </label>
        <label style={label}>Cel sesji
          <textarea value={plannerForm.celSesji} onChange={(e) => setPlannerForm((prev) => ({ ...prev, celSesji: e.target.value }))} style={{ ...field, minHeight: 64 }} />
        </label>
        <label style={label}>Notatka
          <textarea value={plannerForm.notatka} onChange={(e) => setPlannerForm((prev) => ({ ...prev, notatka: e.target.value }))} style={{ ...field, minHeight: 64 }} />
        </label>
        <button onClick={addPlanner} style={{ marginTop: 10 }}>Zaplanuj sesję</button>
        {zaplanowaneSesje.length === 0 ? (
          <div style={{ marginTop: 10, color: "#6b7280" }}>Brak zaplanowanych sesji.</div>
        ) : (
          zaplanowaneSesje.slice(0, 50).map((sesja, i) => (
            <div key={sesja.idPlanuSesji || i} style={{ marginTop: 8 }}>
              {(sesja.dataPlanowana || "Brak daty")} {sesja.godzina ? `• ${sesja.godzina}` : ""} • {sesja.typSesji || "-"}
              {sesja.celSesji ? ` • ${sesja.celSesji}` : ""}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default BehaviorystDogCard;
