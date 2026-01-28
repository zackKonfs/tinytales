import { useEffect, useState } from "react";

export default function DevPanel() {
  const [health, setHealth] = useState(null);
  const [echoResult, setEchoResult] = useState(null);

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then(setHealth)
      .catch((e) => setHealth({ ok: false, message: String(e) }));
  }, []);

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
      <h2 className="font-semibold">Dev Panel</h2>

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
    </div>
  );
}
