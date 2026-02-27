import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../api/client";
import { clearSession, loadSession } from "../auth/session";

export default function DevPanel({ username }) {
  const navigate = useNavigate();

  /* =========================
     Auth guard (superadmin)
  ========================= */
  const sessionEmail = loadSession()?.user?.email || "";
  const effectiveEmail = username || sessionEmail;
  const isAllowed = effectiveEmail === "zack.xu@hotmail.com";

  /* =========================
     State
  ========================= */
  // system
  const [health, setHealth] = useState(null);
  const [me, setMe] = useState(null);

  // last API error
  const [lastApiError, setLastApiError] = useState(null); // { at, endpoint, status, message }

  // parents
  const [parents, setParents] = useState([]);
  const [parentsLoading, setParentsLoading] = useState(false);
  const [parentsErr, setParentsErr] = useState("");
  const [selectedParentId, setSelectedParentId] = useState(""); // "" = all
  const [parentQuery, setParentQuery] = useState("");
  const [onlyParentsWithKids, setOnlyParentsWithKids] = useState(true);

  // children
  const [children, setChildren] = useState([]);
  const [childrenLoading, setChildrenLoading] = useState(false);
  const [childrenErr, setChildrenErr] = useState("");

  // children filter + sort
  const [childFilter, setChildFilter] = useState("active"); // active | deleted | both
  const [childSort, setChildSort] = useState("created_desc"); // created_desc | created_asc | name_az

  // entries
  const [selectedChild, setSelectedChild] = useState(null);
  const [entries, setEntries] = useState([]);
  const [entriesCache, setEntriesCache] = useState({});
  const [entriesLoading, setEntriesLoading] = useState(false);
  const [entriesErr, setEntriesErr] = useState("");

  // child action loading
  const [childActionLoadingId, setChildActionLoadingId] = useState(null);

  /* =========================
     Helpers (stable)
  ========================= */
  const setApiError = useCallback((endpoint, status, message) => {
    setLastApiError({
      at: new Date().toISOString(),
      endpoint,
      status,
      message,
    });
  }, []);

  const safeJson = useCallback(async (res) => {
    return res.json().catch(() => ({}));
  }, []);

  const copyText = useCallback((text) => {
    const val = String(text ?? "");
    if (!val) return;

    // modern
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(val).catch(() => {});
      return;
    }

    // fallback
    try {
      const ta = document.createElement("textarea");
      ta.value = val;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    } catch {
      // ignore
    }
  }, []);

  /* =========================
     Derived
  ========================= */
  const kidsCountByParentId = useMemo(() => {
    const map = {};
    for (const c of children) {
      const pid = c.parent_user_id || "";
      map[pid] = (map[pid] || 0) + 1;
    }
    return map;
  }, [children]);

  const selectedChildTitle = useMemo(() => {
    if (!selectedChild) return "No child selected";
    return `${selectedChild.name} (id: ${selectedChild.id})`;
  }, [selectedChild]);

  const selectedParentLabel = useMemo(() => {
    if (!selectedParentId) return "All Parents";
    const p = parents.find((x) => x.id === selectedParentId);
    return p?.username || p?.email || selectedParentId;
  }, [selectedParentId, parents]);

  const visibleChildren = useMemo(() => {
    if (!selectedParentId) return children;
    return children.filter((c) => c.parent_user_id === selectedParentId);
  }, [children, selectedParentId]);

  const activeChildren = useMemo(() => visibleChildren.filter((c) => c.is_active), [visibleChildren]);
  const inactiveChildren = useMemo(() => visibleChildren.filter((c) => !c.is_active), [visibleChildren]);

  const shownChildren = useMemo(() => {
    let list = visibleChildren;

    if (childFilter === "active") list = list.filter((c) => c.is_active);
    if (childFilter === "deleted") list = list.filter((c) => !c.is_active);

    list = [...list];

    if (childSort === "created_desc") {
      list.sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")));
    } else if (childSort === "created_asc") {
      list.sort((a, b) => String(a.created_at || "").localeCompare(String(b.created_at || "")));
    } else if (childSort === "name_az") {
      list.sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
    }

    return list;
  }, [visibleChildren, childFilter, childSort]);

  const filteredParents = useMemo(() => {
    const q = parentQuery.trim().toLowerCase();

    const base = !q
      ? parents
      : parents.filter((p) => {
          const label = (p.username || p.email || "").toLowerCase();
          const id = String(p.id || "").toLowerCase();
          return label.includes(q) || id.includes(q);
        });

    if (!onlyParentsWithKids) return base;
    return base.filter((p) => (kidsCountByParentId[p.id] || 0) > 0);
  }, [parents, parentQuery, onlyParentsWithKids, kidsCountByParentId]);

  const visibleStats = useMemo(() => {
    return {
      active: activeChildren.length,
      deleted: inactiveChildren.length,
      total: visibleChildren.length,
    };
  }, [activeChildren.length, inactiveChildren.length, visibleChildren.length]);

  const parentsStats = useMemo(() => {
    return { loaded: parents.length, shown: filteredParents.length };
  }, [parents.length, filteredParents.length]);

  /* =========================
     Effects
  ========================= */
  useEffect(() => {
    if (!isAllowed) return;

    apiFetch("/api/health")
      .then((r) => r.json())
      .then(setHealth)
      .catch((e) => setHealth({ ok: false, message: String(e) }));
  }, [isAllowed]);

  useEffect(() => {
    if (!isAllowed) return;
    loadParents();
    loadChildren();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAllowed]);

  useEffect(() => {
    if (!selectedParentId) return;
    const exists = parents.some((p) => p.id === selectedParentId);
    if (!exists) setSelectedParentId("");
  }, [parents, selectedParentId]);

  /* =========================
     Actions
  ========================= */
  async function testMe() {
    const endpoint = "/api/me";
    try {
      const res = await apiFetch(endpoint);
      const json = await safeJson(res);
      setMe({ status: res.status, ...json });
      if (!res.ok) setApiError(endpoint, res.status, json.error || json.message || "Failed");
    } catch (e) {
      setMe({ status: 0, ok: false, message: String(e) });
      setApiError(endpoint, 0, String(e));
    }
  }

  async function loadParents() {
    const endpoint = "/api/dev/parents";
    setParentsErr("");
    setParentsLoading(true);
    try {
      const res = await apiFetch(endpoint);
      const json = await safeJson(res);

      if (!res.ok) {
        setParents([]);
        const msg = json.error || json.message || `Failed (${res.status})`;
        setParentsErr(msg);
        setApiError(endpoint, res.status, msg);
        return;
      }

      setParents(json.parents ?? []);
    } catch (e) {
      setParents([]);
      const msg = String(e);
      setParentsErr(msg);
      setApiError(endpoint, 0, msg);
    } finally {
      setParentsLoading(false);
    }
  }

  async function loadChildren() {
    const endpoint = "/api/dev/children?include_inactive=1";
    setChildrenErr("");
    setChildrenLoading(true);
    try {
      const res = await apiFetch(endpoint);
      const json = await safeJson(res);

      if (!res.ok) {
        setChildren([]);
        const msg = json.error || json.message || `Failed (${res.status})`;
        setChildrenErr(msg);
        setApiError(endpoint, res.status, msg);
        return;
      }

      setChildren(json.children ?? []);
    } catch (e) {
      setChildren([]);
      const msg = String(e);
      setChildrenErr(msg);
      setApiError(endpoint, 0, msg);
    } finally {
      setChildrenLoading(false);
    }
  }

  function resetSelection() {
    setSelectedChild(null);
    setEntries([]);
    setEntriesErr("");
    setEntriesLoading(false);
  }

  function selectParent(parentId) {
    setSelectedParentId(parentId);
    resetSelection();
  }

  function clearSelection() {
    resetSelection();
  }

  function clearEntriesCache() {
    setEntriesCache({});
  }

  async function loadEntriesForChild(child) {
    if (!child?.id) return;

    setSelectedParentId(child.parent_user_id || "");
    setEntriesErr("");
    setSelectedChild(child);

    if (entriesCache[child.id]) {
      setEntries(entriesCache[child.id]);
      return;
    }

    const endpoint = `/api/dev/children/${child.id}/entries`;
    setEntriesLoading(true);
    setEntries([]);

    try {
      const res = await apiFetch(endpoint);
      const json = await safeJson(res);

      if (!res.ok) {
        setEntries([]);
        const msg = json.error || json.message || `Failed (${res.status})`;
        setEntriesErr(msg);
        setApiError(endpoint, res.status, msg);
        return;
      }

      const loaded = json.entries ?? [];
      setEntriesCache((prev) => ({ ...prev, [child.id]: loaded }));
      setEntries(loaded);
    } catch (e) {
      setEntries([]);
      const msg = String(e);
      setEntriesErr(msg);
      setApiError(endpoint, 0, msg);
    } finally {
      setEntriesLoading(false);
    }
  }

  async function setChildActive(childId, nextActive) {
    if (!childId) return;

    const verb = nextActive ? "restore" : "delete";
    if (!window.confirm(`Confirm to ${verb} this child account?`)) return;

    const endpoint = `/api/dev/children/${childId}`;
    setChildActionLoadingId(childId);
    setChildrenErr("");

    try {
      const res = await apiFetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: nextActive }),
      });
      const json = await safeJson(res);

      if (!res.ok) {
        const msg = json.error || json.message || `Failed (${res.status})`;
        setChildrenErr(msg);
        setApiError(endpoint, res.status, msg);
        return;
      }

      const updated = json.child;
      if (updated?.id) {
        setChildren((prev) => prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)));
      } else {
        await loadChildren();
      }

      if (selectedChild?.id === childId) {
        setSelectedChild((prev) => (prev ? { ...prev, is_active: nextActive } : prev));
      }
    } catch (e) {
      const msg = String(e);
      setChildrenErr(msg);
      setApiError(endpoint, 0, msg);
    } finally {
      setChildActionLoadingId(null);
    }
  }

  function onBackToParent() {
    navigate("/");
  }

  function onLogout() {
    clearSession();
    navigate("/");
    window.location.reload();
  }

  /* =========================
     Guard UI
  ========================= */
  if (!isAllowed) {
    return (
      <div style={{ padding: 24 }}>
        <h2>Forbidden</h2>
        <div style={{ opacity: 0.7 }}>You do not have access to this page.</div>
      </div>
    );
  }

  /* =========================
     Render helpers
  ========================= */
  const CopyPill = ({ value, title = "Copy", onCopy }) => {
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
  };

  const renderChildCard = (c) => {
    const isSelected = selectedChild?.id === c.id;
    const isBusy = childActionLoadingId === c.id;
    const cachedCount = entriesCache[c.id]?.length;

    return (
      <div key={c.id} style={{ position: "relative" }}>
        <button
          style={{
            ...styles.childItem,
            ...(isSelected ? styles.childItemActive : {}),
            ...(c.is_active ? {} : { opacity: 0.78 }),
            width: "100%",
          }}
          onClick={() => loadEntriesForChild(c)}
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

          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <div style={styles.childMeta}>id: {c.id}</div>
            <CopyPill value={c.id} title="Copy child id" onCopy={copyText} />
          </div>

          <div style={styles.childMeta}>active: {String(c.is_active)}</div>

          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <div style={styles.childMeta}>parent_user_id: {c.parent_user_id}</div>
            <CopyPill value={c.parent_user_id} title="Copy parent_user_id" onCopy={copyText} />
          </div>

          <div style={styles.childMeta}>created_at: {c.created_at || "-"}</div>
        </button>

        {c.is_active ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setChildActive(c.id, false);
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
              setChildActive(c.id, true);
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
  };

  /* =========================
     Render
  ========================= */
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

        {/* Sticky last error */}
        {lastApiError ? (
          <div style={styles.lastErr}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
              <div style={{ fontWeight: 900 }}>Last API Error</div>
              <button style={styles.linkBtn} onClick={() => setLastApiError(null)}>
                Clear
              </button>
            </div>
            <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>
              <div>
                <b>at:</b> {lastApiError.at}
              </div>
              <div>
                <b>endpoint:</b> {lastApiError.endpoint}
              </div>
              <div>
                <b>status:</b> {lastApiError.status}
              </div>
              <div>
                <b>message:</b> {lastApiError.message}
              </div>
            </div>
          </div>
        ) : null}

        {/* Panel */}
        <div style={styles.panel}>
          {/* System */}
          <Section title="System">
            <Row label="Backend health">
              <pre style={styles.pre}>{health ? JSON.stringify(health, null, 2) : "Loading..."}</pre>
            </Row>

            <Row label="/api/me">
              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <button style={styles.primaryBtn} onClick={testMe}>
                  Test /api/me
                </button>
                {me?.status ? <span style={{ fontSize: 12, opacity: 0.7 }}>status: {me.status}</span> : null}
              </div>

              <pre style={styles.pre}>{me ? JSON.stringify(me, null, 2) : "Not tested yet"}</pre>
            </Row>
          </Section>

          {/* Parents */}
          <Section
            title={`Parents (${parentsStats.shown}/${parentsStats.loaded})`}
            right={
              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <input
                  style={styles.input}
                  placeholder="Search parents..."
                  value={parentQuery}
                  onChange={(e) => setParentQuery(e.target.value)}
                />

                <label style={styles.toggle}>
                  <input
                    type="checkbox"
                    checked={onlyParentsWithKids}
                    onChange={(e) => setOnlyParentsWithKids(e.target.checked)}
                  />
                  only with kids
                </label>

                <button style={styles.secondaryBtn} onClick={loadParents} disabled={parentsLoading}>
                  {parentsLoading ? "..." : "Refresh"}
                </button>
              </div>
            }
          >
            {parentsLoading ? (
              <div style={styles.note}>Loading parents...</div>
            ) : parentsErr ? (
              <div style={styles.error}>{parentsErr}</div>
            ) : parents.length === 0 ? (
              <div style={styles.note}>No parents found.</div>
            ) : (
              <div style={styles.childGrid}>
                <button
                  style={{
                    ...styles.childItem,
                    ...(selectedParentId === "" ? styles.childItemActive : {}),
                  }}
                  onClick={() => selectParent("")}
                  title="Show all children"
                >
                  <div style={styles.childName}>All Parents</div>
                  <div style={styles.childMeta}>Show everyone</div>
                </button>

                {filteredParents.map((p) => {
                  const kidsCount = kidsCountByParentId[p.id] || 0;

                  return (
                    <button
                      key={p.id}
                      style={{
                        ...styles.childItem,
                        ...(selectedParentId === p.id ? styles.childItemActive : {}),
                      }}
                      onClick={() => selectParent(p.id)}
                      title="Filter children by this parent"
                    >
                      <div style={styles.childName}>{p.username || p.email || "Unnamed parent"}</div>

                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        <div style={styles.childMeta}>id: {p.id}</div>
                        <CopyPill value={p.id} title="Copy parent id" onCopy={copyText} />
                      </div>

                      {p.gender ? <div style={styles.childMeta}>gender: {p.gender}</div> : null}
                      <div style={styles.childMeta}>kids: {kidsCount}</div>
                    </button>
                  );
                })}
              </div>
            )}
          </Section>

          {/* Children (combined) */}
          <Section
            title={`Children (${selectedParentLabel})`}
            subTitle={`Active: ${visibleStats.active}  |  Deleted: ${visibleStats.deleted}  |  Total: ${visibleStats.total}`}
            right={
              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <select value={childFilter} onChange={(e) => setChildFilter(e.target.value)} style={styles.select}>
                  <option value="active">Active only</option>
                  <option value="deleted">Deleted only</option>
                  <option value="both">Both</option>
                </select>

                <select value={childSort} onChange={(e) => setChildSort(e.target.value)} style={styles.select}>
                  <option value="created_desc">Newest</option>
                  <option value="created_asc">Oldest</option>
                  <option value="name_az">Name A–Z</option>
                </select>

                <button style={styles.secondaryBtn} onClick={loadChildren} disabled={childrenLoading}>
                  {childrenLoading ? "..." : "Refresh"}
                </button>

                <button style={styles.secondaryBtn} onClick={clearSelection} disabled={!selectedChild}>
                  Clear selection
                </button>

                <button
                  style={styles.secondaryBtn}
                  onClick={clearEntriesCache}
                  disabled={Object.keys(entriesCache).length === 0}
                >
                  Clear entries cache
                </button>
              </div>
            }
          >
            {childrenLoading ? (
              <div style={styles.note}>Loading children...</div>
            ) : childrenErr ? (
              <div style={styles.error}>{childrenErr}</div>
            ) : shownChildren.length === 0 ? (
              <div style={styles.note}>No children found for current filter.</div>
            ) : (
              <div style={styles.childGrid}>{shownChildren.map(renderChildCard)}</div>
            )}
          </Section>

          {/* Entries */}
          <Section
            title="Entries"
            subTitle={selectedChildTitle}
            right={
              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ fontSize: 12, fontWeight: 800, opacity: 0.75 }}>
                  {selectedChild ? `Rows: ${entries.length}` : ""}
                </div>
              </div>
            }
          >
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
                      <th style={styles.th}>created_at</th>
                      <th style={styles.th}>is_active</th>
                      <th style={styles.th}>photo_count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((e) => (
                      <tr key={e.id}>
                        <td style={styles.td}>
                          {e.id}{" "}
                          <span
                            role="button"
                            tabIndex={0}
                            style={styles.copyLink}
                            onClick={() => copyText(e.id)}
                            onKeyDown={(ev) => {
                              if (ev.key === "Enter" || ev.key === " ") {
                                ev.preventDefault();
                                copyText(e.id);
                              }
                            }}
                            title="Copy entry id"
                          >
                            copy
                          </span>
                        </td>
                        <td style={styles.td}>{e.entry_date}</td>
                        <td style={styles.td}>{e.created_at}</td>
                        <td style={styles.td}>{String(e.is_active)}</td>
                        <td style={styles.td}>{(e.photo_paths ?? []).length}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div style={{ marginTop: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.75, marginBottom: 6 }}>Raw JSON</div>
                  <pre style={styles.pre}>{JSON.stringify(entries, null, 2)}</pre>
                </div>
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

/* --- styles --- */
const styles = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(#dfeef4, #ffe7bf)",
    padding: "28px 22px",
  },
  container: { width: "min(1100px, 92vw)", margin: "0 auto" },
  header: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
    marginBottom: 16,
  },
  title: { margin: 0, fontSize: 44, color: "#245a52", letterSpacing: 0.2 },
  subTitle: { marginTop: 8, fontSize: 14, opacity: 0.75 },
  actions: { display: "flex", gap: 12, alignItems: "center", marginTop: 8 },
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

  lastErr: {
    marginBottom: 12,
    padding: 14,
    borderRadius: 18,
    background: "rgba(255,255,255,0.72)",
    border: "1px solid rgba(220,20,60,0.25)",
    boxShadow: "0 10px 26px rgba(0,0,0,0.08)",
  },
  linkBtn: {
    padding: "8px 10px",
    borderRadius: 12,
    border: "1px solid rgba(0,0,0,0.12)",
    background: "#ffffff",
    fontWeight: 900,
    cursor: "pointer",
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
  sectionTitle: { fontSize: 18, fontWeight: 900, color: "#245a52" },
  sectionSub: { marginTop: 4, fontSize: 12, opacity: 0.75 },

  label: {
    fontSize: 12,
    fontWeight: 800,
    opacity: 0.75,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },

  input: {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(0,0,0,0.12)",
    background: "#fff",
    width: 230,
    fontWeight: 700,
  },
  select: {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(0,0,0,0.12)",
    background: "#fff",
    fontWeight: 800,
  },
  toggle: {
    display: "flex",
    gap: 8,
    alignItems: "center",
    fontSize: 12,
    fontWeight: 800,
    opacity: 0.8,
    userSelect: "none",
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
  note: { padding: "10px 0", opacity: 0.75 },
  error: { padding: "10px 0", color: "crimson", fontWeight: 700 },

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
  childItemActive: { outline: "3px solid rgba(36, 90, 82, 0.25)" },
  childName: { fontSize: 16, fontWeight: 900, color: "#333", marginBottom: 6 },
  childMeta: { fontSize: 12, opacity: 0.75, lineHeight: 1.35 },

  copyLink: {
    marginLeft: 6,
    padding: "2px 8px",
    borderRadius: 10,
    border: "1px solid rgba(0,0,0,0.12)",
    background: "#ffffff",
    cursor: "pointer",
    fontWeight: 900,
    fontSize: 11,
    display: "inline-block",
    userSelect: "none",
  },

  miniBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    padding: "8px 10px",
    borderRadius: 12,
    border: "1px solid rgba(0,0,0,0.12)",
    background: "#ffffff",
    fontWeight: 900,
    cursor: "pointer",
    boxShadow: "0 8px 18px rgba(0,0,0,0.08)",
    fontSize: 12,
  },
  miniBtnDanger: {
    position: "absolute",
    top: 10,
    right: 10,
    padding: "8px 10px",
    borderRadius: 12,
    border: "1px solid rgba(0,0,0,0.12)",
    background: "#f6efe7",
    color: "#a3402c",
    fontWeight: 900,
    cursor: "pointer",
    boxShadow: "0 8px 18px rgba(0,0,0,0.08)",
    fontSize: 12,
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