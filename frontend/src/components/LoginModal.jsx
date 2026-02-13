import { useEffect, useState } from "react";
import { saveSession } from "../auth/session";
import { apiFetch, register } from "../api/client";


export default function LoginModal({ onClose, onLoginSuccess }) {
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [displayName, setDisplayName] = useState(""); // parent username (not email)
  const [dob, setDob] = useState(""); // "YYYY-MM-DD"
  const [gender, setGender] = useState("");
  const [error, setError] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);

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

    // REGISTER via backend
    if (mode === "register") {
      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }

      try {
        await register(username.trim(), password, {
          username: displayName.trim(),
          date_of_birth: dob,
          gender,
        });

        setShowSuccessModal(true);
        return;

      } catch (err) {
        setError(err.message || "Registration failed.");
        return;
      }
    }

    // LOGIN via backend
    try {
        const res = await apiFetch("/api/auth/login", {
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
              Email
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
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                className="w-full rounded-lg border px-3 py-2 pr-10 outline-none focus:ring-2"
                style={{ borderColor: "var(--tt-divider)" }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute inset-y-0 right-2 flex items-center justify-center"
              >
                {showPassword ? "🙈" : "👁"}
              </button>
            </div>
          </div>

          {mode === "register" && (
            <div>
              <label className="block text-sm font-semibold mb-1">
                Confirm password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  className="w-full rounded-lg border px-3 py-2 pr-10 outline-none focus:ring-2"
                  style={{ borderColor: "var(--tt-divider)" }}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />

                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-2 flex items-center justify-center"
                >
                  {showConfirmPassword ? "🙈" : "👁"}
                </button>
              </div>
            </div>
          )}

          {mode === "register" && (
            <>
              <div>
                <label className="block text-sm font-semibold mb-1">Profile Name</label>
                <input
                  className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2"
                  style={{ borderColor: "var(--tt-divider)" }}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">Date of birth</label>
                <input
                  type="date"
                  className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2"
                  style={{ borderColor: "var(--tt-divider)" }}
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">Gender</label>
                <select
                  className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2"
                  style={{ borderColor: "var(--tt-divider)" }}
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                >
                  <option value="">Select...</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                  <option value="prefer_not_say">Prefer not to say</option>
                </select>
              </div>
            </>
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

      {showSuccessModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" />

          <div className="relative z-10 bg-white rounded-xl p-6 w-[90%] max-w-sm shadow-xl text-center">
            <p className="text-lg font-semibold mb-4">
              Registered successfully!
            </p>
            <p className="text-sm mb-6">
              Please check your email to confirm your account.
            </p>

            <button
              className="tt-cta-btn w-full"
              onClick={() => {
                setShowSuccessModal(false);

                // go back to Login view inside the modal
                setMode("login");

                // optional: keep email filled so user can login quickly
                // setUsername(email);

                // clear passwords
                setPassword("");
                setConfirmPassword("");
              }}
            >
              OK
            </button>


          </div>
        </div>
      )}
    </div>
  );
}
