const KEY = "tinytales_session_v1";

// Save only what you need (avoid storing huge objects)
export function saveSession({ user, session }) {
  const payload = {
    user: user ? { id: user.id, email: user.email } : null,
    session: session
      ? {
          access_token: session.access_token,
          refresh_token: session.refresh_token,
          expires_in: session.expires_in,
          token_type: session.token_type,
        }
      : null,
    saved_at: Date.now(),
  };

  localStorage.setItem(KEY, JSON.stringify(payload));
  return payload;
}

export function loadSession() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem(KEY);
}

export function getAccessToken() {
  const s = loadSession();
  return s?.session?.access_token ?? null;
}
