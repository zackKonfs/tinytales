// no hooks needed here
import { formatEntryDateTime } from "./childJournal.utils";

const HIGHLIGHT = "#f4b24f";

export default function ChildJournalCard({
  entry,
  isActive,
  thumbUrl,
  styles,
  onOpenViewer,
  onEdit,
  onDelete,
}) {
  const title = (entry?.title ?? "").trim() || "Untitled";
  const titleInitial = title[0]?.toUpperCase() || "📷";
  const savedAtText = formatEntryDateTime(entry?.entry_date || entry?.created_at);

  return (
    <div
      style={{
        ...styles.card,
        ...(isActive ? styles.cardActive : {}),
        ...(isActive ? { borderColor: HIGHLIGHT } : {}),
      }}
      onClick={() => onOpenViewer(entry)}
      role="button"
      tabIndex={0}
      onKeyDown={(ev) => {
        if (ev.key === "Enter" || ev.key === " ") {
          ev.preventDefault();
          onOpenViewer(entry);
        }
      }}
      title="Click to read"
    >
      <div style={styles.cardTitleRow}>
        <div style={styles.cardTitle} title={title}>
          {title}
        </div>

        <div style={styles.cardTitleActions}>
          <button
            className="tt-btn"
            style={styles.iconBtn}
            title="Edit"
            onClick={async (ev) => {
              ev.stopPropagation();
              await onEdit(entry);
            }}
          >
            ✎
          </button>

          <button
            className="tt-btn"
            style={styles.iconBtn}
            title="Delete"
            onClick={(ev) => {
              ev.stopPropagation();
              onDelete(entry.id);
            }}
          >
            🗑
          </button>
        </div>
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
      </div>

      <div style={styles.cardDate}>{savedAtText}</div>
    </div>
  );
}