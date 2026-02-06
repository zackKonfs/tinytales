import express from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { supabase } from "../supabaseClient.js"; // adjust if your filename differs

const router = express.Router();

router.get("/me", requireAuth, async (req, res) => {
  const { data, error } = await supabase.auth.getUser(req.accessToken);

  if (error) {
    return res.status(401).json({ ok: false, message: error.message });
  }

  return res.json({
    ok: true,
    user: {
      id: data.user.id,
      email: data.user.email,
    },
  });
});

export default router;
