import { useEffect, useState } from "react";
import { saveSession } from "../auth/session";


export default function LoginModal({ onClose, onLoginSuccess }) {
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    // Basic validation
    if (!username.trim() || !password) {
      setError("Please enter username and password.");
      return;
    }

    // Register mode not wired yet (we keep your UI, but show message)
    if (mode === "register") {
      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
      setError("Register not connected yet. Please use Login first.");
      return;
    }

    // LOGIN via backend
    try {
      const res = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: username.trim(), // <-- for now we treat Username as Email
          password,
        }),
      });

      const data = await res.json();

      if (!data.ok) {
        setError(data.message || "Login failed.");
        return;
      }

      // ✅ Save tokens + user into localStorage
      saveSession({ user: data.user, session: data.session });

      // ✅ Tell parent component login is successful
      onLoginSuccess({ user: data.user });

    } catch (err) {
      setError(err.message || "Network error.");
    }
  }
  

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="
          relative z-10 w-[92%] max-w-md
          rounded-2xl
          bg-white/90
          p-6
          shadow-xl
          border
        "
        style={{
          borderColor: "var(--tt-divider)",
          color: "var(--tt-text-dark)",
          fontFamily: "Nunito, system-ui, sans-serif",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-wide">
            {mode === "login" ? "Welcome back" : "Create account"}
          </h2>

          <button
            onClick={onClose}
            className="rounded-md px-2 py-1 text-lg hover:bg-black/5"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-semibold mb-1">
              Username
            </label>
            <input
              className="
                w-full rounded-lg border
                px-3 py-2
                outline-none
                focus:ring-2
              "
              style={{
                borderColor: "var(--tt-divider)",
              }}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Password
            </label>
            <input
              type="password"
              className="
                w-full rounded-lg border
                px-3 py-2
                outline-none
                focus:ring-2
              "
              style={{
                borderColor: "var(--tt-divider)",
              }}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {mode === "register" && (
            <div>
              <label className="block text-sm font-semibold mb-1">
                Confirm password
              </label>
              <input
                type="password"
                className="
                  w-full rounded-lg border
                  px-3 py-2
                  outline-none
                  focus:ring-2
                "
                style={{
                  borderColor: "var(--tt-divider)",
                }}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

            {/* Primary CTA */}
            <button
            type="submit"
            className="tt-cta-btn w-full"
            >
            {mode === "login" ? "LOGIN" : "REGISTER"}
            </button>

            {/* Switch mode */}
            <div className="text-center text-sm mt-3">
            {mode === "login" ? (
                <>
                No account?{" "}
                <button
                    type="button"
                    className="font-semibold underline text-[var(--tt-text-dark)]"
                    onClick={() => setMode("register")}
                >
                    Register
                </button>
                </>
            ) : (
                <>
                Already have an account?{" "}
                <button
                    type="button"
                    className="font-semibold underline text-[var(--tt-text-dark)]"
                    onClick={() => setMode("login")}
                >
                    Login
                </button>
                </>
            )}
            </div>
        </form>
      </div>
    </div>
  );
}
