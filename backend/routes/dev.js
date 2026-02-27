import express from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { supabaseAdmin } from "../supabaseClient.js";

const router = express.Router();

const ADMIN_EMAIL = "zack.xu@hotmail.com";

function mustAdmin(res) {
  if (!supabaseAdmin) {
    res
      .status(500)
      .json({ ok: false, message: "supabaseAdmin missing (SERVICE ROLE KEY not set)" });
    return false;
  }
  return true;
}

// GET /api/dev/children?include_inactive=1
router.get("/dev/children", requireAuth, async (req, res) => {
  try {
    if (!mustAdmin(res)) return;

    if (req.user?.email !== ADMIN_EMAIL) {
      return res.status(403).json({ ok: false, message: "Forbidden" });
    }

    const includeInactive = String(req.query.include_inactive || "0") === "1";

    let q = supabaseAdmin
      .from("children")
      .select("id, parent_user_id, name, date_of_birth, gender, created_at, is_active, avatar_path")
      .order("created_at", { ascending: false });

    if (!includeInactive) q = q.eq("is_active", true);

    const { data, error } = await q;
    if (error) return res.status(400).json({ ok: false, message: error.message });

    return res.json({ ok: true, children: data ?? [] });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Server error" });
  }
});

export default router;