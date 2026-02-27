import { useMemo, useState } from "react";

/**
 * YearPickerModal
 *
 * Props:
 * - isOpen: boolean
 * - initialYear: number
 * - onClose: () => void
 * - onPickMonth: (year: number, monthIndex: number) => void  // monthIndex 0-11
 */
export default function YearPickerModal({ isOpen, initialYear, onClose, onPickMonth }) {
  if (!isOpen) return null;

  // Force a fresh mount each time it opens (so state resets) WITHOUT useEffect setState.
  const mountKey = `open-${initialYear || new Date().getFullYear()}`;

  return <YearPickerInner key={mountKey} initialYear={initialYear} onClose={onClose} onPickMonth={onPickMonth} />;
}

function YearPickerInner({ initialYear, onClose, onPickMonth }) {
  const [year, setYear] = useState(initialYear || new Date().getFullYear());

  const months = useMemo(
    () => [
      { label: "Jan", idx: 0 },
      { label: "Feb", idx: 1 },
      { label: "Mar", idx: 2 },
      { label: "Apr", idx: 3 },
      { label: "May", idx: 4 },
      { label: "Jun", idx: 5 },
      { label: "Jul", idx: 6 },
      { label: "Aug", idx: 7 },
      { label: "Sep", idx: 8 },
      { label: "Oct", idx: 9 },
      { label: "Nov", idx: 10 },
      { label: "Dec", idx: 11 },
    ],
    []
  );

  return (
    <div style={ui.backdrop} onClick={() => onClose?.()} role="dialog" aria-modal="true" aria-label="Pick year and month">
      <div style={ui.modal} onClick={(e) => e.stopPropagation()}>
        <div style={ui.header}>
          <button style={ui.navBtn} onClick={() => setYear((y) => y - 1)} aria-label="Previous year">
            ‹
          </button>

          <div style={ui.yearLabel}>{year}</div>

          <button style={ui.navBtn} onClick={() => setYear((y) => y + 1)} aria-label="Next year">
            ›
          </button>
        </div>

        <div style={ui.grid}>
          {months.map((m) => (
            <button
              key={m.idx}
              style={ui.monthBtn}
              onClick={() => {
                onPickMonth?.(year, m.idx);
                onClose?.();
              }}
              title={`${m.label} ${year}`}
            >
              {m.label}
            </button>
          ))}
        </div>

        <div style={ui.footer}>
          <button style={ui.closeBtn} onClick={() => onClose?.()}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

const ui = {
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
    width: "min(520px, 92vw)",
    background: "rgba(255,255,255,0.92)",
    borderRadius: 18,
    border: "1px solid rgba(0,0,0,0.12)",
    boxShadow: "0 18px 46px rgba(0,0,0,0.22)",
    padding: 16,
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 14,
  },
  navBtn: {
    width: 42,
    height: 42,
    borderRadius: 999,
    border: "1px solid rgba(0,0,0,0.12)",
    background: "rgba(255,255,255,0.85)",
    cursor: "pointer",
    fontSize: 20,
    fontWeight: 900,
  },
  yearLabel: {
    fontSize: 22,
    fontWeight: 900,
    color: "#245a52",
    letterSpacing: 0.2,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: 10,
    padding: "6px 2px 2px",
  },
  monthBtn: {
    padding: "14px 10px",
    borderRadius: 14,
    border: "1px solid rgba(0,0,0,0.12)",
    background: "rgba(255,255,255,0.85)",
    cursor: "pointer",
    fontWeight: 900,
    color: "#3b2a1d",
    boxShadow: "0 8px 18px rgba(0,0,0,0.08)",
  },
  footer: {
    marginTop: 14,
    display: "flex",
    justifyContent: "center",
  },
  closeBtn: {
    padding: "10px 16px",
    borderRadius: 12,
    border: "1px solid rgba(0,0,0,0.12)",
    background: "rgba(255,255,255,0.85)",
    cursor: "pointer",
    fontWeight: 900,
  },
};