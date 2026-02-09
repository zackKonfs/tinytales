import EnterPage from "../components/EnterPage";
import LoginModal from "../components/LoginModal";
import YourTales from "../components/YourTales";
import Devpanel from "../components/Devpanel";
import { loadSession, clearSession } from "../auth/session";
import { useEffect } from "react";


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
    const saved = loadSession();

    if (saved?.user?.email) { // auto-login if session found
      setUsername(saved.user.email);
      setCheckPage("yourtales");
    }
  }, []); // [] to run only once on mount


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
