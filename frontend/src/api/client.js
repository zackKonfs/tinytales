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

export async function register(email, password, profile) {
  const res = await fetch(`${API_BASE}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, profile }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.message || "Registration failed");
  }

  return data; // { ok, message, user, session }
}
