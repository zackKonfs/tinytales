import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../api/client";
import CreateChildModal from "./CreateChildModal";
import EnterPageDecor from "./EnterPageDecor";

function toTitleCase(s) {
  if (!s) return "";
  return String(s)
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function isBlobUrl(v) {
  return typeof v === "string" && v.startsWith("blob:");
}

function withCacheBust(url) {
  if (!url) return "";
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}v=${Date.now()}`;
}

export default function ParentAccount({ parentName, onSelectChild, parentEmail }) {
  const navigate = useNavigate();

  const [showCreateChild, setShowCreateChild] = useState(false);
  const [childrenList, setChildrenList] = useState([]);
  const [loadingChildren, setLoadingChildren] = useState(false);
  const [childrenError, setChildrenError] = useState("");

  const [profile, setProfile] = useState({
    username: "",
    gender: "",
    date_of_birth: "",
    avatar_url: "",
  });
  const [parentAvatarUrl, setParentAvatarUrl] = useState("");
  const [displayName, setDisplayName] = useState(() => toTitleCase(parentName || "Parent"));

  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editForm, setEditForm] = useState({
    username: "",
    gender: "",
    date_of_birth: "",
  });
  const [editAvatarFile, setEditAvatarFile] = useState(null);
  const [editAvatarPreview, setEditAvatarPreview] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

  const [confirmChild, setConfirmChild] = useState(null);
  const [successMsg, setSuccessMsg] = useState("");
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth : 1200
  );

  const isSuperAdmin = useMemo(() => parentEmail === "zack.xu@hotmail.com", [parentEmail]);

  function getInitials(name = "") {
    const trimmed = String(name || "").trim();
    if (!trimmed) return "?";
    const parts = trimmed.split(/\s+/).filter(Boolean);
    const first = parts[0]?.[0] || "";
    const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
    return (first + last).toUpperCase();
  }

  function resetEditState() {
    setEditError("");
    setEditSaving(false);
    setEditAvatarFile(null);
    setEditAvatarPreview("");
    setEditForm({
      username: profile.username || "",
      gender: profile.gender || "",
      date_of_birth: profile.date_of_birth || "",
    });
  }

  function openEditModal() {
    resetEditState();
    setShowEditProfile(true);
  }

  function closeEditModal() {
    if (isBlobUrl(editAvatarPreview)) URL.revokeObjectURL(editAvatarPreview);
    setShowEditProfile(false);
    setEditError("");
    setEditAvatarFile(null);
    setEditAvatarPreview("");
  }

  const loadChildren = useCallback(async () => {
    setChildrenError("");
    setLoadingChildren(true);

    try {
      const res = await apiFetch("/api/children");
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        setChildrenError(json.error || json.message || "Failed to load children");
        setChildrenList([]);
        return;
      }

      setChildrenList(json.children ?? []);
    } catch {
      setChildrenError("Network error loading children");
      setChildrenList([]);
    } finally {
      setLoadingChildren(false);
    }
  }, []);

  const loadParentProfile = useCallback(async () => {
    const res = await apiFetch("/api/parent/profile");
    const json = await res.json().catch(() => ({}));

    if (res.ok && json.ok) {
      const nextProfile = {
        username: json.profile?.username || "",
        gender: json.profile?.gender || "",
        date_of_birth: json.profile?.date_of_birth || "",
        avatar_url: json.profile?.avatar_url || "",
      };

      setProfile(nextProfile);
      setParentAvatarUrl(withCacheBust(nextProfile.avatar_url));
      setDisplayName(toTitleCase(nextProfile.username || parentName || "Parent"));
      return;
    }

    setDisplayName(toTitleCase(parentName || "Parent"));
  }, [parentName]);

  async function setChildActive(childId, isActive) {
    const res = await apiFetch(`/api/children/${childId}/active`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: isActive }),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(json.message || json.error || `Failed (${res.status})`);
      return;
    }

    if (!isActive) setChildrenList((prev) => prev.filter((c) => c.id !== childId));
  }

  async function onPickEditAvatar(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxBytes = 1.5 * 1024 * 1024;
    if (file.size > maxBytes) {
      setEditError("Image must be smaller than 1.5MB.");
      e.target.value = "";
      return;
    }

    if (isBlobUrl(editAvatarPreview)) URL.revokeObjectURL(editAvatarPreview);
    const nextPreview = URL.createObjectURL(file);
    setEditAvatarPreview(nextPreview);
    setEditAvatarFile(file);
    setEditError("");
    e.target.value = "";
  }

  async function saveProfileChanges() {
    const cleanUsername = String(editForm.username || "").trim();
    if (!cleanUsername) {
      setEditError("Name is required.");
      return;
    }

    setEditSaving(true);
    setEditError("");

    try {
      const profileRes = await apiFetch("/api/parent/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: cleanUsername,
          gender: editForm.gender || null,
          date_of_birth: editForm.date_of_birth || null,
        }),
      });

      const profileJson = await profileRes.json().catch(() => ({}));
      if (!profileRes.ok) {
        setEditError(profileJson.error || profileJson.message || `Failed (${profileRes.status})`);
        return;
      }

      if (editAvatarFile) {
        const form = new FormData();
        form.append("avatar", editAvatarFile);

        const avatarRes = await apiFetch("/api/avatar/parent", {
          method: "POST",
          body: form,
        });
        const avatarJson = await avatarRes.json().catch(() => ({}));

        if (!avatarRes.ok) {
          setEditError(avatarJson.error || avatarJson.message || `Avatar upload failed (${avatarRes.status})`);
          return;
        }
      }

      await loadParentProfile();
      closeEditModal();
      setSuccessMsg("Profile updated.");
    } catch (e) {
      setEditError(String(e));
    } finally {
      setEditSaving(false);
    }
  }

  useEffect(() => {
    loadChildren();
    loadParentProfile();
  }, [loadChildren, loadParentProfile]);

  useEffect(() => {
    return () => {
      if (isBlobUrl(editAvatarPreview)) URL.revokeObjectURL(editAvatarPreview);
    };
  }, [editAvatarPreview]);

  useEffect(() => {
    function onResize() {
      setViewportWidth(window.innerWidth);
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const isMobile = viewportWidth <= 768;
  const isTablet = viewportWidth > 768 && viewportWidth <= 1024;
  const gridColumns = isMobile ? 1 : isTablet ? 2 : 3;
  const thumbSize = isMobile ? 146 : 180;

  return (
    <div style={{ ...styles.page, padding: isMobile ? "20px 12px" : styles.page.padding }}>
      <EnterPageDecor variant="journal" />

      <div style={{ ...styles.container, width: isMobile ? "min(1100px, 96vw)" : styles.container.width }}>
        <header
          style={{
            ...styles.header,
            flexDirection: isMobile ? "column" : "row",
            alignItems: isMobile ? "flex-start" : "center",
            marginBottom: isMobile ? 16 : styles.header.marginBottom,
          }}
        >
          <div>
            <h1 style={{ ...styles.title, fontSize: isMobile ? 34 : styles.title.fontSize }}>Parent Account</h1>

            <div style={{ position: "relative", width: 68, height: 68 }}>
              <div style={styles.parentAvatarWrap}>
                {parentAvatarUrl ? (
                  <img
                    src={parentAvatarUrl}
                    alt="parent avatar"
                    style={styles.parentAvatarImg}
                    onError={() => setParentAvatarUrl("")}
                  />
                ) : (
                  <div style={styles.parentAvatarFallback}>
                    <div style={styles.parentAvatarInitials}>{getInitials(displayName)}</div>
                  </div>
                )}
              </div>

              <button style={styles.avatarEditBtn} title="Edit profile" onClick={openEditModal}>
                {"\u270E"}
              </button>
            </div>

            <div style={{ ...styles.greeting, fontSize: isMobile ? 20 : styles.greeting.fontSize }}>
              Hello, {displayName} (Parent)
            </div>
          </div>

          <div style={{ ...styles.actions, marginTop: isMobile ? 6 : styles.actions.marginTop }}>
            {isSuperAdmin ? (
              <button style={styles.devBtn} onClick={() => navigate("/dev")}>
                Dev Panel
              </button>
            ) : null}
          </div>
        </header>
      </div>

      <div style={{ ...styles.container, width: isMobile ? "min(1100px, 96vw)" : styles.container.width }}>
        <div style={{ ...styles.panel, padding: isMobile ? "16px 12px 18px" : styles.panel.padding }}>
          <button style={styles.panelCreateBtn} onClick={() => setShowCreateChild(true)}>
            Create Account
          </button>

          {childrenList.length === 0 && (
            <div style={{ opacity: 0.7, padding: "12px 0" }}>No children account yet!</div>
          )}

          <section style={{ ...styles.grid, gridTemplateColumns: `repeat(${gridColumns}, minmax(0, 1fr))` }}>
            {childrenList.map((c) => (
              <div key={c.id} style={styles.card} onClick={() => onSelectChild?.(c)}>
                <div style={{ ...styles.thumb, width: thumbSize, height: thumbSize }}>
                  {c.avatar_url ? (
                    <img
                      src={c.avatar_url}
                      alt={`${c.name} avatar`}
                      style={styles.thumbImg}
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  ) : (
                    <div style={styles.thumbText}>{getInitials(toTitleCase(c.name))}</div>
                  )}
                </div>

                <div style={styles.childName}>{toTitleCase(c.name)}</div>

                <button
                  style={styles.deleteBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmChild(c);
                  }}
                  title="Disable child"
                >
                  🗑
                </button>
              </div>
            ))}
          </section>
        </div>
      </div>

      {showCreateChild && (
        <CreateChildModal
          onClose={() => setShowCreateChild(false)}
          onCreate={async (payload) => {
            const res = await apiFetch("/api/children", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });

            const json = await res.json().catch(() => ({}));
            if (!res.ok) {
              alert(json.error || json.message || "Failed to create child");
              return;
            }

            setChildrenList((prev) => [json.child, ...prev]);
            setShowCreateChild(false);
          }}
        />
      )}

      {showEditProfile && (
        <div style={styles.modalBackdrop}>
          <div style={styles.modalBox}>
            <div style={styles.modalTitle}>Edit Profile</div>

            <div style={styles.fieldGroup}>
              <label style={styles.fieldLabel}>Name</label>
              <input
                style={styles.fieldInput}
                value={editForm.username}
                onChange={(e) => setEditForm((prev) => ({ ...prev, username: e.target.value }))}
                placeholder="Enter your name"
              />
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.fieldLabel}>Gender</label>
              <select
                style={styles.fieldInput}
                value={editForm.gender}
                onChange={(e) => setEditForm((prev) => ({ ...prev, gender: e.target.value }))}
              >
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.fieldLabel}>Date of birth</label>
              <input
                type="date"
                style={styles.fieldInput}
                value={editForm.date_of_birth}
                onChange={(e) => setEditForm((prev) => ({ ...prev, date_of_birth: e.target.value }))}
              />
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.fieldLabel}>Avatar photo</label>
              <label style={styles.changeAvatarBtn}>
                Change
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={onPickEditAvatar}
                  style={{ display: "none" }}
                />
              </label>
              <div style={styles.previewRow}>
                <div style={styles.previewLabel}>Preview:</div>
                {editAvatarPreview || parentAvatarUrl ? (
                  <img
                    src={editAvatarPreview || parentAvatarUrl}
                    alt="avatar preview"
                    style={styles.editPreviewImg}
                    onError={() => setEditAvatarPreview("")}
                  />
                ) : (
                  <div style={{ opacity: 0.7 }}>No image</div>
                )}
              </div>
            </div>

            {editError ? <div style={styles.inlineError}>{editError}</div> : null}

            <div style={styles.modalActions}>
              <button style={styles.modalCancelBtn} onClick={closeEditModal} disabled={editSaving}>
                Cancel
              </button>
              <button style={styles.modalDangerBtn} onClick={saveProfileChanges} disabled={editSaving}>
                {editSaving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmChild && (
        <div style={styles.modalBackdrop}>
          <div style={styles.modalBox}>
            <div style={styles.modalTitle}>Confirm</div>
            <div style={styles.modalText}>Are you sure you want to delete this account?</div>

            <div style={styles.modalActions}>
              <button style={styles.modalCancelBtn} onClick={() => setConfirmChild(null)}>
                Cancel
              </button>

              <button
                style={styles.modalDangerBtn}
                onClick={async () => {
                  try {
                    const child = confirmChild;
                    await setChildActive(child.id, false);
                    setConfirmChild(null);
                    setSuccessMsg(`${toTitleCase(child.name)} account deleted`);
                  } catch (e) {
                    alert(e?.message || "Failed to delete child");
                  }
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {successMsg && (
        <div style={styles.modalBackdrop}>
          <div style={styles.modalBox}>
            <div style={styles.modalTitle}>Done</div>
            <div style={styles.modalText}>{successMsg}</div>

            <div style={styles.modalActions}>
              <button style={styles.modalDangerBtn} onClick={() => setSuccessMsg("")}>
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {loadingChildren && <div style={{ padding: "8px 0", opacity: 0.8 }}>Loading children...</div>}
      {childrenError && <div style={{ padding: "8px 0", color: "crimson" }}>{childrenError}</div>}
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    padding: "36px 28px",
    position: "relative",
    overflow: "hidden",
    isolation: "isolate",
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    marginBottom: 24,
  },
  title: {
    margin: 0,
    fontSize: 44,
    color: "#245a52",
    letterSpacing: 0.2,
  },
  greeting: {
    marginTop: 10,
    fontSize: 26,
    color: "#333",
    opacity: 0.9,
  },
  actions: {
    display: "flex",
    gap: 12,
    alignItems: "center",
    marginTop: 10,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 22,
    maxWidth: 980,
  },
  card: {
    border: "none",
    background: "rgba(255,255,255,0.75)",
    borderRadius: 18,
    padding: 16,
    cursor: "pointer",
    boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
    position: "relative",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 12,
  },
  thumb: {
    width: 180,
    height: 180,
    borderRadius: 16,
    background: "linear-gradient(135deg, #e6f2ef, #d4e6e1)",
    border: "2px solid #e0d7cc",
    boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  childName: {
    fontSize: 18,
    fontWeight: 700,
    color: "#333",
  },
  panel: {
    marginTop: 24,
    background: "rgba(255,255,255,0.55)",
    borderRadius: 22,
    padding: "22px 22px 26px",
    boxShadow: "0 14px 40px rgba(0,0,0,0.14)",
    backdropFilter: "blur(6px)",
  },
  panelCreateBtn: {
    padding: "12px 18px",
    borderRadius: 14,
    border: "1px solid rgba(0,0,0,0.12)",
    background: "#f0a64a",
    color: "#fff",
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 8px 18px rgba(0,0,0,0.18)",
    marginBottom: 18,
  },
  container: {
    width: "min(1100px, 92vw)",
    marginLeft: "auto",
    marginRight: "auto",
    position: "relative",
    zIndex: 1,
  },
  deleteBtn: {
    position: "absolute",
    bottom: 8,
    right: 8,
    border: "none",
    background: "white",
    borderRadius: "50%",
    cursor: "pointer",
    width: 36,
    height: 36,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 18,
    fontWeight: 700,
    lineHeight: 1,
    padding: 0,
  },
  modalBackdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.35)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  modalBox: {
    width: "min(520px, 92vw)",
    background: "rgba(255,255,255,0.92)",
    borderRadius: 18,
    padding: "18px 18px 16px",
    boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
    backdropFilter: "blur(6px)",
    border: "1px solid rgba(0,0,0,0.08)",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 800,
    color: "#245a52",
    marginBottom: 8,
  },
  modalText: {
    fontSize: 14,
    color: "#333",
    opacity: 0.9,
    marginBottom: 14,
  },
  modalActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 10,
  },
  modalCancelBtn: {
    padding: "10px 14px",
    borderRadius: 12,
    border: "1px solid rgba(0,0,0,0.12)",
    background: "#f6efe7",
    color: "#333",
    fontWeight: 700,
    cursor: "pointer",
  },
  modalDangerBtn: {
    padding: "10px 14px",
    borderRadius: 12,
    border: "1px solid rgba(0,0,0,0.12)",
    background: "#f0a64a",
    color: "#fff",
    fontWeight: 800,
    cursor: "pointer",
  },
  thumbText: {
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 48,
    fontWeight: 900,
    color: "#245a52",
    letterSpacing: 2,
    userSelect: "none",
  },
  thumbImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  },
  devBtn: {
    padding: "12px 18px",
    borderRadius: 14,
    border: "1px solid rgba(0,0,0,0.08)",
    background: "#fff",
    cursor: "pointer",
    fontWeight: 700,
  },
  parentAvatarWrap: {
    width: 68,
    height: 68,
    borderRadius: "50%",
    background: "#eee",
    overflow: "hidden",
  },
  parentAvatarImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  parentAvatarFallback: {
    width: "100%",
    height: "100%",
    display: "grid",
    placeItems: "center",
  },
  parentAvatarInitials: {
    fontWeight: 900,
    color: "#245a52",
  },
  avatarEditBtn: {
    position: "absolute",
    bottom: -4,
    right: -12,
    width: 28,
    height: 28,
    borderRadius: 12,
    background: "#ffffff",
    border: "1px solid #ddd",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
    zIndex: 5,
    fontSize: 12,
    padding: 0,
  },
  fieldGroup: {
    marginTop: 10,
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: 700,
    opacity: 0.8,
  },
  fieldInput: {
    border: "1px solid rgba(0,0,0,0.15)",
    borderRadius: 10,
    padding: "10px 12px",
    fontSize: 14,
    background: "#fff",
  },
  inlineError: {
    color: "crimson",
    fontSize: 12,
    fontWeight: 700,
    marginTop: 8,
  },
  previewRow: {
    marginTop: 8,
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  previewLabel: {
    fontSize: 12,
    fontWeight: 700,
    opacity: 0.8,
  },
  editPreviewImg: {
    width: 48,
    height: 48,
    borderRadius: "50%",
    objectFit: "cover",
    border: "1px solid rgba(0,0,0,0.12)",
  },
  changeAvatarBtn: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "fit-content",
    border: "1px solid rgba(0,0,0,0.12)",
    borderRadius: 10,
    padding: "8px 14px",
    background: "#fff",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
  },
};
