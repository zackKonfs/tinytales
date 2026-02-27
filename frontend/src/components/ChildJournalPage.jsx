import { useMemo, useState, useCallback, useEffect } from "react";
import { apiFetch } from "../api/client";
import { fetchJson } from "./childJournal.api";
import { styles, modalStyles } from "./childJournal.styles";
import { useChildProfile, useChildEntries, useEntryEditor } from "./childJournal.hooks";

const MAX_MB = 1.5;
const MAX_BYTES = MAX_MB * 1024 * 1024;

/* =========================
   Component
========================= */
export default function ChildJournalPage({ child, onLogout, onGoParent }) {
    const months = useMemo(
        () => ["January 2026", "February 2026", "March 2026", "April 2026"],
        []
    );
    const [activeMonth, setActiveMonth] = useState(months[0]);
    const [pageIndex, setPageIndex] = useState(0);
    const CARDS_PER_PAGE = 3;

    const todayText = "Today is 30th January 2026, Friday";

    const childId = child?.id;

    const { childAvatarUrl, setChildAvatarUrl } = useChildProfile(childId);
    const { entries, setEntries, loadingEntries } = useChildEntries(childId);
    const filteredEntries = useMemo(() => {
        if (!activeMonth) return entries;

        // activeMonth like "January 2026"
        const [monthName, yearStr] = activeMonth.split(" ");
        const year = Number(yearStr);

        const monthIndex = new Date(`${monthName} 1, ${year}`).getMonth(); // 0-11

        return (entries || []).filter((e) => {
            const d = new Date(e.entry_date);
            return d.getFullYear() === year && d.getMonth() === monthIndex;
        });
    }, [entries, activeMonth]);

    const pagedEntries = useMemo(() => {
        const start = pageIndex * CARDS_PER_PAGE;
        const end = start + CARDS_PER_PAGE;
        return filteredEntries.slice(start, end);
    }, [filteredEntries, pageIndex]);

    const editor = useEntryEditor({ childId, setEntries });

    useEffect(() => {
        if (!entries || entries.length === 0) return;

        const d = new Date(entries[0].entry_date);

        const monthName = d.toLocaleString("en-US", { month: "long" });
        const monthLabel = `${monthName} ${d.getFullYear()}`;

        setActiveMonth(monthLabel);
    }, [entries]);

    useEffect(() => {
        setPageIndex(0);
    }, [activeMonth]);

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
    },
    [setEntries]
  );

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.topRightActions}>
            <button style={styles.parentBtn} onClick={onGoParent}>
              Parent
            </button>
            <button style={styles.logoutBtn} onClick={onLogout}>
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
                <input
                  type="file"
                  accept="image/*"
                  style={styles.hiddenFileInput}
                  onChange={handleChildAvatarChange}
                />
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
                onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
            >
            ‹
          </button>

            <div style={styles.cardsRow}>
                {loadingEntries ? (
                    <div style={{ opacity: 0.6 }}>Loading entries...</div>
                ) : filteredEntries.length === 0 ? (
                    <div style={{ opacity: 0.6 }}>No entry yet.</div>
                ) : (
                    [...Array(CARDS_PER_PAGE)].map((_, index) => {
                    const e = pagedEntries[index];

                    if (!e) {
                        // invisible placeholder to keep layout width stable
                        return (
                        <div
                            key={`empty-${index}`}
                            style={styles.cardPlaceholder}
                        />
                        );
                    }

                    return (
                        <div key={e.id} style={styles.card}>
                        <div style={styles.thumb}>
                            <div style={styles.thumbPlaceholder} />
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

                        <div style={styles.cardDate}>
                            {new Date(e.entry_date).toLocaleString([], {
                            year: "numeric",
                            month: "numeric",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                            })}
                        </div>
                        </div>
                    );
                    })
                )}
            </div>

          <button
                style={styles.arrowBtn}
                aria-label="Next entries"
                onClick={() =>
                    setPageIndex((p) =>
                    (p + 1) * CARDS_PER_PAGE < filteredEntries.length ? p + 1 : p
                    )
                }
            >
            ›
          </button>
        </div>

        {/* Month carousel (static) */}
        <div style={styles.monthCarouselWrap}>
          <div style={styles.monthCarousel}>
            <button style={styles.monthArrow} aria-label="Previous month">
              ‹
            </button>

            <div style={styles.monthPills}>
              {months.map((m) => (
                <button
                  key={m}
                  onClick={() => setActiveMonth(m)}
                  style={{
                    ...styles.monthPill,
                    ...(activeMonth === m ? styles.monthPillActive : {}),
                  }}
                >
                  {m}
                </button>
              ))}
            </div>

            <button style={styles.monthArrow} aria-label="Next month">
              ›
            </button>
          </div>
        </div>
      </div>

      {editor.showNewEntry && (
        <div style={modalStyles.backdrop} onClick={() => editor.setShowNewEntry(false)}>
          <div style={modalStyles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={modalStyles.notebook}>
              <div style={modalStyles.date}>30th January 2026, Friday</div>

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
                    {editor.savingEntry
                      ? "Saving..."
                      : editor.editingEntry
                      ? "Save Changes"
                      : "Record Entry"}
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