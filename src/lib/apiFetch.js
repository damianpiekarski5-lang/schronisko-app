import { auth } from "../firebase";

export async function getAuthHeaders() {
  const user = auth?.currentUser;
  if (!user) return {};
  try {
    const token = await user.getIdToken();
    return { Authorization: `Bearer ${token}` };
  } catch {
    return {};
  }
}

export async function authFetch(url) {
  const headers = await getAuthHeaders();
  return fetch(url, { headers });
}
