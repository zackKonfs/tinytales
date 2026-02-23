import { useState } from "react";
import Main from "./components/Main";

export default function App() {
  const [checkPage, setCheckPage] = useState("entry");
  const [showLogin, setShowLogin] = useState(false);
  const [username, setUsername] = useState("");

  return (
    <Main
      checkPage={checkPage}
      setCheckPage={setCheckPage}
      showLogin={showLogin}
      setShowLogin={setShowLogin}
      username={username}
      setUsername={setUsername}
    />
  );
}
