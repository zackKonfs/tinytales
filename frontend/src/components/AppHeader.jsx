import { useMemo } from "react";
import logo from "../assets/Logo.png";



/**
 * AppHeader
 * Props:
 * - rightActions: ReactNode (optional)
 * - onGoAbout, onGoContact, onGoParent, onLogout: () => void
 */
export default function AppHeader({ rightActions, onGoAbout, onGoContact, onGoParent, onLogout }) {
  const showParent = typeof onGoParent === "function";
  const showLogout = typeof onLogout === "function";

  const btnBase = useMemo(
    () => ({
      padding: "10px 14px",
      borderRadius: 14,
      border: "1px solid rgba(0,0,0,0.12)",
      background: "rgba(255,255,255,0.75)",
      cursor: "pointer",
      fontWeight: 800,
      color: "#245a52",
      transition: "transform 120ms ease, filter 120ms ease",
    }),
    []
  );

  const dangerBtn = useMemo(
    () => ({
      ...btnBase,
      color: "#a3402c",
    }),
    [btnBase]
  );

  return (
    <div style={ui.wrap}>
      <div style={ui.left}>
        <div style={ui.logo} title="TinyTales">
            <img
            src={logo}
            alt="TinyTales"
            style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: "-10% 46%",
            }}
            />
        </div>
        </div>

      <div style={ui.right}>
        <button className="tt-btn" style={btnBase} onClick={onGoAbout}>
          About
        </button>

        <button className="tt-btn" style={btnBase} onClick={onGoContact}>
          Contact
        </button>

        {showParent ? (
          <button className="tt-btn" style={btnBase} onClick={onGoParent}>
            Parent
          </button>
        ) : null}

        {showLogout ? (
          <button className="tt-btn" style={dangerBtn} onClick={onLogout}>
            Logout
          </button>
        ) : null}

        {rightActions || null}
      </div>
    </div>
  );
}

const ui = {
  wrap: {
    minHeight: 72,
    width: "calc(100vw - 24px)",
    maxWidth: "none",
    margin: "0 12px 16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    padding: "10px 18px",
    borderRadius: 18,
    border: "1px solid rgba(0,0,0,0.10)",
    background: "rgba(255,255,255,0.55)",
    boxShadow: "0 10px 26px rgba(0,0,0,0.08)",
    backdropFilter: "blur(6px)",
  },
  left: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    flex: "1 1 auto",
    justifyContent: "flex-start",
    minWidth: 0,
  },
logo: {
  height: 64,
  width: "clamp(220px, 24vw, 320px)",
  display: "flex",
  alignItems: "center",
  cursor: "default",
},

  right: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 10,
    flex: "1 1 auto",
    minWidth: 0,
  },
};
