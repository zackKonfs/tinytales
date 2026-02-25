import { useState } from "react";

export default function CreateChildModal({ onClose, onCreate }) {
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    onCreate?.({ name, date_of_birth: dob, gender });
  }

  return (
    <div style={styles.backdrop}>
      <div style={styles.modal}>
        <button style={styles.closeBtn} onClick={onClose} aria-label="Close">
          ×
        </button>

        <h2 style={styles.title}>Create Child</h2>
        <p style={styles.subtitle}>Add a new child to your account.</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label}>Child&apos;s Name</label>
          <input
            style={styles.input}
            placeholder="Enter name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <label style={styles.label}>Date of Birth</label>
          <input
            style={styles.input}
            type="date"
            value={dob}
            onChange={(e) => setDob(e.target.value)}
          />

          <label style={styles.label}>Gender</label>
          <select
            style={styles.input}
            value={gender}
            onChange={(e) => setGender(e.target.value)}
          >
            <option value="">Select gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>

          <button type="submit" style={styles.createBtn}>
            Create
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  backdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.35)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
  },
  modal: {
    width: "min(900px, 92vw)",
    background: "rgba(255,255,255,0.92)",
    borderRadius: 18,
    padding: "26px 26px 22px",
    boxShadow: "0 14px 50px rgba(0,0,0,0.22)",
    position: "relative",
  },
  closeBtn: {
    position: "absolute",
    top: 12,
    right: 14,
    border: "none",
    background: "transparent",
    fontSize: 24,
    cursor: "pointer",
    opacity: 0.75,
  },
  title: { margin: 0, fontSize: 40, letterSpacing: 0.2 },
  subtitle: { marginTop: 8, marginBottom: 18, opacity: 0.75 },

  form: { display: "grid", gap: 12 },
  label: { fontSize: 14, opacity: 0.75 },
  input: {
    height: 48,
    borderRadius: 12,
    border: "1px solid rgba(0,0,0,0.15)",
    padding: "0 14px",
    fontSize: 16,
    outline: "none",
    background: "white",
  },
  createBtn: {
    marginTop: 10,
    height: 56,
    borderRadius: 14,
    border: "1px solid rgba(0,0,0,0.12)",
    background: "#f0a64a",
    color: "#fff",
    fontWeight: 800,
    fontSize: 20,
    cursor: "pointer",
    boxShadow: "0 10px 26px rgba(0,0,0,0.18)",
  },
};