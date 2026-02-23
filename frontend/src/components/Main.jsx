import EnterPage from "../components/EnterPage";
import LoginModal from "../components/LoginModal";
import YourTales from "../components/YourTales";
import AccountPickerModal from "../components/AccountPickerModal";
import ParentAccount from "../components/ParentAccount";
import { loadSession, clearSession } from "../auth/session";
import { useEffect, useState } from "react";
import { apiFetch } from "../api/client";


const PAGES = {
  entry: EnterPage,
  yourtales: YourTales,
  parent: ParentAccount,
};

export default function Main({ checkPage, setCheckPage, showLogin, setShowLogin, username, setUsername }) {
  const Page = PAGES[checkPage] ?? EnterPage;
  const [showAccountPicker, setShowAccountPicker] = useState(false);

  const pageProps = {
    entry: { setLogin: () => setShowLogin(true) },
      yourtales: {
        username,
        onLogout: () => {
        clearSession();
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
      onSelectChild: (child) => console.log("child selected:", child),
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

      if (!saved?.user?.email) return;

      try {
        const res = await apiFetch("/api/me");

        if (!res.ok) {
          clearSession();
          setUsername("");
          setCheckPage("entry");
          return;
        }

        setUsername(saved.user.email);
        setCheckPage("yourtales");
      } catch {
        clearSession();
        setUsername("");
        setCheckPage("entry");
      }
    }

    bootAuth();
  }, [setCheckPage, setUsername]);



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
        childrenNames={[]}
        onSelectParent={() => {
          setShowAccountPicker(false);
          setCheckPage("parent");
        }}
        onSelectChild={(name) => console.log("child clicked:", name)}
        onClose={() => setShowAccountPicker(false)}
      />
    </main>
  );
}
