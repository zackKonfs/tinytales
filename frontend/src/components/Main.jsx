import EnterPage from "../components/EnterPage";
import LoginModal from "../components/LoginModal";
import AccountPickerModal from "../components/AccountPickerModal";
import ParentAccount from "../components/ParentAccount";
import ChildJournalPage from "../components/ChildJournalPage";
import AboutPage from "../components/AboutPage";
import ContactPage from "../components/ContactPage";
import AppHeader from "../components/AppHeader";

import { loadSession, clearSession } from "../auth/session";
import { useEffect, useState } from "react";
import { apiFetch } from "../api/client";

const PAGES = {
  entry: EnterPage,
  child: ChildJournalPage,
  parent: ParentAccount,
  about: AboutPage,
  contact: ContactPage,
};

function toTitleCase(s) {
  if (!s) return "";
  return String(s)
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export default function Main({
  checkPage,
  setCheckPage,
  showLogin,
  setShowLogin,
  username,
  setUsername,
}) {
  const Page = PAGES[checkPage] ?? EnterPage;

  const [showAccountPicker, setShowAccountPicker] = useState(false);
  const [isBooting, setIsBooting] = useState(true);
  const [selectedChild, setSelectedChild] = useState(null);
  const [childrenList, setChildrenList] = useState([]);

  // ✅ NEW: separate display name (not email)
  const [parentDisplayName, setParentDisplayName] = useState("");

  function go(page) {
    setCheckPage(page);
  }

  function logoutEverywhere() {
    clearSession();
    localStorage.removeItem("tt_selectedChild");
    setSelectedChild(null);
    setUsername("");
    setParentDisplayName("");
    setCheckPage("entry");
  }

  async function loadParentDisplayNameFallback() {
    try {
      const res = await apiFetch("/api/parent/profile");
      const json = await res.json().catch(() => ({}));

      if (res.ok && json.ok) {
        const nameFromDb = json.profile?.username || "";
        if (nameFromDb) {
          setParentDisplayName(toTitleCase(nameFromDb));
          return;
        }
      }
    } catch {
      // ignore
    }

    // fallback: use email prefix if no profile name
    const email = username || "";
    const prefix = email.includes("@") ? email.split("@")[0] : "";
    setParentDisplayName(toTitleCase(prefix) || "Parent");
  }

  const pageProps = {
    entry: { setLogin: () => setShowLogin(true) },

    about: {},
    contact: {},

    child: {
      username,
      child: selectedChild,
      onGoParent: () => {
        localStorage.removeItem("tt_selectedChild");
        setSelectedChild(null);
        setCheckPage("parent");
      },
      onLogout: logoutEverywhere,
    },

    parent: {
      parentName: parentDisplayName || "Parent",
      parentEmail: username || "",
      onLogout: logoutEverywhere,
      onSelectChild: (child) => {
        setSelectedChild(child);
        localStorage.setItem("tt_selectedChild", JSON.stringify(child));
        setCheckPage("child");
      },
    },
  };

  async function handleLoginSuccess(payload) {
    setUsername(payload.user.email);
    setShowLogin(false);
    setShowAccountPicker(true);
    setCheckPage("entry");

    // ✅ load name after login
    // (apiFetch uses token, so this should work)
    setTimeout(() => {
      loadParentDisplayNameFallback();
    }, 0);
  }

  // ✅ Boot auth
  useEffect(() => {
    async function bootAuth() {
      const saved = loadSession();

      if (!saved?.user?.email) {
        setIsBooting(false);
        return;
      }

      try {
        const res = await apiFetch("/api/me");

        if (!res.ok) {
          clearSession();
          setUsername("");
          setParentDisplayName("");
          setCheckPage("entry");
          setIsBooting(false);
          return;
        }

        setUsername(saved.user.email);

        const savedChildRaw = localStorage.getItem("tt_selectedChild");
        if (savedChildRaw) {
          try {
            setSelectedChild(JSON.parse(savedChildRaw));
          } catch (err) {
            console.error("Failed to parse saved child:", err);
          }
        }

        const last = localStorage.getItem("tt_lastPage");
        const safeLast = last && !["entry"].includes(last) ? last : "parent";

        if (safeLast === "child" && !savedChildRaw) {
          setCheckPage("parent");
        } else {
          setCheckPage(safeLast);
        }

        setIsBooting(false);
      } catch {
        clearSession();
        setUsername("");
        setParentDisplayName("");
        setCheckPage("entry");
        setIsBooting(false);
      }
    }

    bootAuth();
  }, [setCheckPage, setUsername]);

  // ✅ AFTER username is ready, load profile display name
  useEffect(() => {
    if (!username) return;
    loadParentDisplayNameFallback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);

  // remember last page
  useEffect(() => {
    if (isBooting) return;
    localStorage.setItem("tt_lastPage", checkPage);
  }, [checkPage, isBooting]);

  // load children for picker when picker opens
  useEffect(() => {
    if (!showAccountPicker) return;

    let alive = true;

    async function loadChildrenForPicker() {
      try {
        const res = await apiFetch("/api/children");
        const json = await res.json().catch(() => ({}));
        if (!alive) return;

        if (res.ok) {
          setChildrenList(json.children ?? []);
        } else {
          setChildrenList([]);
        }
      } catch {
        if (!alive) return;
        setChildrenList([]);
      }
    }

    loadChildrenForPicker();

    return () => {
      alive = false;
    };
  }, [showAccountPicker]);

  if (isBooting) {
    return <div style={{ padding: 24, opacity: 0.7 }}>Loading...</div>;
  }

  const showHeader = checkPage !== "entry";

  return (
    <main>
      {showHeader ? (
        <AppHeader
          onGoAbout={() => go("about")}
          onGoContact={() => go("contact")}
          onGoParent={checkPage !== "parent" ? () => go("parent") : undefined}
          onLogout={username ? logoutEverywhere : undefined}
        />
      ) : null}

      <Page {...(pageProps[checkPage] ?? {})} />

      {showLogin && (
        <LoginModal onClose={() => setShowLogin(false)} onLoginSuccess={handleLoginSuccess} />
      )}

      <AccountPickerModal
        open={showAccountPicker}
        parentName={`${parentDisplayName || "Parent"} (Parent)`}
        children={childrenList}
        onSelectParent={() => {
          setShowAccountPicker(false);
          setCheckPage("parent");
        }}
        onSelectChild={(child) => {
          setSelectedChild(child);
          localStorage.setItem("tt_selectedChild", JSON.stringify(child));
          setShowAccountPicker(false);
          setCheckPage("child");
        }}
        onClose={() => setShowAccountPicker(false)}
      />
    </main>
  );
}