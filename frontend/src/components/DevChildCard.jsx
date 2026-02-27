import { styles } from "./devpanel.styles";
import { CopyPill } from "./devpanel.ui";

export default function DevChildCard({
  child,
  isSelected,
  isBusy,
  cachedCount,
  entriesLoading,
  onSelect,
  onToggleActive,
  onCopy,
}) {
  const c = child;

  return (
    <div style={{ position: "relative" }}>
      <button
        style={{
          ...styles.childItem,
          ...(isSelected ? styles.childItemActive : {}),
          ...(c.is_active ? {} : { opacity: 0.78 }),
          width: "100%",
        }}
        onClick={onSelect}
        title="Click to load entries"
        disabled={entriesLoading && isSelected}
      >
        <div style={styles.childName}>
          {c.name} {!c.is_active ? <span style={{ opacity: 0.6 }}>(deleted)</span> : null}
        </div>

        {typeof cachedCount === "number" ? (
          <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 4, color: "#245a52" }}>
            {cachedCount} entries (cached)
          </div>
        ) : null}

        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <div style={styles.childMeta}>id: {c.id}</div>
          <CopyPill value={c.id} title="Copy child id" onCopy={onCopy} />
        </div>

        <div style={styles.childMeta}>active: {String(c.is_active)}</div>

        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <div style={styles.childMeta}>parent_user_id: {c.parent_user_id}</div>
          <CopyPill value={c.parent_user_id} title="Copy parent_user_id" onCopy={onCopy} />
        </div>

        <div style={styles.childMeta}>created_at: {c.created_at || "-"}</div>
      </button>

      {c.is_active ? (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleActive(false);
          }}
          disabled={isBusy}
          style={{ ...styles.miniBtnDanger, opacity: isBusy ? 0.6 : 1 }}
          title="Soft delete child"
        >
          {isBusy ? "..." : "Delete"}
        </button>
      ) : (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleActive(true);
          }}
          disabled={isBusy}
          style={{ ...styles.miniBtn, opacity: isBusy ? 0.6 : 1 }}
          title="Restore child"
        >
          {isBusy ? "..." : "Restore"}
        </button>
      )}
    </div>
  );
}