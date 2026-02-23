export default function AccountPickerModal({
  open,
  parentName = "Zack",
  childrenNames = ["Kayden", "Child 2"],
  onSelectParent,
  onSelectChild,
  onClose,
}) {
  if (!open) return null;

  return (
    <div style={styles.backdrop}>
      <div style={styles.modal}>
        <button style={styles.closeBtn} onClick={onClose} aria-label="Close">
          ×
        </button>

        <h2 style={styles.title}>Choose account</h2>

        <div style={styles.section}>
          <div style={styles.label}>Parent</div>
          <button style={styles.primaryBtn} onClick={onSelectParent}>
            {parentName}
          </button>
        </div>

        {/* <div style={styles.section}>
          <div style={styles.label}>Children</div>
          <div style={styles.list}>
            {childrenNames.map((name) => (
              <button
                key={name}
                style={styles.childBtn}
                onClick={() => onSelectChild(name)}
              >
                {name}
              </button>
            ))}
          </div>
        </div> */}

        <div style={styles.section}>
        <div style={styles.label}>Children</div>

        {childrenNames.length === 0 ? (
            <div style={styles.emptyText}>No children account yet!</div>
        ) : (
            <div style={styles.list}>
            {childrenNames.map((name) => (
                <button
                key={name}
                style={styles.childBtn}
                onClick={() => onSelectChild(name)}
                >
                {name}
                </button>
            ))}
            </div>
        )}
        </div>

      </div>
    </div>
  );
}

const styles = {
  backdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.45)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
  },
  modal: {
    width: "min(520px, 92vw)",
    background: "rgba(255,255,255,0.92)",
    borderRadius: 16,
    padding: "22px 22px 18px",
    boxShadow: "0 10px 40px rgba(0,0,0,0.25)",
    position: "relative",
  },
  closeBtn: {
    position: "absolute",
    top: 10,
    right: 12,
    border: "none",
    background: "transparent",
    fontSize: 24,
    cursor: "pointer",
    opacity: 0.7,
  },
  title: { margin: 0, fontSize: 22 },
  section: { marginTop: 18 },
  label: { fontSize: 12, opacity: 0.7, marginBottom: 8 },
  primaryBtn: {
    width: "100%",
    padding: "14px 16px",
    borderRadius: 12,
    border: "1px solid rgba(0,0,0,0.12)",
    fontSize: 16,
    fontWeight: 700,
    cursor: "pointer",
  },
  list: { display: "grid", gap: 10 },
  childBtn: {
    width: "100%",
    padding: "12px 16px",
    borderRadius: 12,
    border: "1px solid rgba(0,0,0,0.12)",
    fontSize: 15,
    cursor: "pointer",
    background: "white",
  },
  emptyText: {
    padding: "12px 4px",
    fontSize: 14,
    opacity: 0.7,
    },
};

