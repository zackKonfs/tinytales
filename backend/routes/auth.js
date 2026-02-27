import express from "express";
import { supabase, supabaseAdmin } from "../supabaseClient.js";

const router = express.Router();

router.post("/login", async (req, res) => {
  const { email, password } = req.body ?? {};

  if (!email || !password) {
    return res.status(400).json({ ok: false, message: "Missing email/password" });
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

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

router.post("/register", async (req, res) => {
  const { email, password, profile } = req.body ?? {};

  if (!email || !password) {
    return res.status(400).json({ ok: false, message: "Missing email/password" });
  }
  if (!supabaseAdmin) {
    return res.status(500).json({ ok: false, message: "Server misconfig: supabaseAdmin not available" });
  }

  // 1) Attempt signup (may not create a new user if email already exists)
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    return res.status(400).json({ ok: false, message: error.message });
  }

  // 2) Determine the real user id safely
  let user = data?.user ?? null;

  // If signUp returns a user, double-check admin can see it
  if (user?.id) {
    const { data: adminUser, error: adminUserErr } =
      await supabaseAdmin.auth.admin.getUserById(user.id);

    if (adminUserErr || !adminUser?.user) {
      user = null; // treat as unreliable / not created
    }
  }

  // If no reliable user, check if email already exists
  if (!user) {
    const { data: usersData, error: listErr } =
      await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });

    if (listErr) {
      return res.status(500).json({ ok: false, message: listErr.message });
    }

    const existing = (usersData?.users || []).find(
      (u) => (u.email || "").toLowerCase() === String(email).toLowerCase()
    );

    if (existing) {
      return res.status(409).json({
        ok: false,
        code: "EMAIL_EXISTS",
        message: "Email already registered. Please login instead.",
      });
    }

    return res.status(500).json({
      ok: false,
      message: "Signup did not return a valid user. Please try again.",
    });
  }

  // 3) Write parent profile using admin (bypass RLS)
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

  return res.json({
    ok: true,
    user: { id: user.id, email: user.email },
    session: data?.session
      ? {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        }
      : null,
  });
});

router.get("/debug-admin-auth", async (req, res) => {
  if (!supabaseAdmin) {
    return res.status(500).json({ ok: false, message: "no supabaseAdmin" });
  }

  const { data, error } =
    await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1 });

  return res.json({
    ok: !error,
    error: error?.message || null,
    sampleUserId: data?.users?.[0]?.id || null,
  });
});


export default router;