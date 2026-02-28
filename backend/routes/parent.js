import express from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { supabaseForReq } from "../supabaseRequest.js";

const router = express.Router();

router.get("/parent/profile", requireAuth, async (req, res) => {
  const supabase = supabaseForReq(req);

  const { data, error } = await supabase
    .from("parents")
    .select("avatar_path, username")
    .eq("user_id", req.user.id)
    .maybeSingle();

  if (error) return res.status(400).json({ ok: false, error: error.message });

  let avatar_url = "";
  if (data?.avatar_path) {
    avatar_url = supabase.storage.from("avatars").getPublicUrl(data.avatar_path).data.publicUrl;
  }

  return res.json({
    ok: true,
    profile: {
      avatar_path: data?.avatar_path || null,
      username: data?.username || "",
      avatar_url,
    },
  });
});

export default router;