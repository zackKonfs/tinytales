import { useState, useEffect } from "react";
import { supabase } from "./lib/supabaseClient";
import Main from "./components/Main";
import DevPanel from "./components/DevPanel";

export default function App() {
  const [checkPage, setCheckPage] = useState("entry");
  const [showLogin, setShowLogin] = useState(false);
  const [username, setUsername] = useState("");
  const [supabaseStatus, setSupabaseStatus] = useState("checking...");
  const [authStatus, setAuthStatus] = useState("checking auth...");
  const [loginMsg, setLoginMsg] = useState("");
  const [backendStatus, setBackendStatus] = useState("checking backend...");


  useEffect(() => {
    // Check backend connectivity
    fetch("http://localhost:5000/api/ping")
    .then((res) => res.json())
    .then((data) => setBackendStatus("✅ " + data.message))
    .catch(() => setBackendStatus("❌ backend not reachable"));

    // 1) set status on first load
    supabase.auth.getSession().then(({ data }) => {
        setAuthStatus(data.session ? "Logged in" : "Not logged in");
      });

    // 2) keep status updated whenever auth changes
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthStatus(session ? "Logged in" : "Not logged in");
    });

    // 3) cleanup when component unmounts
    return () => {
        listener.subscription.unsubscribe();
      };
    }, []);

const loginTestUser = async () => {
  setLoginMsg("Logging in via backend...");

  try {
      const res = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "test3@tinytales.com",
          password: "12345",
        }),
      });

      const data = await res.json();

      if (!data.ok) {
        setLoginMsg("❌ " + data.message);
        return;
      }

      setLoginMsg("✅ Logged in: " + data.user.email);
    } catch (e) {
      setLoginMsg("❌ " + e.message);
    }
  };




  return (
    <div>
      {/* ✅ visible status */}
      <div style={{ padding: 8, fontSize: 12 }}>{supabaseStatus}</div>
      <button onClick={loginTestUser} style={{ margin: 8 }}>
        Login test user
      </button>
      <div style={{ padding: 8, fontSize: 12 }}>{loginMsg}</div>
      <div style={{ padding: 8, fontSize: 12 }}>{backendStatus}</div>


      <Main
        checkPage={checkPage}
        setCheckPage={setCheckPage}
        showLogin={showLogin}
        setShowLogin={setShowLogin}
        username={username}
        setUsername={setUsername}
      />
      {/* <div className="px-6">
        <DevPanel />
      </div> */}
    </div>
  );
}
