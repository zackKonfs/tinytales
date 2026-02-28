import express from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { supabaseAdmin } from "../supabaseClient.js";

const router = express.Router();

const ADMIN_EMAIL = "zack.xu@hotmail.com";

function mustAdmin(res) {
  if (!supabaseAdmin) {
    res.status(500).json({
      ok: false,
      message: "supabaseAdmin missing (SERVICE ROLE KEY not set)",
    });
    return false;
  }
  return true;
}

function isForbidden(req, res) {
  if (req.user?.email !== ADMIN_EMAIL) {
    res.status(403).json({ ok: false, message: "Forbidden" });
    return true;
  }
  return false;
}

// GET /api/dev/children?include_inactive=1
router.get("/dev/children", requireAuth, async (req, res) => {
  try {
    if (!mustAdmin(res)) return;
    if (isForbidden(req, res)) return;

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

// PATCH /api/dev/children/:childId  { is_active: true/false }
router.patch("/dev/children/:childId", requireAuth, async (req, res) => {
  try {
    if (!mustAdmin(res)) return;
    if (isForbidden(req, res)) return;

    const childId = Number(req.params.childId);
    if (!childId) {
      return res.status(400).json({ ok: false, message: "Invalid childId" });
    }

    const { is_active } = req.body || {};
    if (typeof is_active !== "boolean") {
      return res.status(400).json({ ok: false, message: "is_active must be boolean" });
    }

    const { data, error } = await supabaseAdmin
      .from("children")
      .update({ is_active })
      .eq("id", childId)
      .select("id, parent_user_id, name, date_of_birth, gender, created_at, is_active, avatar_path")
      .single();

    if (error) return res.status(400).json({ ok: false, message: error.message });

    return res.json({ ok: true, child: data });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Server error" });
  }
});

// GET /api/dev/children/:childId/entries
router.get("/dev/children/:childId/entries", requireAuth, async (req, res) => {
  try {
    if (!mustAdmin(res)) return;
    if (isForbidden(req, res)) return;

    const childId = Number(req.params.childId);
    if (!childId) {
      return res.status(400).json({ ok: false, message: "Invalid childId" });
    }

    const { data, error } = await supabaseAdmin
      .from("entries")
      .select("id, child_id, entry_date, is_active, photo_paths, created_at")
      .eq("child_id", childId)
      .order("created_at", { ascending: false });

    if (error) return res.status(400).json({ ok: false, message: error.message });

    return res.json({ ok: true, entries: data ?? [] });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Server error" });
  }
});

// GET /api/dev/parents
router.get("/dev/parents", requireAuth, async (req, res) => {
  try {
    if (!mustAdmin(res)) return;
    if (isForbidden(req, res)) return;

    const { data, error } = await supabaseAdmin
      .from("parents")
      .select("user_id, username, date_of_birth, gender, created_at, avatar_path")
      .order("created_at", { ascending: false });

    if (error) return res.status(400).json({ ok: false, message: error.message });

    // Try to attach email from auth.users (best-effort)
    const userIds = (data ?? []).map((p) => p.user_id).filter(Boolean);
    let emailById = {};

    // supabase-js supports querying auth.users via:
    // supabaseAdmin.from("auth.users") if you have access on your project
    // If it fails, we still return without emails.
    if (userIds.length > 0) {
      const { data: authUsers, error: authErr } = await supabaseAdmin
        .from("auth.users")
        .select("id, email")
        .in("id", userIds);

      if (!authErr && authUsers) {
        for (const u of authUsers) emailById[u.id] = u.email;
      }
    }

    const parents = (data ?? []).map((p) => ({
      id: p.user_id,
      email: emailById[p.user_id] || null,
      username: p.username,
      date_of_birth: p.date_of_birth,
      gender: p.gender,
      created_at: p.created_at,
      avatar_path: p.avatar_path,
    }));

    return res.json({ ok: true, parents });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Server error" });
  }
});

// DELETE /api/dev/parents/:parentId
router.delete("/dev/parents/:parentId", requireAuth, async (req, res) => {
  try {
    if (!mustAdmin(res)) return;
    if (isForbidden(req, res)) return;

    const parentId = String(req.params.parentId || "").trim();
    if (!parentId) {
      return res.status(400).json({ ok: false, message: "Invalid parentId" });
    }

    const { data: existingParent, error: parentLookupErr } = await supabaseAdmin
      .from("parents")
      .select("user_id")
      .eq("user_id", parentId)
      .maybeSingle();

    if (parentLookupErr) {
      return res.status(400).json({ ok: false, message: parentLookupErr.message });
    }

    if (!existingParent?.user_id) {
      return res.status(404).json({ ok: false, message: "Parent not found" });
    }

    const { data: children, error: childrenErr } = await supabaseAdmin
      .from("children")
      .select("id")
      .eq("parent_user_id", parentId);

    if (childrenErr) {
      return res.status(400).json({ ok: false, message: childrenErr.message });
    }

    const childIds = (children ?? []).map((c) => Number(c.id)).filter(Boolean);

    if (childIds.length > 0) {
      const { error: entriesDeleteErr } = await supabaseAdmin
        .from("entries")
        .delete()
        .in("child_id", childIds);

      if (entriesDeleteErr) {
        return res.status(400).json({ ok: false, message: entriesDeleteErr.message });
      }

      const { error: childrenDeleteErr } = await supabaseAdmin
        .from("children")
        .delete()
        .eq("parent_user_id", parentId);

      if (childrenDeleteErr) {
        return res.status(400).json({ ok: false, message: childrenDeleteErr.message });
      }
    }

    const { error: parentDeleteErr } = await supabaseAdmin.from("parents").delete().eq("user_id", parentId);
    if (parentDeleteErr) {
      return res.status(400).json({ ok: false, message: parentDeleteErr.message });
    }

    const { error: authDeleteErr } = await supabaseAdmin.auth.admin.deleteUser(parentId);
    if (authDeleteErr) {
      return res.status(400).json({ ok: false, message: authDeleteErr.message });
    }

    return res.json({ ok: true, deleted_parent_id: parentId });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Server error" });
  }
});

export default router;
