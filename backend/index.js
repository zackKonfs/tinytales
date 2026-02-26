import "dotenv/config";
import express from "express";
import cors from "cors";

import authRoutes from "./routes/auth.js";
import meRoutes from "./routes/me.js";
import childrenRoutes from "./routes/children.js";
import avatarRoutes from "./routes/avatar.js";
import parentRoutes from "./routes/parent.js";
import entriesRoutes from "./routes/entries.js";

const app = express();
const PORT = process.env.PORT || 5000;

// --- middleware ---
app.use(
  cors({
    origin: "http://localhost:5173",
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

// --- 404 fallback (helps debugging) ---
app.use((req, res) => {
  res.status(404).json({ ok: false, message: "Route not found", path: req.originalUrl });
});

app.listen(PORT, () => {
  console.log(`Backend running at http://localhost:${PORT}`);
});