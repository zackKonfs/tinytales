import EnterPage from "../components/EnterPage";
import LoginModal from "../components/LoginModal";
import YourTales from "../components/YourTales";
import Devpanel from "../components/Devpanel";
import { loadSession, clearSession } from "../auth/session";
import { useEffect } from "react";
import { apiFetch } from "../api/client";


const PAGES = {
  entry: EnterPage,
  yourtales: YourTales,
};

export default function Main({ checkPage, setCheckPage, showLogin, setShowLogin, username, setUsername }) {
  const Page = PAGES[checkPage] ?? EnterPage;

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
  };

  function handleLoginSuccess(payload) {
    console.log("Logged in user:", payload);
    setUsername(payload.user.email);
    setShowLogin(false);
    setCheckPage("yourtales");
  }

  useEffect(() => {
    async function bootAuth() {
      const saved = loadSession();

      // No saved session → stay at entry
      if (!saved?.user?.email) return;

      try {
        // Ask backend to verify token
        const res = await apiFetch("/api/me");

        if (!res.ok) {
          // token invalid/expired
          clearSession();
          setUsername("");
          setCheckPage("entry");
          return;
        }

        // token valid → restore UI
        setUsername(saved.user.email);
        setCheckPage("yourtales");
      } catch (e) {
        // backend down / network error → treat as logged out
        clearSession();
        setUsername("");
        setCheckPage("entry");
      }
    }

    bootAuth();
  }, []);


  return (
    <main>
      <Page {...(pageProps[checkPage] ?? {})} />
      {showLogin && (
        <LoginModal
          onClose={() => setShowLogin(false)}
          onLoginSuccess={handleLoginSuccess}
        />
      )}
      {/* 🔧 DEV ONLY */}
      <Devpanel />
    </main>
  );
}
