import { getAccessToken, clearSession } from "../auth/session";

const API_BASE = "http://localhost:5000";

export async function apiFetch(path, options = {}) {
  const token = getAccessToken();

  const headers = {
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  // If backend says "not authorized", clear local session (logout)
  if (res.status === 401) {
    clearSession();
  }

  return res;
}
