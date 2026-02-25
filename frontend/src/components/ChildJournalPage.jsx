import { useMemo, useState } from "react";
import notebookImg from "../assets/notebook.png";

export default function ChildJournalPage({ child }) {

    const [showNewEntry, setShowNewEntry] = useState(false);

  const entries = useMemo(
    () => [
      { id: 1, dateLabel: "2nd December 2025", title: "Park day" },
      { id: 2, dateLabel: "5th December 2025", title: "Drawing" },
      { id: 3, dateLabel: "7th Dec 2025", title: "Bedtime story" },
      { id: 4, dateLabel: "8th December 2025", title: "Playground" },
      { id: 5, dateLabel: "9th December 2025", title: "Family dinner" },
    ],
    []
  );

  const months = useMemo(
    () => ["January 2026", "February 2026", "March 2026", "April 2026"],
    []
  );

  const [activeMonth, setActiveMonth] = useState(months[0]);

  const todayText = "Today is 30th January 2026, Friday";

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <h1 style={styles.title}>{(child?.name ?? "Zack")}'s Tales</h1>

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
            {entries.map((e) => (
              <div key={e.id} style={styles.card}>
                <div style={styles.thumb}>
                  {/* placeholder image area */}
                  <div style={styles.thumbPlaceholder} />
                  {/* edit + bin (UI only for now) */}
                  <div style={styles.cardActions}>
                    <button style={styles.iconBtn} title="Edit">
                      ✎
                    </button>
                    <button style={styles.iconBtn} title="Delete">
                      🗑
                    </button>
                  </div>
                </div>

                <div style={styles.cardDate}>{e.dateLabel}</div>
              </div>
            ))}
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
                    <input style={modalStyles.input} placeholder="Write a short title..." />
                    </div>

                    <div style={{...modalStyles.field, flex: 1}}>
                    <div style={modalStyles.label}>Content</div>
                    <textarea style={modalStyles.textarea} placeholder="Write about today's tale..." />
                    </div>

                    <div style={modalStyles.bottomSection}>
                        <div style={modalStyles.photoRow}>
                        <button style={modalStyles.photoBox}>+</button>
                        <button style={modalStyles.photoBox}>+</button>
                        <button style={modalStyles.photoBox}>+</button>
                        </div>

                        <div style={modalStyles.actions}>
                        <button style={modalStyles.primary}>Record Entry</button>
                        <button style={modalStyles.secondary} onClick={() => setShowNewEntry(false)}>
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
    width: "min(560px, 92vw)",   // control popup size here
  },

  notebook: {
    width: "100%",
    aspectRatio: "2 / 3",
    backgroundImage: `url(${notebookImg})`,
    backgroundSize: "contain",
    backgroundRepeat: "no-repeat",
    backgroundPosition: "center",
    position: "relative",

    // IMPORTANT: these paddings align content inside the notebook
    paddingTop: 58,
    paddingRight: 54,
    paddingBottom: 90,
    paddingLeft: 92, // bigger because left side has rings

    display: "flex",
    flexDirection: "column",
    height: "100%",
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

  textarea: {
    width: "100%",
    height: 440,
    borderRadius: 8,
    border: "1px solid rgba(0,0,0,0.18)",
    padding: "10px 10px",
    background: "rgba(255,255,255,0.55)",
    fontSize: 14,
    resize: "none",
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