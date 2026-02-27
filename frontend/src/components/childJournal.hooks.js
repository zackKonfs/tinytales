import { useCallback, useEffect, useRef, useState } from "react";
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

// ✅ Merge helper: do not allow null/undefined from patch responses to wipe important fields
function mergeEntryNonNull(prevEntry, patch) {
  const next = { ...prevEntry };

  if (patch && typeof patch === "object") {
    Object.entries(patch).forEach(([k, v]) => {
      if (v !== null && v !== undefined) next[k] = v;
    });
  }

  // photo_paths: keep array if provided; otherwise keep previous (or default to [])
  if (Array.isArray(patch?.photo_paths)) {
    next.photo_paths = patch.photo_paths;
  } else if (!Array.isArray(next.photo_paths)) {
    next.photo_paths = [];
  }

  return next;
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

      // Create
      if (!editingEntry) {
        setEntries((prev) => [json.entry, ...prev]);
      }

      // ✅ Edit: always merge returned entry safely (avoid wiping fields)
      if (editingEntry) {
        setEntries((prev) =>
          prev.map((x) => (x.id === json.entry.id ? mergeEntryNonNull(x, json.entry) : x))
        );
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

          // Keep existing paths (server may return partial object)
          const keptPatch = await patchPhotoPaths(entryId, keptExisting);
          setEntries((prev) =>
            prev.map((x) => (x.id === entryId ? mergeEntryNonNull(x, keptPatch) : x))
          );
        }

        const uploadedPaths = await uploadNewEntryPhotos(entryId, entryPhotos);

        const newUploadedOnly = uploadedPaths.filter((p) => !keptExisting.includes(p));
        const finalPaths = [...keptExisting, ...newUploadedOnly].slice(0, 3);

        const updatedEntry = await patchPhotoPaths(entryId, finalPaths);

        // ✅ Key fix: merge safely
        setEntries((prev) =>
          prev.map((x) => (x.id === entryId ? mergeEntryNonNull(x, updatedEntry) : x))
        );
      } else if (editingEntry) {
        const updatedEntry = await patchPhotoPaths(entryId, []);

        // ✅ Key fix: merge safely
        setEntries((prev) =>
          prev.map((x) => (x.id === entryId ? mergeEntryNonNull(x, updatedEntry) : x))
        );
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

// =========================
// Thumbnails (signed urls)
// =========================
export function useEntryThumbs({ pagedEntries }) {
  const [thumbUrlByEntryId, setThumbUrlByEntryId] = useState({});
  const thumbRef = useRef({});

  // keep ref in sync
  useEffect(() => {
    thumbRef.current = thumbUrlByEntryId;
  }, [thumbUrlByEntryId]);


  // 2) fetch signed urls for visible entries (only if missing in cache)
  useEffect(() => {
    const list = (pagedEntries || []).filter(Boolean);
    if (list.length === 0) return;

    let cancelled = false;

    (async () => {
      await Promise.all(
        list.map(async (e) => {
          const hasPhotos = Array.isArray(e.photo_paths) && e.photo_paths.length > 0;
          if (!hasPhotos) return;
          if (thumbRef.current[e.id]) return;

          try {
            const res = await apiFetch(`/api/entries/${e.id}/photos`);
            const json = await fetchJson(res);
            if (!res.ok) return;

            const first = json?.urls?.[0];
            if (!first) return;

            if (cancelled) return;

            setThumbUrlByEntryId((prev) => {
              if (prev[e.id]) return prev;
              return { ...prev, [e.id]: first };
            });
          } catch {
            // ignore
          }
        })
      );
    })();

    return () => {
      cancelled = true;
    };
  }, [pagedEntries]);

  const clearThumb = useCallback((entryId) => {
    setThumbUrlByEntryId((prev) => {
      if (!prev[entryId]) return prev;
      const next = { ...prev };
      delete next[entryId];
      return next;
    });
  }, []);

  return { thumbUrlByEntryId, clearThumb };
}