import express from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { supabaseForReq } from "../supabaseRequest.js";

const router = express.Router();

router.get("/parent/profile", requireAuth, async (req, res) => {
  const supabase = supabaseForReq(req);

  const { data, error } = await supabase
    .from("parents")
    .select("avatar_path, username, gender, date_of_birth")
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
      gender: data?.gender || "",
      date_of_birth: data?.date_of_birth || "",
      avatar_url,
    },
  });
});

router.patch("/parent/profile", requireAuth, async (req, res) => {
  try {
    const supabase = supabaseForReq(req);
    const { username, gender, date_of_birth } = req.body ?? {};

    const nextUsername = String(username || "").trim();
    const nextGender = String(gender || "").trim().toLowerCase();
    const nextDob = String(date_of_birth || "").trim();

    if (!nextUsername) {
      return res.status(400).json({ ok: false, error: "Username is required" });
    }

    const allowedGenders = ["male", "female"];
    if (nextGender && !allowedGenders.includes(nextGender)) {
      return res.status(400).json({ ok: false, error: "Gender must be male or female" });
    }

    if (nextDob && !/^\d{4}-\d{2}-\d{2}$/.test(nextDob)) {
      return res.status(400).json({ ok: false, error: "date_of_birth must be YYYY-MM-DD" });
    }

    const payload = {
      user_id: req.user.id,
      username: nextUsername,
      gender: nextGender || null,
      date_of_birth: nextDob || null,
    };

    const { data, error } = await supabase
      .from("parents")
      .upsert(payload, { onConflict: "user_id" })
      .select("avatar_path, username, gender, date_of_birth")
      .single();

    if (error) {
      return res.status(400).json({ ok: false, error: error.message });
    }

    const avatarPath = data?.avatar_path || null;
    const avatarUrl = avatarPath ? supabase.storage.from("avatars").getPublicUrl(avatarPath).data.publicUrl : "";

    return res.json({
      ok: true,
      profile: {
        avatar_path: avatarPath,
        avatar_url: avatarUrl,
        username: data?.username || "",
        gender: data?.gender || "",
        date_of_birth: data?.date_of_birth || "",
      },
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

export default router;
