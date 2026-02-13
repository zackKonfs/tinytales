import express from "express";
import { supabase } from "../supabaseClient.js";

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

  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    return res.status(400).json({ ok: false, message: error.message });
  }

  // Insert into parents table (store profile details)
  // Note: data.user can exist even if email confirmation is ON
  if (data.user && profile) {
    const { error: parentError } = await supabase
      .from("parents")
      .upsert(
        {
          user_id: data.user.id,
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

  // IMPORTANT: data.session may be null if email confirmation is ON
  return res.json({
    ok: true,
    user: data.user ? { id: data.user.id, email: data.user.email } : null,
    session: data.session
      ? {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        }
      : null,
  });
});


export default router;