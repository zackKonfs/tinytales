import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { apiFetch } from "../api/client";
import { fetchJson } from "./childJournal.api";
import { styles, modalStyles } from "./childJournal.styles";
import { useChildProfile, useChildEntries, useEntryEditor } from "./childJournal.hooks";
import ChildJournalCalendar from "./ChildJournalCalendar";
import YearPickerModal from "./YearPickerModal";
import EntryViewerModal from "./EntryViewerModal";

const MAX_MB = 1.5;
const MAX_BYTES = MAX_MB * 1024 * 1024;

// one highlight color used by calendar + carousel
const HIGHLIGHT = "#f4b24f";

function formatToday() {
  const d = new Date();
  const day = d.getDate();
  const suffix =
    day % 10 === 1 && day !== 11
      ? "st"
      : day % 10 === 2 && day !== 12
      ? "nd"
      : day % 10 === 3 && day !== 13
      ? "rd"
      : "th";
  const month = d.toLocaleString("en-US", { month: "long" });
  const year = d.getFullYear();
  const weekday = d.toLocaleString("en-US", { weekday: "long" });
  return `Today is ${day}${suffix} ${month} ${year}, ${weekday}`;
}

function formatEntryDateTime(isoString) {
  if (!isoString) return "";
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-SG", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function dateKeyFromEntry(e) {
  // Use entry_date for calendar grouping (YYYY-MM-DD)
  const raw = e?.entry_date;
  if (typeof raw === "string" && raw.length >= 10) return raw.slice(0, 10);
  // fallback: created_at date
  const d = new Date(e?.created_at || Date.now());
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function parseDateKey(key) {
  // "YYYY-MM-DD"
  if (!key || key.length < 10) return null;
  const y = Number(key.slice(0, 4));
  const m = Number(key.slice(5, 7)) - 1;
  const d = Number(key.slice(8, 10));
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
  return { year: y, monthIndex: m, day: d };
}

function sortAscByTime(a, b) {
  // earliest -> latest
  const ta = new Date(a?.created_at || a?.entry_date || 0).getTime();
  const tb = new Date(b?.created_at || b?.entry_date || 0).getTime();
  return ta - tb;
}

function sortDescByTime(a, b) {
  const ta = new Date(a?.created_at || a?.entry_date || 0).getTime();
  const tb = new Date(b?.created_at || b?.entry_date || 0).getTime();
  return tb - ta;
}

/* =========================
   Component
========================= */
export default function ChildJournalPage({ child, onLogout, onGoParent }) {
  const CARDS_PER_PAGE = 3;

  const todayText = useMemo(() => formatToday(), []);
  const childId = child?.id;

  const { childAvatarUrl, setChildAvatarUrl } = useChildProfile(childId);
  const { entries, setEntries, loadingEntries } = useChildEntries(childId);

  // ===== calendar month/year state (replaces month pills) =====
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const [viewMonthIndex, setViewMonthIndex] = useState(() => new Date().getMonth());

  // Keep view month aligned to newest entry when entries first load
  useEffect(() => {
    if (!entries || entries.length === 0) return;
    const newest = [...entries].sort(sortDescByTime)[0];
    const dk = dateKeyFromEntry(newest);
    const parsed = parseDateKey(dk);
    if (!parsed) return;
    setViewYear(parsed.year);
    setViewMonthIndex(parsed.monthIndex);
  }, [entries]);

  // ===== carousel control =====
  // start index of the 3-card window
  const [carouselStart, setCarouselStart] = useState(0);

  // selected via calendar
  const [selectedDateKey, setSelectedDateKey] = useState(null);
  const [selectedEntryId, setSelectedEntryId] = useState(null);

  // viewer modal (read-only)
  const [viewerEntry, setViewerEntry] = useState(null);
  const [showViewer, setShowViewer] = useState(false);

  // cache signed thumbnail URLs by entryId
  const [thumbUrlByEntryId, setThumbUrlByEntryId] = useState({});
  const thumbRef = useRef({});
  useEffect(() => {
    thumbRef.current = thumbUrlByEntryId;
  }, [thumbUrlByEntryId]);

  // invalidate thumbnail cache when entries change (especially when photos removed)
  useEffect(() => {
    const next = {};
    for (const e of entries || []) {
      const hasPhotos = Array.isArray(e.photo_paths) && e.photo_paths.length > 0;
      if (hasPhotos && thumbRef.current[e.id]) {
        next[e.id] = thumbRef.current[e.id];
      }
    }
    // only update if something actually changed
    const prevKeys = Object.keys(thumbRef.current);
    const nextKeys = Object.keys(next);
    if (prevKeys.length !== nextKeys.length) {
      setThumbUrlByEntryId(next);
      return;
    }
    for (const k of prevKeys) {
      if (next[k] !== thumbRef.current[k]) {
        setThumbUrlByEntryId(next);
        return;
      }
    }
    // no change
  }, [entries]);

  // entries grouped by dateKey for calendar markers + click behavior
  const entriesByDate = useMemo(() => {
    const map = {};
    for (const e of entries || []) {
      const k = dateKeyFromEntry(e);
      if (!k) continue;
      if (!map[k]) map[k] = [];
      map[k].push(e);
    }
    // keep each day list sorted (earliest -> latest) so we can pick latest easily
    Object.keys(map).forEach((k) => {
      map[k] = map[k].slice().sort(sortAscByTime);
    });
    return map;
  }, [entries]);

  // filtered entries for current month
  const monthEntries = useMemo(() => {
    const list = (entries || []).filter((e) => {
      const dk = dateKeyFromEntry(e);
      const parsed = parseDateKey(dk);
      if (!parsed) return false;
      return parsed.year === viewYear && parsed.monthIndex === viewMonthIndex;
    });

    // IMPORTANT: earliest left, latest right (ascending)
    return list.slice().sort(sortAscByTime);
  }, [entries, viewYear, viewMonthIndex]);

  // keep carouselStart valid when month changes
  useEffect(() => {
    setCarouselStart(0);
    setSelectedDateKey(null);
    setSelectedEntryId(null);
  }, [viewYear, viewMonthIndex]);

  const pagedEntries = useMemo(() => {
    const start = Math.max(0, Math.min(carouselStart, Math.max(0, monthEntries.length - CARDS_PER_PAGE)));
    const end = start + CARDS_PER_PAGE;
    return monthEntries.slice(start, end);
  }, [monthEntries, carouselStart]);

  const editor = useEntryEditor({ childId, setEntries });

  // fetch signed thumbnail URLs for the entries currently shown (only if they have photos)
  useEffect(() => {
    const list = (pagedEntries || []).filter(Boolean);
    if (list.length === 0) return;

    list.forEach(async (e) => {
      const hasPhotos = Array.isArray(e.photo_paths) && e.photo_paths.length > 0;
      if (!hasPhotos) return;

      if (thumbRef.current[e.id]) return;

      try {
        const res = await apiFetch(`/api/entries/${e.id}/photos`);
        const json = await fetchJson(res);
        if (!res.ok) return;

        const first = json.urls?.[0];
        if (!first) return;

        setThumbUrlByEntryId((prev) => {
          if (prev[e.id]) return prev;
          return { ...prev, [e.id]: first };
        });
      } catch {
        // ignore
      }
    });
  }, [pagedEntries]);

  const handleChildAvatarChange = useCallback(
    async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (file.size > MAX_BYTES) {
        alert("Image must be smaller than 1.5MB");
        e.target.value = "";
        return;
      }
      if (!file.type.startsWith("image/")) {
        alert("File must be an image");
        e.target.value = "";
        return;
      }

      try {
        const form = new FormData();
        form.append("avatar", file);

        const res = await apiFetch(`/api/avatar/children/${childId}`, {
          method: "POST",
          body: form,
        });

        const json = await fetchJson(res);
        if (!res.ok) {
          alert(json.error || json.message || `Upload failed (${res.status})`);
          return;
        }

        setChildAvatarUrl(`${json.avatar_url}?v=${Date.now()}`);
      } catch (err) {
        console.error(err);
        alert("Upload failed");
      } finally {
        e.target.value = "";
      }
    },
    [childId, setChildAvatarUrl]
  );

  const handleDeleteEntry = useCallback(
    async (entryId) => {
      if (!confirm("Delete this entry?")) return;

      const res = await apiFetch(`/api/entries/${entryId}/deactivate`, { method: "PATCH" });
      const json = await fetchJson(res);

      if (!res.ok) return alert(json.message || "Failed to delete");

      setEntries((prev) => prev.filter((x) => x.id !== entryId));
      // also clear cached thumb
      setThumbUrlByEntryId((prev) => {
        if (!prev[entryId]) return prev;
        const next = { ...prev };
        delete next[entryId];
        return next;
      });

      if (selectedEntryId === entryId) setSelectedEntryId(null);
      if (viewerEntry?.id === entryId) setShowViewer(false);
    },
    [setEntries, selectedEntryId, viewerEntry?.id]
  );

  // ===== calendar handlers =====
  const goPrevMonth = useCallback(() => {
    setSelectedDateKey(null);
    setSelectedEntryId(null);
    setCarouselStart(0);

    setViewMonthIndex((m) => {
      if (m > 0) return m - 1;
      setViewYear((y) => y - 1);
      return 11;
    });
  }, []);

  const goNextMonth = useCallback(() => {
    setSelectedDateKey(null);
    setSelectedEntryId(null);
    setCarouselStart(0);

    setViewMonthIndex((m) => {
      if (m < 11) return m + 1;
      setViewYear((y) => y + 1);
      return 0;
    });
  }, []);

  const centerEntryInCarousel = useCallback(
    (entryId) => {
      const idx = monthEntries.findIndex((x) => x.id === entryId);
      if (idx < 0) return;

      // put it in the middle slot (index 1) if possible
      let start = idx - 1;
      if (start < 0) start = 0;
      const maxStart = Math.max(0, monthEntries.length - CARDS_PER_PAGE);
      if (start > maxStart) start = maxStart;

      setCarouselStart(start);
      setSelectedEntryId(entryId);
    },
    [monthEntries]
  );

  const onSelectCalendarDate = useCallback(
    (dateKey) => {
      setSelectedDateKey(dateKey);

      const list = entriesByDate?.[dateKey] || [];
      if (list.length === 0) return;

      // if dateKey belongs to another month, switch month first
      const parsed = parseDateKey(dateKey);
      if (parsed && (parsed.year !== viewYear || parsed.monthIndex !== viewMonthIndex)) {
        setViewYear(parsed.year);
        setViewMonthIndex(parsed.monthIndex);
      }

      // pick latest entry of that date
      const latest = list.slice().sort(sortDescByTime)[0];
      if (latest?.id) {
        // NOTE: if month switched, monthEntries will update next render;
        // setSelectedEntryId now; centering will happen in effect below.
        setSelectedEntryId(latest.id);
      }
    },
    [entriesByDate, viewYear, viewMonthIndex]
  );

  // when selectedEntryId changes and monthEntries are ready, center it
  useEffect(() => {
    if (!selectedEntryId) return;
    centerEntryInCarousel(selectedEntryId);
  }, [selectedEntryId, centerEntryInCarousel]);

  // ===== year picker modal =====
  const [showYearPicker, setShowYearPicker] = useState(false);

  const handlePickMonthFromYear = useCallback((year, monthIdx) => {
    setSelectedDateKey(null);
    setSelectedEntryId(null);
    setCarouselStart(0);
    setViewYear(year);
    setViewMonthIndex(monthIdx);
  }, []);

  // ===== open viewer modal (read only) =====
  const openViewer = useCallback((entry) => {
    setViewerEntry(entry);
    setShowViewer(true);
  }, []);

  const closeViewer = useCallback(() => {
    setShowViewer(false);
    setViewerEntry(null);
  }, []);

  const onBackToParent = useCallback(() => {
    onGoParent?.();
  }, [onGoParent]);

  const onLogoutClick = useCallback(() => {
    onLogout?.();
  }, [onLogout]);

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.topRightActions}>
            <button style={styles.parentBtn} onClick={onBackToParent}>
              Parent
            </button>
            <button style={styles.logoutBtn} onClick={onLogoutClick}>
              Logout
            </button>
          </div>

          <div style={styles.titleRow}>
            <div style={styles.avatarWrapper}>
              <div style={styles.avatarCircle}>
                {childAvatarUrl && (
                  <img
                    src={childAvatarUrl}
                    alt="child avatar"
                    style={styles.avatarImage}
                    onError={() => setChildAvatarUrl("")}
                  />
                )}
              </div>

              <label style={styles.avatarEditBtn} title="Change avatar">
                <input type="file" accept="image/*" style={styles.hiddenFileInput} onChange={handleChildAvatarChange} />
                ✏️
              </label>
            </div>

            <h1 style={styles.title}>{(child?.name ?? "Zack")}'s Tales</h1>
          </div>

          <button style={styles.newEntryBtn} onClick={editor.openNewEntry}>
            NEW ENTRY
          </button>

          <div style={styles.today}>{todayText}</div>
        </div>

        {/* Top carousel */}
        <div style={styles.topCarousel}>
          <button
            style={styles.arrowBtn}
            aria-label="Previous entries"
            onClick={() => setCarouselStart((s) => Math.max(0, s - CARDS_PER_PAGE))}
          >
            ‹
          </button>

          <div style={styles.cardsRow}>
            {loadingEntries ? (
              <div style={{ opacity: 0.6 }}>Loading entries...</div>
            ) : monthEntries.length === 0 ? (
              <div style={{ opacity: 0.6 }}>No entry yet.</div>
            ) : (
              [...Array(CARDS_PER_PAGE)].map((_, index) => {
                const e = pagedEntries[index];

                if (!e) return <div key={`empty-${index}`} style={styles.cardPlaceholder} />;

                const thumbUrl = thumbUrlByEntryId[e.id] || "";
                const title = (e.title || "").trim() || "Untitled";
                const titleInitial = title[0]?.toUpperCase() || "📷";
                const savedAtText = formatEntryDateTime(e.created_at || e.entry_date);

                const isActive = selectedEntryId === e.id;

                return (
                  <div
                    key={e.id}
                    style={{
                        ...styles.card,
                        ...(isActive ? styles.cardActive : {}),
                        ...(isActive ? { borderColor: HIGHLIGHT } : {}),
                    }}
                    onClick={() => openViewer(e)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(ev) => {
                      if (ev.key === "Enter" || ev.key === " ") {
                        ev.preventDefault();
                        openViewer(e);
                      }
                    }}
                    title="Click to read"
                  >
                    {/* Title ABOVE photo (inside card) */}
                    <div style={styles.cardTitle} title={title}>
                      {title}
                    </div>

                    <div style={styles.thumb}>
                      {thumbUrl ? (
                        <img src={thumbUrl} alt="" style={styles.thumbImg} />
                      ) : (
                        <div style={styles.thumbPlaceholder}>
                          <div style={styles.thumbPlaceholderInner}>
                            <div style={styles.thumbLetter}>{titleInitial}</div>
                            <div style={styles.thumbHint}>No photo</div>
                          </div>
                        </div>
                      )}

                      {/* action buttons (remain on carousel, not inside viewer) */}
                      <div style={styles.cardActions}>
                        <button
                          style={styles.iconBtn}
                          title="Edit"
                          onClick={async (ev) => {
                            ev.stopPropagation();
                            await editor.openEditEntry(e);
                          }}
                        >
                          ✎
                        </button>

                        <button
                          style={styles.iconBtn}
                          title="Delete"
                          onClick={(ev) => {
                            ev.stopPropagation();
                            handleDeleteEntry(e.id);
                          }}
                        >
                          🗑
                        </button>
                      </div>
                    </div>

                    <div style={styles.cardDate}>{savedAtText}</div>
                  </div>
                );
              })
            )}
          </div>

          <button
            style={styles.arrowBtn}
            aria-label="Next entries"
            onClick={() =>
              setCarouselStart((s) => {
                const maxStart = Math.max(0, monthEntries.length - CARDS_PER_PAGE);
                return Math.min(maxStart, s + CARDS_PER_PAGE);
              })
            }
          >
            ›
          </button>
        </div>

        {/* Monthly calendar */}
        <ChildJournalCalendar
            year={viewYear}
            monthIndex={viewMonthIndex}
            entriesByDate={entriesByDate}
            selectedDateKey={selectedDateKey}
            highlightColor={HIGHLIGHT}
            onPrevMonth={goPrevMonth}
            onNextMonth={goNextMonth}
            onSelectDate={onSelectCalendarDate}
            onOpenYearPicker={() => setShowYearPicker(true)}
        />

        {/* Year button below calendar */}
        <div style={styles.yearBtnRow}>
          <button style={styles.yearBtn} onClick={() => setShowYearPicker(true)}>
            Year
          </button>
        </div>
      </div>

      {/* Read-only viewer modal */}
      <EntryViewerModal isOpen={showViewer} entry={viewerEntry} onClose={closeViewer} />

      {/* Year picker modal */}
      <YearPickerModal
        isOpen={showYearPicker}
        initialYear={viewYear}
        onClose={() => setShowYearPicker(false)}
        onPickMonth={handlePickMonthFromYear}
      />

      {/* Editor modal (new/edit) */}
      {editor.showNewEntry && (
        <div style={modalStyles.backdrop} onClick={() => editor.setShowNewEntry(false)}>
          <div style={modalStyles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={modalStyles.notebook}>
              <div style={modalStyles.date}>{formatToday().replace("Today is ", "")}</div>

              <div style={modalStyles.field}>
                <div style={modalStyles.label}>Title</div>
                <input
                  style={modalStyles.titleInput}
                  placeholder="Write a short title..."
                  value={editor.entryTitle}
                  onChange={(e) => editor.setEntryTitle(e.target.value)}
                />
              </div>

              <div style={{ ...modalStyles.field, flex: 1 }}>
                <div style={modalStyles.label}>Content</div>
                <textarea
                  style={modalStyles.textarea}
                  placeholder="Write about today's tale..."
                  value={editor.entryContent}
                  onChange={(e) => editor.setEntryContent(e.target.value)}
                />
              </div>

              <div style={modalStyles.bottomSection}>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  style={{ display: "none" }}
                  id="entryPhotosInput"
                  onChange={editor.pickPhotos}
                />

                <div style={modalStyles.photoRow}>
                  {[0, 1, 2].map((i) => (
                    <label key={i} htmlFor="entryPhotosInput" style={modalStyles.photoSlot}>
                      {editor.entryPhotos[i]?.previewUrl ? (
                        <>
                          <img src={editor.entryPhotos[i].previewUrl} alt="" style={modalStyles.photoImg} />

                          <button
                            type="button"
                            style={modalStyles.photoRemoveBtn}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              editor.removePhoto(i);
                            }}
                            title="Remove photo"
                          >
                            ×
                          </button>
                        </>
                      ) : (
                        <span style={modalStyles.plus}>+</span>
                      )}
                    </label>
                  ))}
                </div>

                <div style={modalStyles.actions}>
                  <button style={modalStyles.primary} disabled={editor.savingEntry} onClick={editor.save}>
                    {editor.savingEntry ? "Saving..." : editor.editingEntry ? "Save Changes" : "Record Entry"}
                  </button>

                  <button style={modalStyles.secondary} onClick={editor.resetEntryForm}>
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}