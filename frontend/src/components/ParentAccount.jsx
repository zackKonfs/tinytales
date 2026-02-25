import { useState, useEffect } from "react";
import { apiFetch } from "../api/client";
import CreateChildModal from "./CreateChildModal";


export default function ParentAccount({
  parentName = "Zack",
  onLogout,
  //onCreateChild,
  onSelectChild,
}) {

    const [showCreateChild, setShowCreateChild] = useState(false);
    const [childrenList, setChildrenList] = useState([]);
    const [loadingChildren, setLoadingChildren] = useState(false);
    const [childrenError, setChildrenError] = useState("");
    const [parentAvatarUrl, setParentAvatarUrl] = useState("");
    const [confirmChild, setConfirmChild] = useState(null); // will store the child object {id,name,...}
    const [successMsg, setSuccessMsg] = useState("");       // for success popup text

    function getInitials(name = "") {
        const trimmed = name.trim();
        if (!trimmed) return "?";

        const parts = trimmed.split(/\s+/).filter(Boolean);
        const first = parts[0]?.[0] || "";
        const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
        return (first + last).toUpperCase();
    }

    async function handleParentAvatarChange(e) {
            const file = e.target.files?.[0];
            if (!file) return;

            try {
                const MAX = 1.5 * 1024 * 1024; // 1.5MB
                if (file.size > MAX) {
                alert("Image must be smaller than 1.5MB");
                return;
                }

                const form = new FormData();
                form.append("avatar", file);

                const res = await apiFetch("/api/avatar/parent", {
                method: "POST",
                body: form,
                });

                const json = await res.json().catch(() => ({}));
                console.log("avatar upload status:", res.status, json);

                if (!res.ok) {
                alert(json.error || json.message || `Upload failed (HTTP ${res.status})`);
                return;
                }

                // ✅ cache-bust so browser doesn’t show old cached avatar
                setParentAvatarUrl(`${json.avatar_url}?v=${Date.now()}`);
            } finally {
                // ✅ always reset file input so picking again always triggers onChange
                e.target.value = "";
            }
        }

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
        if (!isActive) {
            setChildrenList(prev => prev.filter(c => c.id !== childId));
        } else {
            // if you ever show disabled list later, you'd update in place instead
        }
    }

    useEffect(() => {
        async function loadChildren() {
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
        }

    loadChildren();

    async function loadParentProfile() {
            const res = await apiFetch("/api/parent/profile");
            const json = await res.json();

            if (res.ok && json.ok) {
                setParentAvatarUrl(json.profile.avatar_url || "");
            }
        }

    loadParentProfile();
    }, []);

  return (
    <div style={styles.page}>
        <div style={styles.container}>
            <header style={styles.header}>
                <div>
                <h1 style={styles.title}>Parent Account</h1>
                <div style={{ position: "relative", width: 56, height: 56 }}>
                    <div
                        style={{
                        width: 56,
                        height: 56,
                        borderRadius: "50%",
                        background: "#eee",
                        overflow: "hidden",
                        }}
                    >
                        {parentAvatarUrl && (
                        <img
                            src={parentAvatarUrl}
                            alt="parent avatar"
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                            onError={() => setParentAvatarUrl("")}
                        />
                        )}
                    </div>

                    <label
                        style={{
                            position: "absolute",
                            bottom: -2,
                            right: -10,
                            width: 24,
                            height: 24,
                            borderRadius: "50%",
                            background: "#ffffff",
                            border: "1px solid #ddd",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                            boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
                            zIndex: 5,
                        }}
                        title="Change avatar"
                    >
                        <input
                        type="file"
                        accept="image/*"
                        style={{ display: "none" }}
                        onChange={handleParentAvatarChange}
                        />
                        ✏️
                    </label>
                </div>
                <div style={styles.greeting}>Hello, {parentName} (Parent)</div>
                </div>

                <div style={styles.actions}>
                <button style={styles.logoutBtn} onClick={onLogout}>
                    Logout
                </button>
                </div>
            </header>
        </div>

        <div style={styles.container}>
            <div style={styles.panel}>
                <button style={styles.panelCreateBtn} onClick={()=> setShowCreateChild(true)}>
                    Create Account
                </button>

                <div style={{ fontSize: 12, opacity: 0.7 }}>
                    children loaded: {childrenList.length}
                </div>

                {childrenList.length === 0 && (
                    <div style={{ opacity: 0.7, padding: "12px 0" }}>
                        No children account yet!
                    </div>
                )}

                <section style={styles.grid}>
                    {childrenList.map((c) => (
                    <div
                        key={c.id}
                        style={styles.card}
                        onClick={() => onSelectChild?.(c)}
                    >
                    <div style={styles.thumb}>
                        <div style={styles.thumbText}>{getInitials(c.name)}</div>
                    </div>
                    <div style={styles.childName}>{c.name}</div>
                    <button
                    style={styles.deleteBtn}
                    onClick={(e) => {
                        e.stopPropagation();
                        setConfirmChild(c); // store the selected child
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

                const json = await res.json();

                if (!res.ok) {
                    alert(json.error || json.message || "Failed to create child");
                    return;
                }

                setChildrenList((prev) => [json.child, ...prev]);
                setShowCreateChild(false);
                }}
            />
        )}

        {confirmChild && (
            <div style={styles.modalBackdrop}>
                <div style={styles.modalBox}>
                <div style={styles.modalTitle}>Confirm</div>
                <div style={styles.modalText}>
                    Are you sure you want to delete this account?
                </div>

                <div style={styles.modalActions}>
                    <button
                    style={styles.modalCancelBtn}
                    onClick={() => setConfirmChild(null)}
                    >
                    Cancel
                    </button>

                    <button
                    style={styles.modalDangerBtn}
                    onClick={async () => {
                          try {
                                const child = confirmChild; // store it first
                                await setChildActive(child.id, false); // disable (soft delete)
                                setConfirmChild(null); // close confirm modal
                                setSuccessMsg(`${child.name}'s account deleted`);
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
                    <button
                    style={styles.modalDangerBtn}
                    onClick={() => setSuccessMsg("")}
                    >
                    OK
                    </button>
                </div>
                </div>
            </div>
        )}

        {loadingChildren && (
            <div style={{ padding: "8px 0", opacity: 0.8 }}>
                Loading children...
            </div>
        )}

        {childrenError && (
            <div style={{ padding: "8px 0", color: "crimson" }}>
                {childrenError}
            </div>
        )}
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    padding: "36px 28px",
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
  createBtn: {
    padding: "12px 18px",
    borderRadius: 14,
    border: "1px solid rgba(0,0,0,0.12)",
    background: "#f0a64a",
    color: "#fff",
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 8px 18px rgba(0,0,0,0.18)",
  },
  logoutBtn: {
    padding: "12px 18px",
    borderRadius: 14,
    border: "1px solid rgba(0,0,0,0.12)",
    background: "#f6efe7",
    color: "#a3402c",
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 8px 18px rgba(0,0,0,0.12)",
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
    // textAlign: "center",
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
    },
    deleteBtn: {
        position: "absolute",
        bottom: 8,
        right: 8,
        border: "none",
        background: "white",
        borderRadius: "50%",
        cursor: "pointer",
        padding: 6,
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
};