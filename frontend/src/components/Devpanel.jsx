import { useNavigate } from "react-router-dom";
import { clearSession, loadSession } from "../auth/session";
import { styles } from "./devpanel.styles";
import { Section, Row, CopyPill } from "./devpanel.ui";
import { useDevPanel } from "./devpanel.hooks";
import DevChildCard from "./DevChildCard";

export default function DevPanel({ username }) {
  const navigate = useNavigate();

  /* =========================
     Auth guard (superadmin)
  ========================= */
  const sessionEmail = loadSession()?.user?.email || "";
  const effectiveEmail = username || sessionEmail;
  const isAllowed = effectiveEmail === "zack.xu@hotmail.com";

  const dp = useDevPanel({ isAllowed });

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
        {dp.lastApiError ? (
          <div style={styles.lastErr}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
              <div style={{ fontWeight: 900 }}>Last API Error</div>
              <button style={styles.linkBtn} onClick={() => dp.setLastApiError(null)}>
                Clear
              </button>
            </div>
            <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>
              <div>
                <b>at:</b> {dp.lastApiError.at}
              </div>
              <div>
                <b>endpoint:</b> {dp.lastApiError.endpoint}
              </div>
              <div>
                <b>status:</b> {dp.lastApiError.status}
              </div>
              <div>
                <b>message:</b> {dp.lastApiError.message}
              </div>
            </div>
          </div>
        ) : null}

        {/* Panel */}
        <div style={styles.panel}>
          {/* System */}
          <Section title="System">
            <Row label="Backend health">
              <pre style={styles.pre}>{dp.health ? JSON.stringify(dp.health, null, 2) : "Loading..."}</pre>
            </Row>

            <Row label="/api/me">
              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <button style={styles.primaryBtn} onClick={dp.testMe}>
                  Test /api/me
                </button>
                {dp.me?.status ? <span style={{ fontSize: 12, opacity: 0.7 }}>status: {dp.me.status}</span> : null}
              </div>

              <pre style={styles.pre}>{dp.me ? JSON.stringify(dp.me, null, 2) : "Not tested yet"}</pre>
            </Row>
          </Section>

          {/* Parents */}
          <Section
            title={`Parents (${dp.parentsStats.shown}/${dp.parentsStats.loaded})`}
            right={
              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <input
                  style={styles.input}
                  placeholder="Search parents..."
                  value={dp.parentQuery}
                  onChange={(e) => dp.setParentQuery(e.target.value)}
                />

                <label style={styles.toggle}>
                  <input
                    type="checkbox"
                    checked={dp.onlyParentsWithKids}
                    onChange={(e) => dp.setOnlyParentsWithKids(e.target.checked)}
                  />
                  only with kids
                </label>

                <button style={styles.secondaryBtn} onClick={dp.loadParents} disabled={dp.parentsLoading}>
                  {dp.parentsLoading ? "..." : "Refresh"}
                </button>
              </div>
            }
          >
            {dp.parentsLoading ? (
              <div style={styles.note}>Loading parents...</div>
            ) : dp.parentsErr ? (
              <div style={styles.error}>{dp.parentsErr}</div>
            ) : dp.parents.length === 0 ? (
              <div style={styles.note}>No parents found.</div>
            ) : (
              <div style={styles.childGrid}>
                <button
                  style={{
                    ...styles.childItem,
                    ...(dp.selectedParentId === "" ? styles.childItemActive : {}),
                  }}
                  onClick={() => dp.selectParent("")}
                  title="Show all children"
                >
                  <div style={styles.childName}>All Parents</div>
                  <div style={styles.childMeta}>Show everyone</div>
                </button>

                {dp.filteredParents.map((p) => {
                  const kidsCount = dp.kidsCountByParentId[p.id] || 0;

                  return (
                    <button
                      key={p.id}
                      style={{
                        ...styles.childItem,
                        ...(dp.selectedParentId === p.id ? styles.childItemActive : {}),
                      }}
                      onClick={() => dp.selectParent(p.id)}
                      title="Filter children by this parent"
                    >
                      <div style={styles.childName}>{p.username || p.email || "Unnamed parent"}</div>

                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        <div style={styles.childMeta}>id: {p.id}</div>
                        <CopyPill value={p.id} title="Copy parent id" onCopy={dp.copyText} />
                      </div>

                      {p.gender ? <div style={styles.childMeta}>gender: {p.gender}</div> : null}
                      <div style={styles.childMeta}>kids: {kidsCount}</div>
                    </button>
                  );
                })}
              </div>
            )}
          </Section>

          {/* Children */}
          <Section
            title={`Children (${dp.selectedParentLabel})`}
            subTitle={`Active: ${dp.visibleStats.active}  |  Deleted: ${dp.visibleStats.deleted}  |  Total: ${dp.visibleStats.total}`}
            right={
              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <select value={dp.childFilter} onChange={(e) => dp.setChildFilter(e.target.value)} style={styles.select}>
                  <option value="active">Active only</option>
                  <option value="deleted">Deleted only</option>
                  <option value="both">Both</option>
                </select>

                <select value={dp.childSort} onChange={(e) => dp.setChildSort(e.target.value)} style={styles.select}>
                  <option value="created_desc">Newest</option>
                  <option value="created_asc">Oldest</option>
                  <option value="name_az">Name A–Z</option>
                </select>

                <button style={styles.secondaryBtn} onClick={dp.loadChildren} disabled={dp.childrenLoading}>
                  {dp.childrenLoading ? "..." : "Refresh"}
                </button>

                <button style={styles.secondaryBtn} onClick={dp.clearSelection} disabled={!dp.selectedChild}>
                  Clear selection
                </button>

                <button
                  style={styles.secondaryBtn}
                  onClick={dp.clearEntriesCache}
                  disabled={Object.keys(dp.entriesCache).length === 0}
                >
                  Clear entries cache
                </button>
              </div>
            }
          >
            {dp.childrenLoading ? (
              <div style={styles.note}>Loading children...</div>
            ) : dp.childrenErr ? (
              <div style={styles.error}>{dp.childrenErr}</div>
            ) : dp.shownChildren.length === 0 ? (
              <div style={styles.note}>No children found for current filter.</div>
            ) : (
              <div style={styles.childGrid}>
                {dp.shownChildren.map((c) => (
                  <DevChildCard
                    key={c.id}
                    child={c}
                    isSelected={dp.selectedChild?.id === c.id}
                    isBusy={dp.childActionLoadingId === c.id}
                    cachedCount={dp.entriesCache[c.id]?.length}
                    entriesLoading={dp.entriesLoading}
                    onSelect={() => dp.loadEntriesForChild(c)}
                    onToggleActive={(nextActive) => dp.setChildActive(c.id, nextActive)}
                    onCopy={dp.copyText}
                  />
                ))}
              </div>
            )}
          </Section>

          {/* Entries */}
          <Section
            title="Entries"
            subTitle={dp.selectedChildTitle}
            right={
              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ fontSize: 12, fontWeight: 800, opacity: 0.75 }}>
                  {dp.selectedChild ? `Rows: ${dp.entries.length}` : ""}
                </div>
              </div>
            }
          >
            {!dp.selectedChild ? (
              <div style={styles.note}>Select a child above to load entries.</div>
            ) : dp.entriesLoading ? (
              <div style={styles.note}>Loading entries...</div>
            ) : dp.entriesErr ? (
              <div style={styles.error}>{dp.entriesErr}</div>
            ) : dp.entries.length === 0 ? (
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
                    {dp.entries.map((e) => (
                      <tr key={e.id}>
                        <td style={styles.td}>
                          {e.id}{" "}
                          <span
                            role="button"
                            tabIndex={0}
                            style={styles.copyLink}
                            onClick={() => dp.copyText(e.id)}
                            onKeyDown={(ev) => {
                              if (ev.key === "Enter" || ev.key === " ") {
                                ev.preventDefault();
                                dp.copyText(e.id);
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
                  <pre style={styles.pre}>{JSON.stringify(dp.entries, null, 2)}</pre>
                </div>
              </div>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}