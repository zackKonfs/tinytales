import EnterPage from "../components/EnterPage";
import LoginModal from "../components/LoginModal";
import YourTales from "../components/YourTales";
import AccountPickerModal from "../components/AccountPickerModal";
import ParentAccount from "../components/ParentAccount";
import { loadSession, clearSession } from "../auth/session";
import { useEffect, useState } from "react";
import { apiFetch } from "../api/client";
import ChildJournalPage from "../components/ChildJournalPage";

const PAGES = {
  entry: EnterPage,
  child: ChildJournalPage,
  parent: ParentAccount,
};

export default function Main({ checkPage, setCheckPage, showLogin, setShowLogin, username, setUsername }) {
  const Page = PAGES[checkPage] ?? EnterPage;
  const [showAccountPicker, setShowAccountPicker] = useState(false);
  const [isBooting, setIsBooting] = useState(true);
  const [selectedChild, setSelectedChild] = useState(null);
  const [childrenNames, setChildrenNames] = useState([]);
  const [childrenList, setChildrenList] = useState([]);

  const pageProps = {
    entry: { setLogin: () => setShowLogin(true) },
    child: {
      username,
      child: selectedChild,

      onGoParent: () => {
        localStorage.removeItem("tt_selectedChild");
        setSelectedChild(null);
        setCheckPage("parent");
      },

      onLogout: () => {
        clearSession();
        localStorage.removeItem("tt_selectedChild");
        setSelectedChild(null);
        setUsername("");
        setCheckPage("entry");
      },
    },
    parent: {
      parentName: "Zack",
      onLogout: () => {
        clearSession();
        setUsername("");
        setCheckPage("entry");
      },
      onCreateChild: () => console.log("create child clicked"),
      onSelectChild: (child) => {
        setSelectedChild(child);
        localStorage.setItem("tt_selectedChild", JSON.stringify(child));
        setCheckPage("child");
      },
    },
  };

  function handleLoginSuccess(payload) {
    console.log("Logged in user:", payload);
    setUsername(payload.user.email);
    setShowLogin(false);
    setShowAccountPicker(true);
    setCheckPage("entry");
  }

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
          const safeLast = last && last !== "entry" ? last : "parent";

          if (safeLast === "child" && !savedChildRaw) {
            setCheckPage("parent");
          } else {
            setCheckPage(safeLast);
        }

        setIsBooting(false);
      } catch {
        clearSession();
        setUsername("");
        setCheckPage("entry");
        setIsBooting(false);
      }
    }

    bootAuth();
  }, [setCheckPage, setUsername]);

  useEffect(() => {
    if (isBooting) return;
    localStorage.setItem("tt_lastPage", checkPage);
  }, [checkPage, isBooting]);

  useEffect(() => {
    if (!showAccountPicker) return;

    let alive = true;

    async function loadChildrenForPicker() {
      try {
        const res = await apiFetch("/api/children");
        const json = await res.json().catch(() => ({}));

        if (!alive) return;

        if (res.ok) {
          const children = json.children ?? [];

          setChildrenList(children);

          const names = children.map((c) => c.name);
          setChildrenNames(names);
        } else {
          setChildrenList([]);
          setChildrenNames([]);
        }
      } catch {
        if (!alive) return;
        setChildrenNames([]);
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

  return (
    <main>
      <Page {...(pageProps[checkPage] ?? {})} />
      {showLogin && (
        <LoginModal
          onClose={() => setShowLogin(false)}
          onLoginSuccess={handleLoginSuccess}
        />
      )}

      <AccountPickerModal
        open={showAccountPicker}
        parentName="Zack (Parent)"
        childrenNames={childrenNames}
        onSelectParent={() => {
          setShowAccountPicker(false);
          setCheckPage("parent");
        }}
        onSelectChild={(name) => {
          const child = (childrenList ?? []).find((c) => c.name === name) || { name };
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
