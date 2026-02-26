import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../api/client";
import notebookImg from "../assets/notebook.png";

export default function ChildJournalPage({ child, onLogout, onGoParent }) {

    const [showNewEntry, setShowNewEntry] = useState(false);
    const [entries, setEntries] = useState([]);
    const [loadingEntries, setLoadingEntries] = useState(false);
    const [entryTitle, setEntryTitle] = useState("");
    const [entryContent, setEntryContent] = useState("");
    const [savingEntry, setSavingEntry] = useState(false);
    const [editingEntry, setEditingEntry] = useState(null);

  const months = useMemo(
    () => ["January 2026", "February 2026", "March 2026", "April 2026"],
    []
  );

  const [activeMonth, setActiveMonth] = useState(months[0]);

  const todayText = "Today is 30th January 2026, Friday";

  const [childAvatarUrl, setChildAvatarUrl] = useState("");

    async function handleChildAvatarChange(e) {
        const file = e.target.files?.[0];
        if (!file) return;

        const MAX = 1.5 * 1024 * 1024;

        if (file.size > MAX) {
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

            const res = await apiFetch(`/api/avatar/children/${child?.id}`, {
            method: "POST",
            body: form,
            });

            const json = await res.json().catch(() => ({}));

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
    }

    useEffect(() => {
        async function loadChildProfile() {
            if (!child?.id) return;

            const res = await apiFetch(`/api/children/${child.id}/profile`);
            const json = await res.json().catch(() => ({}));

            if (res.ok && json.ok) {
                const url = json.profile?.avatar_url || "";
                setChildAvatarUrl(url ? `${url}?v=${Date.now()}` : "");
            } else {
                console.log("loadChildProfile failed:", res.status, json);
            }
        }

        loadChildProfile();
    }, [child?.id]);

  useEffect(() => {
  if (!child?.id) return;

  let alive = true;

  async function loadEntries() {
        setLoadingEntries(true);
        try {
        const res = await apiFetch(`/api/entries/children/${child.id}/entries`);
        const json = await res.json().catch(() => ({}));
        if (!alive) return;

        if (!res.ok) {
            console.log("Failed to load entries:", res.status, json);
            setEntries([]);
            return;
        }

        setEntries(json.entries ?? []);
        } catch (err) {
        if (!alive) return;
        console.log("Network error loading entries:", err);
        setEntries([]);
        } finally {
        if (alive) setLoadingEntries(false);
        }
    }

    loadEntries();

    return () => {
        alive = false;
    };
    }, [child?.id]);

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

    <h1 style={styles.title}>
        {(child?.name ?? "Zack")}'s Tales
    </h1>

    </div>

            <button style={styles.newEntryBtn} onClick={() => setShowNewEntry(true)}>
                NEW ENTRY
            </button>
          <div style={styles.today}>{todayText}</div>
        </div>

        {/* Top carousel (static row for now) */}
        <div style={styles.topCarousel}>
          <button style={styles.arrowBtn} aria-label="Previous entries">
            ‹
          </button>

        <div style={styles.cardsRow}>
            {loadingEntries ? (
                <div style={{ opacity: 0.6 }}>Loading entries...</div>
            ) : entries.length === 0 ? (
                <div style={{ opacity: 0.6 }}>No entry yet.</div>
            ) : (
                entries.map((e) => (
                <div key={e.id} style={styles.card}>
                    <div style={styles.thumb}>
                    <div style={styles.thumbPlaceholder} />
                    <div style={styles.cardActions}>
                        <button
                            style={styles.iconBtn}
                            title="Edit"
                            onClick={(ev) => {
                                ev.stopPropagation();
                                setEditingEntry(e);
                                setEntryTitle(e.title ?? "");
                                setEntryContent(e.content ?? "");
                                setShowNewEntry(true);
                            }}
                        >
                        ✎
                        </button>
                        <button
                            style={styles.iconBtn}
                            title="Delete"
                            onClick={async (ev) => {
                                ev.stopPropagation();

                                if (!confirm("Delete this entry?")) return;

                                const res = await apiFetch(`/api/entries/${e.id}/deactivate`, {
                                method: "PATCH",
                                });

                                const json = await res.json().catch(() => ({}));
                                if (!res.ok) return alert(json.message || "Failed to delete");

                                // remove from UI
                                setEntries((prev) => prev.filter((x) => x.id !== e.id));
                            }}
                        >
                        🗑
                        </button>
                    </div>
                    </div>

                    <div style={styles.cardDate}>
                    {new Date(e.entry_date).toLocaleDateString()}
                    </div>
                </div>
                ))
            )}
        </div>

          <button style={styles.arrowBtn} aria-label="Next entries">
            ›
          </button>
        </div>

        {/* Month carousel (static for now) */}
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

      {showNewEntry && (
            <div style={modalStyles.backdrop} onClick={() => setShowNewEntry(false)}>
                <div style={modalStyles.modal} onClick={(e) => e.stopPropagation()}>
                <div style={modalStyles.notebook}>
                    <div style={modalStyles.date}>30th January 2026, Friday</div>

                    <div style={modalStyles.field}>
                        <div style={modalStyles.label}>Title</div>
                        <input
                            style={modalStyles.titleInput}
                            placeholder="Write a short title..."
                            value={entryTitle}
                            onChange={(e) => setEntryTitle(e.target.value)}
                        />
                    </div>

                    <div style={{...modalStyles.field, flex: 1}}>
                    <div style={modalStyles.label}>Content</div>
                    <textarea
                        style={modalStyles.textarea}
                        placeholder="Write about today's tale..."
                        value={entryContent}
                        onChange={(e) => setEntryContent(e.target.value)}
                    />
                    </div>

                    <div style={modalStyles.bottomSection}>
                        <div style={modalStyles.photoRow}>
                        <button style={modalStyles.photoBox}>+</button>
                        <button style={modalStyles.photoBox}>+</button>
                        <button style={modalStyles.photoBox}>+</button>
                        </div>

                        <div style={modalStyles.actions}>
                        <button
                            style={modalStyles.primary}
                            disabled={savingEntry}
                            onClick={async () => {
                                if (!child?.id) return;

                                const t = entryTitle.trim();
                                const c = entryContent.trim();
                                if (!t || !c) return alert("Please fill in title and content.");

                                setSavingEntry(true);
                                try {
                                    const url = editingEntry
                                        ? `/api/entries/${editingEntry.id}`
                                        : "/api/entries";

                                        const method = editingEntry ? "PATCH" : "POST";

                                        const body = editingEntry
                                        ? { title: t, content: c }
                                        : {
                                            child_id: child.id,
                                            title: t,
                                            content: c,
                                            entry_date: new Date().toISOString().slice(0, 10),
                                            };

                                        const res = await apiFetch(url, {
                                        method,
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify(body),
                                    });

                                    const json = await res.json().catch(() => ({}));
                                    if (!res.ok) return alert(json.message || json.error || "Failed to save entry");

                                    if (editingEntry) {
                                        setEntries((prev) =>
                                            prev.map((x) => (x.id === json.entry.id ? json.entry : x))
                                        );
                                    } else {
                                        setEntries((prev) => [json.entry, ...prev]);
                                    }

                                    // reset + close
                                    setEditingEntry(null);
                                    setEntryTitle("");
                                    setEntryContent("");
                                    setShowNewEntry(false);
                                    } finally {
                                    setSavingEntry(false);
                                }
                            }}
                            >
                            {savingEntry ? "Saving..." : (editingEntry ? "Save Changes" : "Record Entry")}
                        </button>
                        <button
                            style={modalStyles.secondary}
                            onClick={() => {
                                setShowNewEntry(false);
                                setEditingEntry(null);
                                setEntryTitle("");
                                setEntryContent("");
                            }}
                        >
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

const styles = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(#cfe2f2, #f7e4bf)",
    padding: "40px 16px",
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
    color: "#4a3a2a",
  },
  container: {
    maxWidth: 1050,
    margin: "0 auto",
    textAlign: "center",
  },
  header: {
    marginBottom: 28,
    position: "relative",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    paddingTop: 20,
  },
  topRightActions: {
    position: "absolute",
    top: 0,
    right: 0,
    display: "flex",
    gap: 16,
    },
  title: {
    fontSize: 64,
    margin: 0,
    letterSpacing: 1,
  },
  newEntryBtn: {
    marginTop: 16,
    padding: "12px 28px",
    borderRadius: 14,
    border: "2px solid rgba(0,0,0,0.15)",
    background: "#f4b24f",
    color: "#3b2a1d",
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 6px 0 rgba(0,0,0,0.12)",
  },
  today: {
    marginTop: 14,
    opacity: 0.9,
  },

  topCarousel: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    marginTop: 22,
  },
  arrowBtn: {
    width: 44,
    height: 44,
    borderRadius: 999,
    border: "1px solid rgba(0,0,0,0.12)",
    background: "rgba(255,255,255,0.65)",
    cursor: "pointer",
    fontSize: 22,
  },
  cardsRow: {
    display: "flex",
    gap: 16,
    overflow: "hidden", // later we’ll implement real scrolling
    padding: 6,
  },
  card: {
    width: 180,
    background: "rgba(255,255,255,0.75)",
    border: "1px solid rgba(0,0,0,0.12)",
    borderRadius: 14,
    padding: 10,
    boxShadow: "0 10px 20px rgba(0,0,0,0.08)",
  },
  thumb: {
    position: "relative",
    borderRadius: 12,
    overflow: "hidden",
    height: 120,
    background: "#fff",
    border: "1px solid rgba(0,0,0,0.08)",
  },
  thumbPlaceholder: {
    width: "100%",
    height: "100%",
    background:
      "linear-gradient(135deg, rgba(77,149,142,0.2), rgba(244,178,79,0.25))",
  },
  cardActions: {
    position: "absolute",
    right: 10,
    bottom: 10,
    display: "flex",
    gap: 8,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 999,
    border: "1px solid rgba(0,0,0,0.12)",
    background: "rgba(255,255,255,0.85)",
    cursor: "pointer",
  },
  cardDate: {
    marginTop: 10,
    fontSize: 14,
    opacity: 0.9,
  },

  monthCarouselWrap: {
    marginTop: 30,
    display: "flex",
    justifyContent: "center",
  },
  monthCarousel: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    background: "rgba(255,255,255,0.55)",
    border: "1px solid rgba(0,0,0,0.12)",
    borderRadius: 16,
    padding: "10px 12px",
    boxShadow: "0 10px 20px rgba(0,0,0,0.06)",
  },
  monthArrow: {
    width: 38,
    height: 38,
    borderRadius: 999,
    border: "1px solid rgba(0,0,0,0.12)",
    background: "rgba(255,255,255,0.75)",
    cursor: "pointer",
    fontSize: 18,
  },
  monthPills: {
    display: "flex",
    gap: 10,
    padding: "0 4px",
  },
  monthPill: {
    padding: "10px 14px",
    borderRadius: 12,
    border: "1px solid rgba(0,0,0,0.12)",
    background: "rgba(255,255,255,0.75)",
    cursor: "pointer",
    fontWeight: 600,
  },
  monthPillActive: {
    background: "#f4b24f",
  },
    parentBtn: {
        padding: "12px 18px",
        borderRadius: 14,
        border: "1px solid rgba(0,0,0,0.12)",
        background: "#f6efe7",
        color: "#245a52",
        fontWeight: 700,
        cursor: "pointer",
        boxShadow: "0 8px 18px rgba(0,0,0,0.12)",
    },

    logoutBtn: {
        padding: "12px 18px",
        borderRadius: 14,
        border: "1px solid rgba(0,0,0,0.12)",
        background: "#f6efe7",
        color: "#a3402c",
        fontWeight: 700,
        cursor: "pointer",
        boxShadow: "0 8px 18px rgba(0,0,0,0.12)",
    },

    // title avatar
    titleRow: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
    },

    avatarWrapper: {
        position: "relative",
        width: 100,
        height: 85,
    },

    avatarCircle: {
        width: 100,
        height: 100,
        borderRadius: "50%",
        background: "#eee",
        overflow: "hidden",
    },

    avatarImage: {
        width: "100%",
        height: "100%",
        objectFit: "cover",
    },

    avatarEditBtn: {
        position: "absolute",
        bottom: -8,
        right: -4,
        width: 24,
        height: 24,
        borderRadius: "50%",
        background: "#ffffff",
        border: "1px solid #ddd",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
        fontSize: 12,
    },

    hiddenFileInput: {
        display: "none",
    },
};

const modalStyles = {
  backdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.45)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    padding: 16,
  },

  modal: {
    width: "min(560px, 92vw)",
  },

  notebook: {
    width: 520,
    aspectRatio: "2 / 3",
    backgroundImage: `url(${notebookImg})`,
    backgroundSize: "contain",
    backgroundRepeat: "no-repeat",
    backgroundPosition: "center",
    position: "relative",

    paddingTop: 58,
    paddingRight: 54,
    paddingBottom: 90,
    paddingLeft: 92,

    display: "flex",
    flexDirection: "column",
  },

  date: {
    position: "absolute",
    top: 65,
    right: 56,
    fontSize: 14,
    opacity: 0.85,
  },

  field: { textAlign: "left" },
  label: { fontWeight: 700, fontSize: 18, marginBottom: 6 },

  input: {
    width: "100%",
    height: 38,
    borderRadius: 8,
    border: "1px solid rgba(0,0,0,0.18)",
    padding: "8px 10px",
    background: "rgba(255,255,255,0.65)",
    fontSize: 14,
  },

  titleInput: {
        width: "100%",
        height: 44,
        borderRadius: 12,
        border: "1px solid #d8cfc2",
        padding: "0 14px",
        fontSize: 16,
        background: "rgba(255,255,255,0.75)",
        outline: "none",
    },

    textarea: {
        width: "100%",
        height: 330,
        borderRadius: 12,
        border: "1px solid #d8cfc2",
        padding: 14,
        fontSize: 16,
        resize: "none",
        background: "rgba(255,255,255,0.75)",
    },

  photoRow: {
    display: "flex",
    gap: 18,
    justifyContent: "center",
    marginTop: 6,
    marginBottom: 6,
  },

  photoBox: {
    width: 86,
    height: 66,
    borderRadius: 10,
    border: "2px dashed rgba(0,0,0,0.25)",
    background: "rgba(255,255,255,0.35)",
    cursor: "pointer",
    fontSize: 30,
    lineHeight: "60px",
  },

  actions: {
    display: "flex",
    justifyContent: "center",
    gap: 14,
    marginTop: 4,
  },

  primary: {
    minWidth: 160,
    padding: "10px 18px",
    borderRadius: 12,
    border: "1px solid rgba(0,0,0,0.2)",
    background: "#f4b24f",
    cursor: "pointer",
    fontWeight: 700,
  },

  secondary: {
    minWidth: 120,
    padding: "10px 18px",
    borderRadius: 12,
    border: "1px solid rgba(0,0,0,0.2)",
    background: "rgba(255,255,255,0.75)",
    cursor: "pointer",
    fontWeight: 700,
  },
    bottomSection: {
        marginTop: "auto",
    },
};