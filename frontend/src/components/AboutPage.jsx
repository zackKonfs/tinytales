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
          TinyTales is a warm parent-child journaling space designed for families
          with young children, from ages 1 to 10. It helps parents capture everyday
          moments while they are still fresh: first words, funny stories, small wins,
          family outings, and the emotions behind each day.
        </p>

        <p style={ui.p}>
          More than saving photos and notes, TinyTales encourages children to grow
          into reflection and self-expression. Parents can guide them to describe
          what happened, how they felt, and what they learned, turning simple entries
          into meaningful memory-building habits over time.
        </p>

        <p style={ui.p}>
          Over the years, TinyTales becomes a family keepsake you can return to 20
          or 30 years later. Parents and children can look back together, relive
          milestones, and reconnect with the feelings, love, and stories that shaped
          their journey.
        </p>

        <p style={ui.p}>
          Built to feel warm, light, and easy to use, so recording each memory stays
          simple and natural.
        </p>

        {onGoParent && (
          <button style={ui.parentBtn} onClick={onGoParent}>
            {"<-"} Back to Parent
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
    overflow: "hidden",
  },
  card: {
    width: "min(820px, 92vw)",
    margin: "-20px auto 0",
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
