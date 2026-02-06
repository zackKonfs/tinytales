import "dotenv/config";
import express from 'express';
import cors from 'cors';
import entriesRoutes from "./routes/entries.js";

const app = express();
const PORT = process.env.PORT || 5000; // Use environment variable or default to 5000

app.use(cors()); // Enable CORS for all routes
app.use(express.json()); // Middleware to parse JSON bodies

app.get("/api/health", (req, res) => {
  res.json({ ok: true, message: "Backend is running" });
}); // Health check endpoint

app.post("/api/echo", (req, res) => {
  res.json({ youSent: req.body });
}); // Echo endpoint to return received JSON

app.use("/api/entries", entriesRoutes); // Use entries routes for /api/entries

app.listen(PORT, () => {
  console.log(`Backend running at http://localhost:${PORT}`);
  //console.log("SUPABASE_URL loaded?", Boolean(process.env.SUPABASE_URL));
}); // Start the server
