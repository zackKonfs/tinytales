import { useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Main from "./components/Main";
import DevPanel from "./components/Devpanel";

export default function App() {
  const [checkPage, setCheckPage] = useState("entry");
  const [showLogin, setShowLogin] = useState(false);
  const [username, setUsername] = useState("");

  return (
    <BrowserRouter>
      <Routes>
        {/* Main App */}
        <Route
          path="/*"
          element={
            <Main
              checkPage={checkPage}
              setCheckPage={setCheckPage}
              showLogin={showLogin}
              setShowLogin={setShowLogin}
              username={username}
              setUsername={setUsername}
            />
          }
        />

        {/* Dev Panel */}
        <Route
          path="/dev"
          element={<DevPanel username={username} />}
        />
      </Routes>
    </BrowserRouter>
  );
}