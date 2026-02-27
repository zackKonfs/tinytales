import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../api/client";
import { clearSession } from "../auth/session";
import { loadSession } from "../auth/session";

export default function DevPanel({ username }) {
  const navigate = useNavigate();
  const sessionEmail = loadSession()?.user?.email || "";
  const effectiveEmail = username || sessionEmail;
  const isAllowed = effectiveEmail === "zack.xu@hotmail.com";

  const [health, setHealth] = useState(null);
  const [me, setMe] = useState(null);

  const [children, setChildren] = useState([]);
  const [childrenLoading, setChildrenLoading] = useState(false);
  const [childrenErr, setChildrenErr] = useState("");

  const [selectedChild, setSelectedChild] = useState(null);

  const [entries, setEntries] = useState([]);
  const [entriesLoading, setEntriesLoading] = useState(false);
  const [entriesErr, setEntriesErr] = useState("");

  // --- guard ---
  useEffect(() => {
    if (!isAllowed) return;

    apiFetch("/api/health")
      .then((r) => r.json())
      .then(setHealth)
      .catch((e) => setHealth({ ok: false, message: String(e) }));
  }, [isAllowed]);

  // Load /api/me (system info)
  async function testMe() {
    try {
      const res = await apiFetch("/api/me");
      const json = await res.json().catch(() => ({}));
      setMe({ status: res.status, ...json });
    } catch (e) {
      setMe({ status: 0, ok: false, message: String(e) });
    }
  }

  // Load children (admin read for now; uses your existing GET /api/children)
  async function loadChildren() {
    setChildrenErr("");
    setChildrenLoading(true);
    try {
      const res = await apiFetch("/api/dev/children?include_inactive=1");
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setChildren([]);
        setChildrenErr(json.error || json.message || `Failed (${res.status})`);
        return;
      }
      setChildren(json.children ?? []);
    } catch (e) {
      setChildren([]);
      setChildrenErr(String(e));
    } finally {
      setChildrenLoading(false);
    }
  }

  useEffect(() => {
    if (!isAllowed) return;
    loadChildren();
  }, [isAllowed]);

  // Load entries for child (uses your existing GET /api/children/:id/entries)
  async function loadEntriesForChild(child) {
    if (!child?.id) return;

    setEntriesErr("");
    setEntriesLoading(true);
    setEntries([]);
    try {
      const res = await apiFetch(`/api/children/${child.id}/entries`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setEntries([]);
        setEntriesErr(json.error || json.message || `Failed (${res.status})`);
        return;
      }
      setEntries(json.entries ?? []);
    } catch (e) {
      setEntries([]);
      setEntriesErr(String(e));
    } finally {
      setEntriesLoading(false);
    }
  }

  function onBackToParent() {
    navigate("/");
  }

  function onLogout() {
    clearSession();
    navigate("/");
    // Main will boot back to entry since session cleared
    window.location.reload();
  }

  const selectedChildTitle = useMemo(() => {
    if (!selectedChild) return "No child selected";
    return `${selectedChild.name} (id: ${selectedChild.id})`;
  }, [selectedChild]);

  if (!isAllowed) {
    return (
      <div style={{ padding: 24 }}>
        <h2>Forbidden</h2>
        <div style={{ opacity: 0.7 }}>You do not have access to this page.</div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        {/* Header */}
        <header style={styles.header}>
          <div>
            <h1 style={styles.title}>Dev Panel</h1>
            <div style={styles.subTitle}>{username}</div>
          </div>

          <div style={styles.actions}>
            <button style={styles.backBtn} onClick={onBackToParent}>
              ← Back to Parent
            </button>
            <button style={styles.logoutBtn} onClick={onLogout}>
              Logout
            </button>
          </div>
        </header>

        {/* Panel */}
        <div style={styles.panel}>
          {/* System */}
          <Section title="System">
            <Row label="Backend health">
              <pre style={styles.pre}>
                {health ? JSON.stringify(health, null, 2) : "Loading..."}
              </pre>
            </Row>

            <Row label="/api/me">
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <button style={styles.primaryBtn} onClick={testMe}>
                  Test /api/me
                </button>
                {me?.status ? (
                  <span style={{ fontSize: 12, opacity: 0.7 }}>
                    status: {me.status}
                  </span>
                ) : null}
              </div>

              <pre style={styles.pre}>
                {me ? JSON.stringify(me, null, 2) : "Not tested yet"}
              </pre>
            </Row>
          </Section>

          {/* Children */}
          <Section
            title="Children"
            right={
              <button style={styles.secondaryBtn} onClick={loadChildren}>
                Refresh
              </button>
            }
          >
            {childrenLoading ? (
              <div style={styles.note}>Loading children...</div>
            ) : childrenErr ? (
              <div style={styles.error}>{childrenErr}</div>
            ) : children.length === 0 ? (
              <div style={styles.note}>No children found.</div>
            ) : (
              <div style={styles.childGrid}>
                {children.map((c) => (
                  <button
                    key={c.id}
                    style={{
                      ...styles.childItem,
                      ...(selectedChild?.id === c.id ? styles.childItemActive : {}),
                    }}
                    onClick={() => {
                      setSelectedChild(c);
                      loadEntriesForChild(c);
                    }}
                    title="Click to load entries"
                  >
                    <div style={styles.childName}>{c.name}</div>
                    <div style={styles.childMeta}>id: {c.id}</div>
                    <div style={styles.childMeta}>active: {String(c.is_active)}</div>
                    <div style={styles.childMeta}>parent_user_id: {c.parent_user_id}</div>
                  </button>
                ))}
              </div>
            )}
          </Section>

          {/* Entries */}
          <Section title="Entries" subTitle={selectedChildTitle}>
            {!selectedChild ? (
              <div style={styles.note}>Select a child above to load entries.</div>
            ) : entriesLoading ? (
              <div style={styles.note}>Loading entries...</div>
            ) : entriesErr ? (
              <div style={styles.error}>{entriesErr}</div>
            ) : entries.length === 0 ? (
              <div style={styles.note}>No entries found for this child.</div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>id</th>
                      <th style={styles.th}>entry_date</th>
                      <th style={styles.th}>is_active</th>
                      <th style={styles.th}>photo_paths</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((e) => (
                      <tr key={e.id}>
                        <td style={styles.td}>{e.id}</td>
                        <td style={styles.td}>{e.entry_date}</td>
                        <td style={styles.td}>{String(e.is_active)}</td>
                        <td style={styles.td}>
                          <pre style={styles.preInline}>
                            {JSON.stringify(e.photo_paths ?? [], null, 2)}
                          </pre>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}

/* --- tiny UI helpers --- */
function Section({ title, subTitle, right, children }) {
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

function Row({ label, children }) {
  return (
    <div style={{ marginTop: 12 }}>
      <div style={styles.label}>{label}</div>
      <div>{children}</div>
    </div>
  );
}

/* --- styles (match Parent vibe) --- */
const styles = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(#dfeef4, #ffe7bf)",
    padding: "28px 22px",
  },
  container: {
    width: "min(1100px, 92vw)",
    margin: "0 auto",
  },
  header: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
    marginBottom: 16,
  },
  title: {
    margin: 0,
    fontSize: 44,
    color: "#245a52",
    letterSpacing: 0.2,
  },
  subTitle: {
    marginTop: 8,
    fontSize: 14,
    opacity: 0.75,
  },
  actions: {
    display: "flex",
    gap: 12,
    alignItems: "center",
    marginTop: 8,
  },
  backBtn: {
    padding: "12px 18px",
    borderRadius: 14,
    border: "1px solid rgba(0,0,0,0.12)",
    background: "#ffffff",
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 8px 18px rgba(0,0,0,0.10)",
  },
  logoutBtn: {
    padding: "12px 18px",
    borderRadius: 14,
    border: "1px solid rgba(0,0,0,0.12)",
    background: "#f6efe7",
    color: "#a3402c",
    fontWeight: 800,
    cursor: "pointer",
    boxShadow: "0 8px 18px rgba(0,0,0,0.10)",
  },
  panel: {
    background: "rgba(255,255,255,0.55)",
    borderRadius: 22,
    padding: 18,
    boxShadow: "0 14px 40px rgba(0,0,0,0.14)",
    backdropFilter: "blur(6px)",
  },
  section: {
    background: "rgba(255,255,255,0.72)",
    borderRadius: 18,
    padding: 16,
    boxShadow: "0 10px 26px rgba(0,0,0,0.10)",
    border: "1px solid rgba(0,0,0,0.06)",
    marginBottom: 14,
  },
  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 900,
    color: "#245a52",
  },
  sectionSub: {
    marginTop: 4,
    fontSize: 12,
    opacity: 0.75,
  },
  label: {
    fontSize: 12,
    fontWeight: 800,
    opacity: 0.75,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  pre: {
    margin: 0,
    padding: 12,
    borderRadius: 12,
    background: "rgba(255,255,255,0.85)",
    border: "1px solid rgba(0,0,0,0.08)",
    overflowX: "auto",
    fontSize: 12,
  },
  preInline: {
    margin: 0,
    fontSize: 12,
    whiteSpace: "pre-wrap",
  },
  note: {
    padding: "10px 0",
    opacity: 0.75,
  },
  error: {
    padding: "10px 0",
    color: "crimson",
    fontWeight: 700,
  },
  primaryBtn: {
    padding: "10px 14px",
    borderRadius: 12,
    border: "1px solid rgba(0,0,0,0.12)",
    background: "#245a52",
    color: "white",
    fontWeight: 800,
    cursor: "pointer",
  },
  secondaryBtn: {
    padding: "10px 14px",
    borderRadius: 12,
    border: "1px solid rgba(0,0,0,0.12)",
    background: "#ffffff",
    fontWeight: 800,
    cursor: "pointer",
  },
  childGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 12,
    marginTop: 10,
  },
  childItem: {
    textAlign: "left",
    borderRadius: 16,
    padding: 12,
    border: "1px solid rgba(0,0,0,0.08)",
    background: "rgba(255,255,255,0.85)",
    cursor: "pointer",
    boxShadow: "0 8px 18px rgba(0,0,0,0.08)",
  },
  childItemActive: {
    outline: "3px solid rgba(36, 90, 82, 0.25)",
  },
  childName: {
    fontSize: 16,
    fontWeight: 900,
    color: "#333",
    marginBottom: 6,
  },
  childMeta: {
    fontSize: 12,
    opacity: 0.75,
    lineHeight: 1.35,
  },
  table: {
    width: "100%",
    borderCollapse: "separate",
    borderSpacing: 0,
    borderRadius: 14,
    overflow: "hidden",
    border: "1px solid rgba(0,0,0,0.08)",
    background: "rgba(255,255,255,0.85)",
  },
  th: {
    textAlign: "left",
    padding: "10px 10px",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    opacity: 0.75,
    borderBottom: "1px solid rgba(0,0,0,0.06)",
  },
  td: {
    padding: "10px 10px",
    fontSize: 13,
    borderBottom: "1px solid rgba(0,0,0,0.06)",
    verticalAlign: "top",
  },
};