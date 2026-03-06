diff --git a/src/api/behawiorystaApi.js b/src/api/behawiorystaApi.js
index a107ceb3cf370cd14a0ea108a78ab435fa95d7c9..7c5812c85a041aede7707907f17db9a6b004888e 100644
--- a/src/api/behawiorystaApi.js
+++ b/src/api/behawiorystaApi.js
@@ -18,36 +18,38 @@ async function parseResponse(response) {
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
+  getBehaviorystDogs: (getIdToken) => postGs("getBehaviorystDogs", {}, getIdToken),
+  toggleBehaviorystDog: (dogId, getIdToken) => postGs("toggleBehaviorystDog", { dogId }, getIdToken),
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
