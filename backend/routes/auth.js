import express from "express";
import { createClient } from "@supabase/supabase-js";

const router = express.Router();

// Supabase client (server-side)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// POST /api/auth/login
router.post("/login", async (req, res) => {
  const { email, password } = req.body ?? {};

  if (!email || !password) {
    return res.status(400).json({ ok: false, message: "Missing email/password" });
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return res.status(401).json({ ok: false, message: error.message });
  }

  // Return only what we need for now (safe + small)
  return res.json({
    ok: true,
    user: {
      id: data.user.id,
      email: data.user.email,
    },
    session: {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    },
  });
});

export default router;
