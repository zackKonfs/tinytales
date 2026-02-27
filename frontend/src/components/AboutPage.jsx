import EnterPageDecor from "./EnterPageDecor";

export default function AboutPage({ onGoParent }) {
  return (
    <div style={ui.page}>
      <div style={ui.decorWrap}>
        <EnterPageDecor variant="about" />
      </div>

      <div style={ui.card}>
        <h1 style={ui.h1}>About TinyTales</h1>

        <p style={ui.p}>
          TinyTales is a simple parent-child journal where you can save short stories,
          memories, and photos — and revisit them anytime.
        </p>

        <p style={ui.p}>
          Built to feel warm, light, and easy to use.
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