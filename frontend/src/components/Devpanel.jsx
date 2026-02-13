import { useEffect, useState } from "react";
import { apiFetch } from "../api/client";


export default function DevPanel() {
  const [health, setHealth] = useState(null);
  const [echoResult, setEchoResult] = useState(null);

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then(setHealth)
      .catch((e) => setHealth({ ok: false, message: String(e) }));
  }, []);

  async function testMe() {
    alert("Clicked testMe ✅");   // <-- add this first line

    try {
      const res = await apiFetch("/api/me");
      alert("Got response ✅ status=" + res.status);  // <-- add this

      const data = await res.json();
      alert(JSON.stringify(data, null, 2));
    } catch (e) {
      alert("Error: " + e.message);
    }
  }



  async function sendEcho() {
    const res = await fetch("/api/echo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project: "TinyTales", time: new Date().toISOString() }),
    });
    const data = await res.json();
    setEchoResult(data);
  }

  return (
    <div className="mt-6 space-y-3 rounded-lg border p-4">
      <h2 className="font-semibold">Dev Panel ✅ I AM THE RIGHT FILE</h2>


      <div>
        <div className="font-medium">Backend health</div>
        <pre className="text-sm">{health ? JSON.stringify(health, null, 2) : "Loading..."}</pre>
      </div>

      <div>
        <div className="font-medium">Echo test</div>
        <button className="px-3 py-2 rounded bg-black text-white" onClick={sendEcho}>
          Send POST /api/echo
        </button>
        <pre className="text-sm">{echoResult ? JSON.stringify(echoResult, null, 2) : "No response yet"}</pre>
      </div>

      <button
        type="button"
        onClick={testMe}
        className="px-3 py-2 rounded bg-green-600 text-white"
        style={{
          position: "fixed",
          bottom: 20,
          right: 20,
          zIndex: 99999,
        }}
      >
        Test /api/me
      </button>

    </div>
  );
}
