import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../api/client";
import {
  fetchJson,
  saveEntryCore,
  patchPhotoPaths,
  uploadNewEntryPhotos,
  loadSignedPhotoUrls,
} from "./childJournal.api";

/* =========================
   Constants
========================= */
const MAX_PHOTOS = 3;
const MAX_MB = 1.5;
const MAX_BYTES = MAX_MB * 1024 * 1024;

/* =========================
   Small utils
========================= */
function revokeIfObjectUrl(photo) {
  if (photo?.file instanceof File && photo?.previewUrl) {
    URL.revokeObjectURL(photo.previewUrl);
  }
}

function revokeAllPreviews(entryPhotos) {
  (entryPhotos || []).forEach((p) => {
    if (p?.file instanceof File && p?.previewUrl) URL.revokeObjectURL(p.previewUrl);
  });
}

/* =========================
   Hooks
========================= */
export function useChildProfile(childId) {
  const [childAvatarUrl, setChildAvatarUrl] = useState("");

  useEffect(() => {
    let alive = true;

    async function load() {
      if (!childId) return;

      const res = await apiFetch(`/api/children/${childId}/profile`);
      const json = await fetchJson(res);

      if (!alive) return;

      if (res.ok && json.ok) {
        const url = json.profile?.avatar_url || "";
        setChildAvatarUrl(url ? `${url}?v=${Date.now()}` : "");
      } else {
        console.log("loadChildProfile failed:", res.status, json);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, [childId]);

  return { childAvatarUrl, setChildAvatarUrl };
}

export function useChildEntries(childId) {
  const [entries, setEntries] = useState([]);
  const [loadingEntries, setLoadingEntries] = useState(false);

  const reload = useCallback(async () => {
    if (!childId) return;

    setLoadingEntries(true);
    try {
      const res = await apiFetch(`/api/entries/children/${childId}/entries`);
      const json = await fetchJson(res);

      if (!res.ok) {
        console.log("Failed to load entries:", res.status, json);
        setEntries([]);
        return;
      }

      setEntries(json.entries ?? []);
    } catch (err) {
      console.log("Network error loading entries:", err);
      setEntries([]);
    } finally {
      setLoadingEntries(false);
    }
  }, [childId]);

  useEffect(() => {
    let alive = true;

    (async () => {
      if (!alive) return;
      await reload();
    })();

    return () => {
      alive = false;
    };
  }, [reload]);

  return { entries, setEntries, loadingEntries, reload };
}

export function useEntryEditor({ childId, setEntries }) {
  const [showNewEntry, setShowNewEntry] = useState(false);
  const [savingEntry, setSavingEntry] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);

  const [entryTitle, setEntryTitle] = useState("");
  const [entryContent, setEntryContent] = useState("");

  const [entryPhotos, setEntryPhotos] = useState([]); // [{file, previewUrl, existingPath?}]

  const resetEntryForm = useCallback(() => {
    revokeAllPreviews(entryPhotos);
    setEntryPhotos([]);
    setEditingEntry(null);
    setEntryTitle("");
    setEntryContent("");
    setShowNewEntry(false);
  }, [entryPhotos]);

  const openNewEntry = useCallback(() => {
    revokeAllPreviews(entryPhotos);
    setEntryPhotos([]);
    setEditingEntry(null);
    setEntryTitle("");
    setEntryContent("");
    setShowNewEntry(true);
  }, [entryPhotos]);

  const pickPhotos = useCallback(
    (e) => {
      const files = Array.from(e.target.files || []);
      e.target.value = "";
      if (!files.length) return;

      const remaining = MAX_PHOTOS - entryPhotos.length;
      const chosen = files.slice(0, remaining);

      for (const f of chosen) {
        if (f.size > MAX_BYTES) {
          alert(`One photo is too large. Max ${MAX_MB}MB each.`);
          return;
        }
      }

      const mapped = chosen.map((file) => ({
        file,
        previewUrl: URL.createObjectURL(file),
      }));

      setEntryPhotos((prev) => [...prev, ...mapped]);
    },
    [entryPhotos.length]
  );

  const removePhoto = useCallback((index) => {
    setEntryPhotos((prev) => {
      revokeIfObjectUrl(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const openEditEntry = useCallback(async (entry) => {
    setEditingEntry(entry);
    setEntryTitle(entry.title ?? "");
    setEntryContent(entry.content ?? "");
    setEntryPhotos([]);
    setShowNewEntry(true);

    const paths = (entry.photo_paths || []).slice(0, 3);
    if (paths.length === 0) return;

    try {
      const urls = await loadSignedPhotoUrls(entry.id);
      const mapped = urls.map((u, i) => ({
        file: null,
        previewUrl: `${u}&v=${Date.now()}`,
        existingPath: paths[i],
      }));
      setEntryPhotos(mapped);
    } catch (err) {
      console.log("photos preload failed:", err);
    }
  }, []);

  const save = useCallback(async () => {
    if (!childId) return;

    const t = entryTitle.trim();
    const c = entryContent.trim();
    if (!t || !c) return alert("Please fill in title and content.");

    setSavingEntry(true);
    try {
      const { res, json } = await saveEntryCore({
        editingEntry,
        childId,
        title: t,
        content: c,
      });

      if (!res.ok) {
        alert(json.message || json.error || "Failed to save entry");
        return;
      }

      if (!editingEntry) {
        setEntries((prev) => [json.entry, ...prev]);
      }

      const entryId = json.entry.id;

      if (entryPhotos.length > 0) {
        let keptExisting = [];
        if (editingEntry) {
          keptExisting = entryPhotos
            .filter((p) => !p.file)
            .map((p) => p.existingPath)
            .filter(Boolean)
            .slice(0, 3);

          await patchPhotoPaths(entryId, keptExisting);
        }

        const uploadedPaths = await uploadNewEntryPhotos(entryId, entryPhotos);

        const newUploadedOnly = uploadedPaths.filter((p) => !keptExisting.includes(p));
        const finalPaths = [...keptExisting, ...newUploadedOnly].slice(0, 3);

        const updatedEntry = await patchPhotoPaths(entryId, finalPaths);
        setEntries((prev) => prev.map((x) => (x.id === updatedEntry.id ? updatedEntry : x)));
      } else if (editingEntry) {
        const updatedEntry = await patchPhotoPaths(entryId, []);
        setEntries((prev) => prev.map((x) => (x.id === updatedEntry.id ? updatedEntry : x)));
      }

      resetEntryForm();
    } catch (err) {
      alert(err.message || "Save failed");
    } finally {
      setSavingEntry(false);
    }
  }, [childId, entryTitle, entryContent, editingEntry, entryPhotos, resetEntryForm, setEntries]);

  return {
    showNewEntry,
    savingEntry,
    editingEntry,
    entryTitle,
    entryContent,
    entryPhotos,

    setShowNewEntry,
    setEditingEntry,
    setEntryTitle,
    setEntryContent,

    openNewEntry,
    openEditEntry,
    resetEntryForm,
    pickPhotos,
    removePhoto,
    save,
  };
}