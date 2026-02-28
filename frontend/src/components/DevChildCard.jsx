import { styles } from "./devpanel.styles";

function formatDateDdMmmYyyy(input) {
  if (!input) return "-";
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return "-";

  const day = String(d.getDate()).padStart(2, "0");
  const month = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][
    d.getMonth()
  ];
  const year = d.getFullYear();
  return `${day}${month}${year}`;
}

export default function DevChildCard({
  child,
  isSelected,
  isBusy,
  cachedCount,
  entriesLoading,
  age,
  onSelect,
  onToggleActive,
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

        <div style={styles.childMeta}>active: {String(c.is_active)}</div>
        <div style={styles.childMeta}>gender: {c.gender || "-"}</div>
        <div style={styles.childMeta}>age: {age ?? "-"}</div>

        <div style={styles.childMeta}>account created date - {formatDateDdMmmYyyy(c.created_at)}</div>
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
