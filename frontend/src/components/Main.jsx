import EnterPage from "../components/EnterPage";
import LoginModal from "../components/LoginModal";
import YourTales from "../components/YourTales";
import Devpanel from "../components/Devpanel";


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
        setUsername("");
        setCheckPage("entry");
      },
    },
  };

  function handleLoginSuccess(payload) {
    console.log("Logged in user:", payload);
    setUsername(payload.user.username);
    setShowLogin(false);
    setCheckPage("yourtales");
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
      {/* 🔧 DEV ONLY */}
      <Devpanel />
    </main>
  );
}
