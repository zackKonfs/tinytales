import express from "express";
import { createClient } from "@supabase/supabase-js";
import { requireAuth } from "../middleware/requireAuth.js";

const router = express.Router();

function rls(req) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${req.accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// GET /api/children
router.get("/children", requireAuth, async (req, res) => {
  try {
    const sb = rls(req);

    const { data, error } = await sb
      .from("children")
      .select("id, name, date_of_birth, gender, created_at, is_active, avatar_path, parent_user_id")
      .eq("parent_user_id", req.user.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) return res.status(500).json({ ok: false, message: error.message });

    const children = (data ?? []).map((c) => {
      const avatar_url = c.avatar_path
        ? sb.storage.from("avatars").getPublicUrl(c.avatar_path).data.publicUrl
        : "";
      return { ...c, avatar_url };
    });

    return res.json({ ok: true, children });
  } catch {
    return res.status(500).json({ ok: false, message: "Server error" });
  }
});

// POST /api/children  ✅ allow any logged-in parent
router.post("/children", requireAuth, async (req, res) => {
  try {
    const sb = rls(req);

    const name = (req.body?.name ?? "").trim();
    const date_of_birth = req.body?.date_of_birth;
    const gender = req.body?.gender;

    if (!name || !date_of_birth || !gender) {
      return res.status(400).json({ ok: false, message: "Missing required fields." });
    }

    const { data, error } = await sb
      .from("children")
      .insert([
        {
          parent_user_id: req.user.id,
          name,
          date_of_birth,
          gender,
          is_active: true,
        },
      ])
      .select("id, name, date_of_birth, gender, created_at, is_active, avatar_path, parent_user_id")
      .single();

    if (error) return res.status(400).json({ ok: false, message: error.message });

    const avatar_url = data?.avatar_path
      ? sb.storage.from("avatars").getPublicUrl(data.avatar_path).data.publicUrl
      : "";

    return res.status(201).json({ ok: true, child: { ...data, avatar_url } });
  } catch {
    return res.status(500).json({ ok: false, message: "Server error" });
  }
});

// PATCH /api/children/:id/active ✅ allow any logged-in parent (but only their own rows)
router.patch("/children/:id/active", requireAuth, async (req, res) => {
  try {
    const sb = rls(req);

    const childId = Number(req.params.id);
    if (!Number.isFinite(childId)) {
      return res.status(400).json({ ok: false, message: "Invalid child id" });
    }

    const { is_active } = req.body || {};
    if (typeof is_active !== "boolean") {
      return res.status(400).json({ ok: false, message: "is_active must be boolean" });
    }

    const { data, error } = await sb
      .from("children")
      .update({ is_active })
      .eq("id", childId)
      .eq("parent_user_id", req.user.id)
      .select("id, is_active")
      .maybeSingle();

    if (error) return res.status(400).json({ ok: false, message: error.message });
    if (!data) return res.status(404).json({ ok: false, message: "Child not found" });

    return res.json({ ok: true, child: data });
  } catch {
    return res.status(500).json({ ok: false, message: "Server error" });
  }
});

// GET /api/children/:childId/profile
router.get("/children/:childId/profile", requireAuth, async (req, res) => {
  try {
    const childId = Number(req.params.childId);
    if (!Number.isFinite(childId)) {
      return res.status(400).json({ ok: false, message: "Invalid child id" });
    }

    const sb = rls(req);

    const { data: child, error } = await sb
      .from("children")
      .select("id, parent_user_id, name, date_of_birth, gender, avatar_path")
      .eq("id", childId)
      .maybeSingle();

    if (error) return res.status(500).json({ ok: false, message: error.message });
    if (!child) return res.status(404).json({ ok: false, message: "Child not found" });

    if (child.parent_user_id !== req.user.id) {
      return res.status(403).json({ ok: false, message: "Not your child" });
    }

    const avatar_url = child.avatar_path
      ? sb.storage.from("avatars").getPublicUrl(child.avatar_path).data.publicUrl
      : "";

    return res.json({
      ok: true,
      profile: {
        id: child.id,
        name: child.name || "",
        gender: child.gender || "",
        date_of_birth: child.date_of_birth || "",
        avatar_url,
      },
    });
  } catch (e) {
    console.error("GET /api/children failed:", e);
    return res.status(500).json({ ok: false, message: e?.message || "Server error" });
  }
});

// PATCH /api/children/:childId/profile
router.patch("/children/:childId/profile", requireAuth, async (req, res) => {
  try {
    const childId = Number(req.params.childId);
    if (!Number.isFinite(childId)) {
      return res.status(400).json({ ok: false, message: "Invalid child id" });
    }

    const sb = rls(req);
    const name = String(req.body?.name || "").trim();
    const gender = String(req.body?.gender || "").trim().toLowerCase();
    const date_of_birth = String(req.body?.date_of_birth || "").trim();

    if (!name) {
      return res.status(400).json({ ok: false, message: "Name is required" });
    }

    const allowedGenders = ["male", "female"];
    if (gender && !allowedGenders.includes(gender)) {
      return res.status(400).json({ ok: false, message: "Gender must be male or female" });
    }

    if (date_of_birth && !/^\d{4}-\d{2}-\d{2}$/.test(date_of_birth)) {
      return res.status(400).json({ ok: false, message: "date_of_birth must be YYYY-MM-DD" });
    }

    const { data, error } = await sb
      .from("children")
      .update({
        name,
        gender: gender || null,
        date_of_birth: date_of_birth || null,
      })
      .eq("id", childId)
      .eq("parent_user_id", req.user.id)
      .select("id, parent_user_id, name, date_of_birth, gender, created_at, is_active, avatar_path")
      .maybeSingle();

    if (error) return res.status(400).json({ ok: false, message: error.message });
    if (!data) return res.status(404).json({ ok: false, message: "Child not found" });

    const avatar_url = data.avatar_path
      ? sb.storage.from("avatars").getPublicUrl(data.avatar_path).data.publicUrl
      : "";

    return res.json({ ok: true, child: { ...data, avatar_url } });
  } catch (e) {
    return res.status(500).json({ ok: false, message: e?.message || "Server error" });
  }
});

export default router;
