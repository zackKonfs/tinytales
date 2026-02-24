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
                        <div style={styles.thumb} />
                        <div style={styles.childName}>{c.name}</div>
                        <button style={styles.deleteBtn}> 🗑 </button>
                    </div>
                    ))}
                </section>
            </div>
        </div>

        <CreateChildModal
            open={showCreateChild}
            onClose={() => setShowCreateChild(false)}
            onCreate={ async (payload) => {
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
    textAlign: "center",
    cursor: "pointer",
    boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
    position: "relative",
  },
  thumb: {
    width: "100%",
    aspectRatio: "1 / 1",
    borderRadius: 16,
    background: "rgba(0,0,0,0.06)",
    marginBottom: 10,
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
    }
};