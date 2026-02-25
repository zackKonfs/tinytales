import express from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "../supabaseAdmin.js";

const router = express.Router();

function supabaseForRequest(req) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  // IMPORTANT: pass the user JWT so RLS applies correctly
  const token = (req.headers.authorization || "").replace("Bearer ", "");

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });
}

// GET /api/children
router.get("/children", requireAuth, async (req, res) => {
  try {
    const supabase = supabaseForRequest(req);

    const { data, error } = await supabase
      .from("children")
      .select("*")
      .eq("parent_user_id", req.user.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) return res.status(400).json({ error: error.message });

    res.json({ children: data });
  } catch (e) {
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/children
router.post("/children", requireAuth, async (req, res) => {
  try {
    const supabase = supabaseAdmin;

    const { name, date_of_birth, gender } = req.body;

    if (!name?.trim() || !date_of_birth || !gender) {
      return res.status(400).json({ error: "Missing required fields." });
    }

    const { data, error } = await supabase
      .from("children")
      .insert([
        {
          parent_user_id: req.user.id,
          name: name.trim(),
          date_of_birth,
          gender,
          is_active: true,
        },
      ])
      .select("id, name, date_of_birth, gender, created_at")
      .single();

    if (error) return res.status(400).json({ error: error.message });

    res.status(201).json({ child: data });
  } catch (e) {
    res.status(500).json({ error: "Server error" });
  }
});

router.patch("/children/:id/active", requireAuth, async (req, res) => {
    try {
        const supabase = supabaseAdmin;
        const childId = req.params.id;
        const parentId = req.user.id;
        const { is_active } = req.body;

        if (typeof is_active !== "boolean") {
            return res.status(400).json({ ok: false, message: "is_active must be boolean" });
        }

        const { data, error } = await supabase
            .from("children")
            .update({ is_active })
            .eq("id", childId)
            .eq("parent_user_id", parentId)
            .select("id,is_active");

        if (error) return res.status(400).json({ ok: false, message: error.message });
        if (!data || data.length === 0) {
            return res.status(404).json({ ok: false, message: "Child not found" });
        }

        return res.json({ ok: true, child: data[0] });
        } catch (e) {
            return res.status(500).json({ ok: false, message: "Server error" });
    }
});

export default router;