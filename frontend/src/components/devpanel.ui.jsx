import { styles } from "./devpanel.styles";

export function Section({ title, subTitle, right, children }) {
  return (
    <div style={styles.section}>
      <div style={styles.sectionHeader}>
        <div>
          <div style={styles.sectionTitle}>{title}</div>
          {subTitle ? <div style={styles.sectionSub}>{subTitle}</div> : null}
        </div>
        {right ? <div>{right}</div> : null}
      </div>
      <div>{children}</div>
    </div>
  );
}

export function Row({ label, children }) {
  return (
    <div style={{ marginTop: 12 }}>
      <div style={styles.label}>{label}</div>
      <div>{children}</div>
    </div>
  );
}

export function CopyPill({ value, title = "Copy", onCopy }) {
  return (
    <span
      role="button"
      tabIndex={0}
      style={styles.copyLink}
      title={title}
      onClick={(e) => {
        e.stopPropagation();
        onCopy?.(value);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          e.stopPropagation();
          onCopy?.(value);
        }
      }}
    >
      copy
    </span>
  );
}