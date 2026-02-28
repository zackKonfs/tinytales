import { apiFetch } from "../api/client";
import { parseJsonSafe } from "../api/json";

export const fetchJson = parseJsonSafe;

/**
 * IMPORTANT:
 * Use LOCAL date instead of toISOString() (UTC),
 * otherwise Singapore time can shift the day/month.
 */
function todayLocalDateKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export async function saveEntryCore({ editingEntry, childId, title, content }) {
  const url = editingEntry
    ? `/api/entries/${editingEntry.id}`
    : "/api/entries";

  const method = editingEntry ? "PUT" : "POST";

  const body = editingEntry
    ? { title, content }
    : {
        child_id: childId,
        title,
        content,
        entry_date: todayLocalDateKey(), // local date
      };

  const res = await apiFetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const json = await fetchJson(res);
  return { res, json };
}

export async function patchPhotoPaths(entryId, photo_paths) {
  const res = await apiFetch(`/api/entries/${entryId}/photo-paths`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ photo_paths }),
  });

  const json = await fetchJson(res);

  if (!res.ok) {
    throw new Error(json.message || json.error || "Failed to update photo paths");
  }

  return json.entry;
}

export async function uploadNewEntryPhotos(entryId, entryPhotos) {
  const newOnes = entryPhotos.filter((p) => p?.file instanceof File);
  if (newOnes.length === 0) return [];

  const form = new FormData();
  newOnes.forEach((p) => form.append("photos", p.file));

  const res = await apiFetch(`/api/entries/${entryId}/photos`, {
    method: "POST",
    body: form,
  });

  const json = await fetchJson(res);

  if (!res.ok) {
    throw new Error(json.message || json.error || "Photo upload failed");
  }

  return json.entry?.photo_paths || [];
}

export async function loadSignedPhotoUrls(entryId) {
  const res = await apiFetch(`/api/entries/${entryId}/photos`, {
    method: "GET",
  });

  const json = await fetchJson(res);

  if (!res.ok) {
    throw new Error(json.message || json.error || "Failed to load photo urls");
  }

  return (json.urls || []).slice(0, 3);
}
