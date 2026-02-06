import "dotenv/config";
import express from 'express';
import cors from "cors";
import entriesRoutes from "./routes/entries.js";
import authRoutes from "./routes/auth.js";


const app = express();
const PORT = process.env.PORT || 5000; // Use environment variable or default to 5000

app.use(cors({origin: "http://localhost:5173"})); // Vite frontend dev server
app.use(express.json()); // Middleware to parse JSON bodies
app.use("/api/auth", authRoutes); // Use auth routes for /api/auth

app.get("/api/health", (req, res) => {
  res.json({ ok: true, message: "Backend is running" });
}); // Health check endpoint

app.get("/api/ping", (req, res) => {
  res.json({ ok: true, message: "backend reachable" });
}); // Simple ping endpoint

app.post("/api/echo", (req, res) => {
  res.json({ youSent: req.body });
}); // Echo endpoint to return received JSON

app.use("/api/entries", entriesRoutes); // Use entries routes for /api/entries

app.listen(PORT, () => {
  console.log(`Backend running at http://localhost:${PORT}`);
  //console.log("SUPABASE_URL loaded?", Boolean(process.env.SUPABASE_URL));
}); // Start the server
