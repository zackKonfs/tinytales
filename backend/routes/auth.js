import express from "express";
import { supabase, supabaseAdmin } from "../supabaseClient.js";

const router = express.Router();

/* =========================
   LOGIN
========================= */
router.post("/login", async (req, res) => {
  const { email, password } = req.body ?? {};
  const cleanEmail = String(email || "").trim().toLowerCase();

  if (!cleanEmail || !password) {
    return res.status(400).json({ ok: false, message: "Missing email/password" });
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: cleanEmail,
    password,
  });

  if (error) {
    return res.status(401).json({ ok: false, message: error.message });
  }

  return res.json({
    ok: true,
    user: { id: data.user.id, email: data.user.email },
    session: {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    },
  });
});

/* =========================
   REGISTER (ADMIN CREATE)
   - Email confirmation is bypassed via email_confirm: true
   - No session is returned by createUser (expected)
========================= */
router.post("/register", async (req, res) => {
  const { email, password, profile } = req.body ?? {};
  const cleanEmail = String(email || "").trim().toLowerCase();

  if (!cleanEmail || !password) {
    return res.status(400).json({ ok: false, message: "Missing email/password" });
  }

  if (!supabaseAdmin) {
    return res
      .status(500)
      .json({ ok: false, message: "Server misconfig: supabaseAdmin not available" });
  }

  // 1) Create user using admin API
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: cleanEmail,
    password,
    email_confirm: true,
  });

  if (error) {
    // Most common: "User already registered"
    return res.status(400).json({ ok: false, message: error.message });
  }

  const user = data?.user;
  if (!user?.id) {
    return res.status(500).json({ ok: false, message: "Failed to create user" });
  }

  // 2) Create/update parent profile row (optional)
  if (profile) {
    const { error: parentError } = await supabaseAdmin
      .from("parents")
      .upsert(
        {
          user_id: user.id,
          username: profile.username ?? null,
          date_of_birth: profile.date_of_birth ?? null,
          gender: profile.gender ?? null,
        },
        { onConflict: "user_id" }
      );

    if (parentError) {
      return res.status(400).json({ ok: false, message: parentError.message });
    }
  }

  // 3) Return success (no session here)
  return res.json({
    ok: true,
    message: "Registered",
    user: { id: user.id, email: user.email },
    session: null,
  });
});

/* =========================
   DEBUG
========================= */
router.get("/debug-admin-auth", async (req, res) => {
  if (!supabaseAdmin) {
    return res.status(500).json({ ok: false, message: "no supabaseAdmin" });
  }

  const { data, error } = await supabaseAdmin.auth.admin.listUsers({
    page: 1,
    perPage: 1,
  });

  return res.json({
    ok: !error,
    error: error?.message || null,
    sampleUserId: data?.users?.[0]?.id || null,
  });
});

export default router;