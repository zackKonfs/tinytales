import EnterPageDecor from "./EnterPageDecor";

export default function ContactPage({ onGoParent }) {
  return (
    <div style={ui.page}>
      <div style={ui.decorWrap}>
        <EnterPageDecor variant="contact" />
      </div>

      <div style={ui.card}>
        <h1 style={ui.h1}>Contact</h1>

        <p style={ui.p}>For now, you can reach us at:</p>

        <div style={ui.box}>
          <div style={ui.row}>
            <span style={ui.label}>Email</span> hello@tinytales.app
          </div>
          <div style={ui.row}>
            <span style={ui.label}>Instagram</span> @tinytales
          </div>
        </div>

        <p style={ui.pSmall}>
          (Replace with real details later.)
        </p>

        {onGoParent && (
          <button
            style={ui.parentBtn}
            onClick={onGoParent}
          >
            ← Back to Parent
          </button>
        )}
      </div>
    </div>
  );
}

const ui = {
  page: {
    minHeight: "calc(100vh - 40px)",
    position: "relative",
    padding: "20px 16px 40px",
  },
  decorWrap: {
    position: "relative",
    height: 360,
    maxWidth: 960,
    margin: "0 auto",
  },
  card: {
    width: "min(820px, 92vw)",
    margin: "18px auto 0",
    borderRadius: 22,
    background: "rgba(255,255,255,0.70)",
    border: "1px solid rgba(0,0,0,0.12)",
    boxShadow: "0 14px 40px rgba(0,0,0,0.12)",
    padding: "18px 18px 16px",
  },
  h1: { margin: 0, fontSize: 34, color: "#245a52" },
  p: { marginTop: 10, marginBottom: 0, opacity: 0.85, lineHeight: 1.6 },
  pSmall: { marginTop: 10, marginBottom: 0, opacity: 0.65, fontSize: 13 },
  box: {
    marginTop: 12,
    borderRadius: 16,
    background: "rgba(255,255,255,0.75)",
    border: "1px solid rgba(0,0,0,0.10)",
    padding: 12,
  },
  row: { display: "flex", gap: 10, padding: "6px 0" },
  label: { width: 90, fontWeight: 900, color: "#245a52" },
  parentBtn: {
    marginTop: 20,
    padding: "10px 14px",
    borderRadius: 14,
    border: "1px solid rgba(0,0,0,0.12)",
    background: "rgba(255,255,255,0.75)",
    cursor: "pointer",
    fontWeight: 800,
    color: "#245a52",
  },
};