export default function YourTales({ username, onLogout }) {
  return (
    <section className="min-h-screen p-8">
      <div className="mx-auto max-w-2xl rounded-2xl bg-white/70 p-6 border"
           style={{ borderColor: "var(--tt-divider)", color: "var(--tt-text-dark)" }}>
        <h1 className="text-2xl font-bold">YourTales (Test Page)</h1>

        <p className="mt-3">
          Welcome, <span className="font-semibold">{username || "Guest"}</span> 👋
        </p>

        <p className="mt-2 text-sm">
          This is a temporary page to confirm login navigation works.
        </p>

        <div className="mt-6">
          <button className="tt-secondary-btn" type="button" onClick={onLogout}>
            Logout (Back to Entry)
          </button>
        </div>
      </div>
    </section>
  );
}
