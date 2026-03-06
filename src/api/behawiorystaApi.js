const API_URL = "/api/gs";

async function parseResponse(response) {
  let result = null;
  try {
    result = await response.json();
  } catch {
    return { ok: false, error: "Niepoprawna odpowiedź serwera" };
  }

  if (!response.ok || result?.ok !== true) {
    return { ok: false, error: result?.error || "Błąd żądania" };
  }

  return { ok: true, data: result?.data };
}

export async function postGs(action, payload = {}, getIdToken) {
  try {
    const token = (await getIdToken?.()) || "";
    if (!token) {
      return { ok: false, error: "Brak tokena autoryzacji" };
    }

    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ action, ...payload }),
    });

    return parseResponse(response);
  } catch (error) {
    return { ok: false, error: String(error?.message || error) };
  }
}

export const behaviorystApi = {
  panelStart: (getIdToken) => postGs("panelStart", {}, getIdToken),
  getDogCard: (idPsa, getIdToken) => postGs("getDogCard", { idPsa }, getIdToken),
  getBehaviorystDogs: (getIdToken) => postGs("getBehaviorystDogs", {}, getIdToken),
  toggleBehaviorystDog: (dogId, getIdToken) => postGs("toggleBehaviorystDog", { dogId }, getIdToken),
  startBehaviorReport: (idZgloszenia, getIdToken) =>
    postGs("startBehaviorReport", { idZgłoszenia: idZgloszenia }, getIdToken),
  closeBehaviorReport: (payload, getIdToken) =>
    postGs("closeBehaviorReport", payload, getIdToken),
  saveBehaviorSession: (payload, getIdToken) =>
    postGs("saveBehaviorSession", payload, getIdToken),
  addPlannerSession: (payload, getIdToken) => postGs("addPlannerSession", payload, getIdToken),
  addWorkPlan: (payload, getIdToken) => postGs("addWorkPlan", payload, getIdToken),
  addExercise: (payload, getIdToken) => postGs("addExercise", payload, getIdToken),
  addDogToTherapy: (payload, getIdToken) => postGs("addDogToTherapy", payload, getIdToken),
};
