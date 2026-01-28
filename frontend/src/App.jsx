import { useState } from "react";
import Main from "./components/Main";
import DevPanel from "./components/DevPanel";

export default function App() {
  const [checkPage, setCheckPage] = useState("entry");
  const [showLogin, setShowLogin] = useState(false);
  const [username, setUsername] = useState("");

  return (
    <div>
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
