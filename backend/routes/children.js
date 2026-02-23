import express from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { createClient } from "@supabase/supabase-js";

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
      .select("id, name, date_of_birth, gender, created_at")
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
    console.log("req.user:", req.user);
    console.log("POST /api/children body:", req.body);
    console.log("POST /api/children user:", req.user?.id);
    const supabase = supabaseForRequest(req);

    const { name, date_of_birth, gender } = req.body;

    if (!name?.trim() || !date_of_birth || !gender) {
      return res.status(400).json({ error: "Missing required fields." });
    }

    // parent_user_id should be set by you OR via RLS default.
    // We'll set it explicitly.
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

export default router;