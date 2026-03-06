import React, { useMemo, useState } from "react";
import { ArrowLeft, RefreshCw, Search } from "lucide-react";
import KartaPsa from "./components/KartaPsa";
import { behaviorystApi } from "./api/behawiorystaApi";

const tabs = ["Psy", "Dziś", "Planer", "Zgłoszenia", "W terapii", "Ćwiczenia"];

const debounce = (value, ms = 150) => {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const id = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return debounced;
};

const sameDay = (value) => String(value || "").slice(0, 10) === new Date().toISOString().slice(0, 10);

const statusBadge = (status) => ({
  display: "inline-block",
  borderRadius: 999,
  padding: "0.2rem 0.55rem",
  fontSize: 12,
  background: status === "Wykonana" ? "#dcfce7" : "#e0e7ff",
  color: status === "Wykonana" ? "#166534" : "#3730a3",
});

const sectionStyle = { background: "white", borderRadius: 12, border: "1px solid #e5e7eb", padding: 12, marginBottom: 12 };

const BehaviorystPanel = ({ cache, onRefresh, onOpenDog, getIdToken, onCachePatch, onBackToVolunteer }) => {
  const [activeTab, setActiveTab] = useState("Psy");
  const [search, setSearch] = useState("");
  const [exerciseSearch, setExerciseSearch] = useState("");
  const [therapyDogId, setTherapyDogId] = useState("");

  const debouncedSearch = debounce(search);
  const debouncedExerciseSearch = debounce(exerciseSearch);
  const psy = cache?.psy || [];
  const zgloszenia = cache?.zgloszenia || [];
  const planer = cache?.planer || [];
  const cwiczenia = cache?.cwiczenia || [];

  const psyById = useMemo(() => new Map(psy.map((p) => [String(p.idPsa || p.id || ""), p])), [psy]);

  const sessionsToday = useMemo(() => {
    return planer
      .filter((s) => sameDay(s.dataPlanowana || s.DataPlanowana))
      .sort((a, b) => {
        const ga = a.godzina || a.Godzina || "99:99";
        const gb = b.godzina || b.Godzina || "99:99";
        return ga.localeCompare(gb);
      });
  }, [planer]);

  const triage = useMemo(
    () => zgloszenia.filter((z) => !z.status || z.status === "Nowe" || z.Status === "Nowe").slice(0, 5),
    [zgloszenia]
  );

  const filteredExercises = useMemo(() => {
    const term = debouncedExerciseSearch.toLowerCase().trim();
    if (!term) return cwiczenia;
    return cwiczenia.filter((c) => `${c.nazwaĆwiczenia || c.nazwa || ""} ${c.kategoria || ""}`.toLowerCase().includes(term));
  }, [cwiczenia, debouncedExerciseSearch]);

  const filteredDogs = useMemo(() => {
    const term = debouncedSearch.toLowerCase().trim();
    if (!term) return psy;

    const pavilionBoxPattern = /^([a-ząćęłńóśżź]+)(\d+)$/i;
    const match = term.match(pavilionBoxPattern);
    if (match) {
      const pavilion = match[1].toUpperCase();
      const box = Number(match[2]);
      return psy.filter((dog) => {
        const dogPavilion = String(dog.pawilon || dog.pavilion || "").toUpperCase();
        const dogBox = Number(dog.nrBoksu || dog.box || dog.boks || NaN);
        return dogPavilion === pavilion && dogBox === box;
      });
    }

    return psy.filter((dog) => {
      const id = String(dog.idPsa || dog.id || "").toLowerCase();
      const imie = String(dog.imie || dog.name || "").toLowerCase();
      const boks = String(dog.boks || "").toLowerCase();
      const pawilon = String(dog.pawilon || dog.pavilion || "").toLowerCase();
      const nrBoksu = String(dog.nrBoksu || dog.box || "").toLowerCase();
      const fullBoks = `${pawilon} ${nrBoksu}`.trim();
      return id.includes(term) || imie.includes(term) || boks.includes(term) || pawilon.includes(term) || nrBoksu.includes(term) || fullBoks.includes(term);
    });
  }, [psy, debouncedSearch]);

  const therapyDogs = useMemo(() => {
    const prioRank = { wysoki: 3, średni: 2, niski: 1 };
    return psy
      .filter((p) => (p.statusTerapii || p["Status terapii"] || "") === "W terapii" || p.priorytet)
      .sort((a, b) => {
        const pa = prioRank[String(a.priorytet || "").toLowerCase()] || 0;
        const pb = prioRank[String(b.priorytet || "").toLowerCase()] || 0;
        if (pb !== pa) return pb - pa;
        return String(a.dataOstatniejSesji || "").localeCompare(String(b.dataOstatniejSesji || ""));
      });
  }, [psy]);

  const handleAddDogToTherapy = async () => {
    if (!therapyDogId.trim()) return;
    const result = await behaviorystApi.addDogToTherapy({ idPsa: therapyDogId.trim() }, getIdToken);
    if (result.ok) {
      setTherapyDogId("");
      onRefresh?.();
    }
  };

  const handleStartReport = async (idZgloszenia, idPsa) => {
    onCachePatch?.({ zgloszenia: zgloszenia.map((z) => (String(z.idZgłoszenia || z.id) === String(idZgloszenia) ? { ...z, status: "W toku" } : z)) });
    const result = await behaviorystApi.startBehaviorReport(idZgloszenia, getIdToken);
    if (result.ok) {
      onOpenDog(idPsa || result.data?.idPsa);
    }
  };

  const handleCloseReport = async (idZgloszenia) => {
    const komentarzBehawiorysty = window.prompt("Komentarz behawiorysty:");
    if (!komentarzBehawiorysty) return;
    onCachePatch?.({ zgloszenia: zgloszenia.map((z) => (String(z.idZgłoszenia || z.id) === String(idZgloszenia) ? { ...z, status: "Zamknięte" } : z)) });
    await behaviorystApi.closeBehaviorReport({ idZgłoszenia: idZgloszenia, komentarzBehawiorysty }, getIdToken);
  };

  return (
    <div style={{ padding: 12, paddingBottom: 90 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 8 }}>
        <button
          onClick={onBackToVolunteer}
          style={{ border: "1px solid #d1d5db", background: "white", borderRadius: 999, padding: "0.45rem 0.8rem", display: "flex", alignItems: "center", gap: 6 }}
        >
          <ArrowLeft size={16} /> Wróć do wolontariuszy
        </button>
        <button onClick={onRefresh} style={{ border: "1px solid #d1d5db", background: "white", borderRadius: 999, padding: "0.45rem 0.8rem", display: "flex", alignItems: "center", gap: 6 }}><RefreshCw size={16} /> Odśwież</button>
      </div>

      <div style={{ display: "flex", gap: 8, overflowX: "auto", marginBottom: 12 }}>
        {tabs.map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{ border: "1px solid #d1d5db", background: activeTab === tab ? "#dbeafe" : "white", borderRadius: 999, padding: "0.45rem 0.8rem", whiteSpace: "nowrap" }}>{tab}</button>
        ))}
      </div>

      {activeTab === "Psy" && (
        <>
          <div style={{ ...sectionStyle, position: "sticky", top: 8, zIndex: 5 }}>
            <h3 style={{ marginTop: 0 }}>Wyszukiwarka psów</h3>
            <div style={{ position: "relative" }}>
              <Search size={18} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#6b7280" }} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Szukaj po imieniu, ID, boksie lub np. E12"
                style={{ width: "100%", boxSizing: "border-box", border: "2px solid #e5e7eb", borderRadius: 10, padding: "0.75rem 0.8rem 0.75rem 2.2rem" }}
              />
            </div>
            <small style={{ color: "#6b7280" }}>Wyniki: {filteredDogs.length} / {psy.length}</small>
          </div>

          <div style={sectionStyle}>
            <h3 style={{ marginTop: 0 }}>Karty psów</h3>
            {filteredDogs.length === 0 ? (
              <div style={{ color: "#6b7280" }}>Brak psów pasujących do wyszukiwania.</div>
            ) : (
              filteredDogs.map((p) => (
                <div key={p.idPsa || p.id} style={{ marginBottom: 10 }}>
                  <KartaPsa
                    pies={{
                      id: p.idPsa || p.id,
                      imie: p.imie || p.name,
                      boks: p.boks || `${p.pawilon || p.pavilion || ""} / Boks ${p.nrBoksu || p.box || ""}`,
                      photo: p.photo || p.zdjecie,
                    }}
                    onClick={() => onOpenDog(p.idPsa || p.id)}
                  />
                </div>
              ))
            )}
          </div>
        </>
      )}

      {activeTab === "Dziś" && (
        <>
          <div style={sectionStyle}>
            <h3>Sesje na dziś</h3>
            {sessionsToday.map((s) => {
              const idPsa = s.idPsa || s.IDPsa;
              const pies = psyById.get(String(idPsa)) || { id: idPsa, imie: s.imie };
              return (
                <div key={s.idPlanuSesji || `${idPsa}-${s.dataPlanowana}`} style={{ marginBottom: 10 }}>
                  <KartaPsa pies={{ id: pies.idPsa || pies.id, imie: pies.imie || pies.name, boks: pies.boks, photo: pies.photo }} onClick={() => onOpenDog(idPsa, { idPlanuSesji: s.idPlanuSesji, plan: s })} wariant="mala" />
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                    <small>{s.godzina || "bez godziny"} • {s.typSesji}</small>
                    <span style={statusBadge(s.status || "Zaplanowana")}>{s.status || "Zaplanowana"}</span>
                  </div>
                </div>
              );
            })}
          </div>
          <div style={sectionStyle}>
            <h3>Zgłoszenia do triage</h3>
            {triage.map((z) => <div key={z.idZgłoszenia || z.id}>{z.idZgłoszenia || z.id} • {z.idPsa} • {z.priorytet}</div>)}
            <button onClick={() => setActiveTab("Zgłoszenia")}>Zobacz wszystkie</button>
          </div>
          <div style={sectionStyle}>
            <h3>Szybkie dodanie psa do terapii</h3>
            <input value={therapyDogId} onChange={(e) => setTherapyDogId(e.target.value)} placeholder="ID psa" />
            <button onClick={handleAddDogToTherapy}>Dodaj</button>
          </div>
        </>
      )}

      {activeTab === "Planer" && (
        <div style={sectionStyle}>{planer.map((s) => <div key={s.idPlanuSesji || JSON.stringify(s)}>{s.dataPlanowana || s.DataPlanowana} • {s.typSesji} • {s.status || "Zaplanowana"}</div>)}</div>
      )}

      {activeTab === "Zgłoszenia" && (
        <div style={sectionStyle}>
          {zgloszenia.map((z) => (
            <div key={z.idZgłoszenia || z.id} style={{ borderBottom: "1px solid #eee", padding: "8px 0" }}>
              <div>{z.idZgłoszenia || z.id} • pies {z.idPsa} • {z.priorytet || "-"} • {z.status || "Nowe"}</div>
              <button onClick={() => handleStartReport(z.idZgłoszenia || z.id, z.idPsa)}>Start</button>
              <button onClick={() => handleCloseReport(z.idZgłoszenia || z.id)}>Zamknij</button>
            </div>
          ))}
        </div>
      )}

      {activeTab === "W terapii" && (
        <div style={sectionStyle}>
          {therapyDogs.map((p) => (
            <KartaPsa key={p.idPsa || p.id} pies={{ id: p.idPsa || p.id, imie: p.imie || p.name, boks: p.boks, photo: p.photo }} onClick={() => onOpenDog(p.idPsa || p.id)} />
          ))}
        </div>
      )}

      {activeTab === "Ćwiczenia" && (
        <div style={sectionStyle}>
          <input placeholder="Szukaj ćwiczeń" value={exerciseSearch} onChange={(e) => setExerciseSearch(e.target.value)} />
          {filteredExercises.map((c, index) => <div key={c.idĆwiczenia || c.nazwaĆwiczenia || index}>{c.nazwaĆwiczenia || c.nazwa} • {c.kategoria}</div>)}
          <button onClick={async () => {
            const nazwaĆwiczenia = window.prompt("Nazwa ćwiczenia");
            if (!nazwaĆwiczenia) return;
            const payload = { nazwaĆwiczenia, kategoria: "Ogólne", poziomTrudności: "Średni", opis: "", wskazówki: "", typoweBłędy: "" };
            const result = await behaviorystApi.addExercise(payload, getIdToken);
            if (result.ok) {
              onCachePatch?.({ cwiczenia: [payload, ...cwiczenia] });
            }
          }}>Dodaj ćwiczenie</button>
        </div>
      )}
    </div>
  );
};

export default BehaviorystPanel;
