import "dotenv/config";
import express from "express";
import cors from "cors";

import authRoutes from "./routes/auth.js";
import meRoutes from "./routes/me.js";
import childrenRoutes from "./routes/children.js";
import avatarRoutes from "./routes/avatar.js";
import parentRoutes from "./routes/parent.js";
import entriesRoutes from "./routes/entries.js";
import devRoutes from "./routes/dev.js";

const app = express();
const PORT = process.env.PORT || 5000;
const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  process.env.FRONTEND_URL, // e.g. https://tinytales-peach.vercel.app
].filter(Boolean);

function isAllowedOrigin(origin) {
  if (allowedOrigins.includes(origin)) return true;

  // Allow all Vercel preview domains for this project (optional but practical)
  // e.g. https://tinytales-xxxxxx-zackxu.vercel.app
  if (/^https:\/\/tinytales-.*\.vercel\.app$/.test(origin)) return true;

  return false;
}

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (isAllowedOrigin(origin)) return cb(null, true);
      return cb(null, false); // don't throw (prevents noisy 500)
    },
    credentials: true,
  })
);
app.use(express.json());

// --- health / debug ---
app.get("/api/health", (req, res) => res.json({ ok: true, message: "Backend is running" }));
app.get("/api/ping", (req, res) => res.json({ ok: true, message: "backend reachable" }));
app.post("/api/echo", (req, res) => res.json({ youSent: req.body }));

// --- routes ---
app.use("/api/auth", authRoutes);
app.use("/api", meRoutes);
app.use("/api", childrenRoutes);
app.use("/api", avatarRoutes);
app.use("/api", parentRoutes);
app.use("/api/entries", entriesRoutes);
app.use("/api", devRoutes);

// --- 404 fallback (helps debugging) ---
app.use((err, req, res, next) => {
  if (err?.message?.startsWith("CORS")) {
    return res.status(403).json({ ok: false, message: err.message });
  }
  next(err);
});
app.use((req, res) => {
  res.status(404).json({ ok: false, message: "Route not found", path: req.originalUrl });
});

app.listen(PORT, () => {
  console.log(`Backend running at http://localhost:${PORT}`);
});