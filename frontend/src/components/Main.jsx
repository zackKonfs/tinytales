import EnterPage from "../components/EnterPage";
import LoginModal from "../components/LoginModal";
import YourTales from "../components/YourTales";

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

  function handleLoginSuccess(user) {
    console.log("Logged in user:", user);
    setUsername(user.username);
    setShowLogin(false);
    setCheckPage("yourtales"); // ✅ This is the navigation

    // Later, go to YourTales:
    // setCheckPage("yourtales");
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
    </main>
  );
}
