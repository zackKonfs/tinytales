import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { apiFetch } from "../api/client";
import { fetchJson } from "./childJournal.api";
import { styles, modalStyles } from "./childJournal.styles";
import { useChildProfile, useChildEntries, useEntryEditor } from "./childJournal.hooks";
import ChildJournalCalendar from "./ChildJournalCalendar";
import YearPickerModal from "./YearPickerModal";
import EntryViewerModal from "./EntryViewerModal";
import {
  formatToday,
  parseDateKey,
  dateKeyFromEntry,
  sortAscByTime,
  sortDescByTime,
  capFirst,
  monthClamp,
  loadSavedView,
  saveView,
  getBirthdayKeyForYear,
  YEAR_RANGE,
} from "./childJournal.utils";
import ChildJournalCard from "./ChildJournalCard";

const MAX_BYTES = 1.5 * 1024 * 1024;

// one highlight color used by calendar + carousel
const HIGHLIGHT = "#f4b24f";

// birthday highlight colors (calendar)
const CHILD_BDAY_COLOR = "#5cc8ff"; // child birthday dot/bg
// const PARENT_BDAY_COLOR = "#ff77c8"; // parent birthday dot/bg (not used on child page)

const { MIN_YEAR, MAX_YEAR } = YEAR_RANGE;

/* =========================
   Component
========================= */
export default function ChildJournalPage({ child }) {
  const CARDS_PER_PAGE = 3;

  const todayText = useMemo(() => formatToday(), []);
  const childId = child?.id;

  const { childAvatarUrl, setChildAvatarUrl } = useChildProfile(childId);
  const { entries, setEntries, loadingEntries } = useChildEntries(childId);

  // ===== calendar month/year state (replaces month pills) =====
  const [viewYear, setViewYear] = useState(() => {
  const saved = loadSavedView(childId);
    return saved?.year ?? new Date().getFullYear();
    });

    const [viewMonthIndex, setViewMonthIndex] = useState(() => {
    const saved = loadSavedView(childId);
    return saved?.monthIndex ?? new Date().getMonth();
    });

    useEffect(() => {
        saveView(childId, viewYear, viewMonthIndex);
    }, [childId, viewYear, viewMonthIndex]);

  const didInitMonthRef = useRef(false);
  // Keep view month aligned to newest entry when entries first load
  useEffect(() => {
        // If a view was saved for this child, don't auto-jump.
        const saved = loadSavedView(childId);
        if (saved) return;
        // only run once on first successful entries load
        if (didInitMonthRef.current) return;
        if (!entries || entries.length === 0) return;

        const newest = [...entries].sort(sortDescByTime)[0];
        const dk = dateKeyFromEntry(newest);
        const parsed = parseDateKey(dk);
        if (!parsed) return;

        const clamped = monthClamp(parsed.year, parsed.monthIndex);
        setViewYear(clamped.y);
        setViewMonthIndex(clamped.m);

        didInitMonthRef.current = true;
    }, [entries, childId]);

  // ===== carousel control =====
  // start index of the 3-card window
  const [carouselStart, setCarouselStart] = useState(0);

  // selected via calendar
  const [selectedDateKey, setSelectedDateKey] = useState(null);
  const [selectedEntryId, setSelectedEntryId] = useState(null);

  // viewer modal (read-only)
  const [viewerEntry, setViewerEntry] = useState(null);
  const [showViewer, setShowViewer] = useState(false);

    // ===== thumbnail cache (entryId -> signed url) =====
  const [thumbUrlByEntryId, setThumbUrlByEntryId] = useState({});

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

    // Fetch signed thumbnail urls for only the entries we are showing in the carousel.
    const fetchThumbsForEntries = useCallback(
        async (list) => {
        const arr = Array.isArray(list) ? list : [];

        // only fetch if entry has photo_paths AND we don't already have a cached url
        const need = arr.filter((e) => {
            const hasPhotos = Array.isArray(e?.photo_paths) ? e.photo_paths.length > 0 : false;
            return e?.id && hasPhotos && !thumbUrlByEntryId[e.id];
        });

        if (need.length === 0) return;

        await Promise.all(
            need.map(async (e) => {
            try {
                const res = await apiFetch(`/api/entries/${e.id}/photos`);
                const json = await fetchJson(res);
                if (!res.ok) return;

                // Adjust to match backend response shape if needed
                const urls = json?.urls || json?.signedUrls || json?.signed_urls || json?.photos || [];
                const first = Array.isArray(urls) ? urls[0] : null;

                if (first) {
                setThumbUrlByEntryId((prev) => ({ ...prev, [e.id]: first }));
                }
            } catch (err) {
                console.error("thumbnail fetch failed:", e?.id, err);
            }
            })
        );
        },
        [thumbUrlByEntryId]
    );

        // When carousel entries change, fetch thumbs for those 3 visible entries only
  useEffect(() => {
    fetchThumbsForEntries(pagedEntries);
  }, [pagedEntries, fetchThumbsForEntries]);

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
    setThumbUrlByEntryId((prev) => {
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
      let nextM = m - 1;
      let nextY = viewYear;

      if (nextM < 0) {
        nextM = 11;
        nextY = viewYear - 1;
      }

      // clamp to min
      if (nextY < MIN_YEAR) return m;
      if (nextY === MIN_YEAR && nextM < 0) return m;

      setViewYear(nextY);
      return nextM;
    });
  }, [viewYear]);

  const goNextMonth = useCallback(() => {
    setSelectedDateKey(null);
    setSelectedEntryId(null);
    setCarouselStart(0);

    setViewMonthIndex((m) => {
      let nextM = m + 1;
      let nextY = viewYear;

      if (nextM > 11) {
        nextM = 0;
        nextY = viewYear + 1;
      }

      // clamp to max
      if (nextY > MAX_YEAR) return m;

      setViewYear(nextY);
      return nextM;
    });
  }, [viewYear]);

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
        const clamped = monthClamp(parsed.year, parsed.monthIndex);
        setViewYear(clamped.y);
        setViewMonthIndex(clamped.m);
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
    // clamp year range here (even if YearPickerModal shows others)
    const safeYear = Math.max(MIN_YEAR, Math.min(MAX_YEAR, Number(year) || MAX_YEAR));
    const safeMonth = Math.max(0, Math.min(11, Number(monthIdx) || 0));

    setSelectedDateKey(null);
    setSelectedEntryId(null);
    setCarouselStart(0);
    setViewYear(safeYear);
    setViewMonthIndex(safeMonth);
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

  // title display name
  const displayName = useMemo(() => {
    const base = capFirst(child?.name ?? "Zack");
    return base || "Zack";
  }, [child?.name]);

  // birthday key for current viewYear (child only for now)
  const childBirthdayKey = useMemo(() => {
    return getBirthdayKeyForYear(child?.date_of_birth, viewYear);
  }, [child?.date_of_birth, viewYear]);

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
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

              <label className="tt-btn" style={styles.avatarEditBtn} title="Change avatar">
                <input type="file" accept="image/*" style={styles.hiddenFileInput} onChange={handleChildAvatarChange} />
                ✏️
              </label>
            </div>

            <h1 style={styles.title}>{displayName}'s Tales</h1>
          </div>

          <button className="tt-btn" style={styles.newEntryBtn} onClick={editor.openNewEntry}>
            NEW ENTRY
          </button>

          <div style={styles.today}>{todayText}</div>
        </div>

        {/* Top carousel */}
        <div style={styles.topCarousel}>
          <button
            className="tt-arrow"
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

                return (
                <ChildJournalCard
                    key={e.id}
                    entry={e}
                    isActive={selectedEntryId === e.id}
                    thumbUrl={thumbUrlByEntryId[e.id] || ""}
                    styles={styles}
                    onOpenViewer={openViewer}
                    onEdit={editor.openEditEntry}
                    onDelete={handleDeleteEntry}
                />
                );
              })
            )}
          </div>

          <button
            className="tt-arrow"
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
          minYear={MIN_YEAR}
          maxYear={MAX_YEAR}
          birthdayMarks={
            childBirthdayKey
              ? [
                  {
                    key: childBirthdayKey,
                    color: CHILD_BDAY_COLOR,
                    label: "Child birthday",
                  },
                ]
              : []
          }
        />
      </div>

      {/* Read-only viewer modal */}
      <EntryViewerModal isOpen={showViewer} entry={viewerEntry} onClose={closeViewer} />

      {/* Year picker modal */}
      <YearPickerModal
        key={`${showYearPicker}-${viewYear}-${viewMonthIndex}`}
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
                            className="tt-btn"
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
                  <button className="tt-btn" style={modalStyles.primary} disabled={editor.savingEntry} onClick={editor.save}>
                    {editor.savingEntry ? "Saving..." : editor.editingEntry ? "Save Changes" : "Record Entry"}
                  </button>

                  <button className="tt-btn" style={modalStyles.secondary} onClick={editor.resetEntryForm}>
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