import { apiFetch } from "../api/client";

export async function safeJson(res) {
  return res.json().catch(() => ({}));
}

export async function fetchHealth() {
  const endpoint = "/api/health";
  const res = await apiFetch(endpoint);
  const json = await safeJson(res);
  return { endpoint, res, json };
}

export async function fetchMe() {
  const endpoint = "/api/me";
  const res = await apiFetch(endpoint);
  const json = await safeJson(res);
  return { endpoint, res, json };
}

export async function fetchParents() {
  const endpoint = "/api/dev/parents";
  const res = await apiFetch(endpoint);
  const json = await safeJson(res);
  return { endpoint, res, json };
}

export async function fetchChildren() {
  const endpoint = "/api/dev/children?include_inactive=1";
  const res = await apiFetch(endpoint);
  const json = await safeJson(res);
  return { endpoint, res, json };
}

export async function fetchEntries(childId) {
  const endpoint = `/api/dev/children/${childId}/entries`;
  const res = await apiFetch(endpoint);
  const json = await safeJson(res);
  return { endpoint, res, json };
}

export async function patchChildActive(childId, is_active) {
  const endpoint = `/api/dev/children/${childId}`;
  const res = await apiFetch(endpoint, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ is_active }),
  });
  const json = await safeJson(res);
  return { endpoint, res, json };
}