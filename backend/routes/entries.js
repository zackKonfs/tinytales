import express from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { supabase, supabaseAdmin } from "../supabaseClient.js";
const router = express.Router();

router.post("/", requireAuth, async (req, res) => {
  const { child_id, title, content, entry_date } = req.body || {};

  const childId = Number(child_id);
  if (!childId) return res.status(400).json({ ok: false, message: "Invalid child_id" });

  if (!title?.trim()) return res.status(400).json({ ok: false, message: "Title is required" });
  if (!content?.trim()) return res.status(400).json({ ok: false, message: "Content is required" });

  // default to today if not provided
  const safeDate =
    typeof entry_date === "string" && entry_date.length >= 10
      ? entry_date.slice(0, 10)
      : new Date().toISOString().slice(0, 10);

  // identify user from token
  const { data: userData, error: userErr } = await supabase.auth.getUser(req.accessToken);
  if (userErr || !userData?.user) {
    return res.status(401).json({ ok: false, message: "Invalid token" });
  }
  const userId = userData.user.id;

  console.log("DEBUG userId:", userId);
  console.log("DEBUG childId:", childId);

  // verify this child belongs to the logged-in parent
  const { data: childRow, error: childErr } = await supabase
    .from("children")
    .select("id")
    .eq("id", childId)
    .eq("parent_user_id", userId)
    .single();

  if (childErr || !childRow) {
    return res.status(403).json({ ok: false, message: "No access to this child" });
  }

  // insert entry
  const { data: inserted, error: insErr } = await supabase
    .from("entries")
    .insert([
      {
        child_id: childId,
        title: title.trim(),
        content: content.trim(),
        entry_date: safeDate,
        is_active: true,
      },
    ])
    .select("id, child_id, title, content, entry_date, created_at")
    .single();

  if (insErr) {
    return res.status(500).json({ ok: false, message: insErr.message });
  }

  return res.json({ ok: true, entry: inserted });
});

router.put("/:entryId", requireAuth, async (req, res) => {
  const entryId = Number(req.params.entryId);
  if (!entryId) return res.status(400).json({ ok: false, message: "Invalid entryId" });

  const { title, content, entry_date } = req.body || {};
  const t = (title ?? "").trim();
  const c = (content ?? "").trim();

  if (!t) return res.status(400).json({ ok: false, message: "Title is required" });
  if (!c) return res.status(400).json({ ok: false, message: "Content is required" });

  const safeDate =
    typeof entry_date === "string" && entry_date.length >= 10
      ? entry_date.slice(0, 10)
      : new Date().toISOString().slice(0, 10);

  // identify user from token
  const { data: userData, error: userErr } = await supabase.auth.getUser(req.accessToken);
  if (userErr || !userData?.user) {
    return res.status(401).json({ ok: false, message: "Invalid token" });
  }
  const userId = userData.user.id;

  // find entry first
  const { data: entryRow, error: entryErr } = await supabase
    .from("entries")
    .select("id, child_id")
    .eq("id", entryId)
    .single();

  if (entryErr || !entryRow) {
    return res.status(404).json({ ok: false, message: "Entry not found" });
  }

  // verify parent owns this child
  const { data: childRow, error: childErr } = await supabase
    .from("children")
    .select("id")
    .eq("id", entryRow.child_id)
    .eq("parent_user_id", userId)
    .single();

  if (childErr || !childRow) {
    return res.status(403).json({ ok: false, message: "No access to this child" });
  }

  // update
  const { data: updated, error: updErr } = await supabase
    .from("entries")
    .update({
      title: t,
      content: c,
      entry_date: safeDate,
    })
    .eq("id", entryId)
    .select("id, child_id, title, content, entry_date, created_at")
    .single();

  if (updErr) {
    return res.status(500).json({ ok: false, message: updErr.message });
  }

  return res.json({ ok: true, entry: updated });
});

router.get("/children/:id/entries", requireAuth, async (req, res) => {
  const childId = Number(req.params.id);
  if (!childId) return res.status(400).json({ ok: false, message: "Invalid child id" });

  const { data: userData, error: userErr } = await supabase.auth.getUser(req.accessToken);
  if (userErr || !userData?.user) {
    return res.status(401).json({ ok: false, message: "Invalid token" });
  }
  const userId = userData.user.id;

  const { data: childRow, error: childErr } = await supabase
    .from("children")
    .select("id")
    .eq("id", childId)
    .eq("parent_user_id", userId)
    .single();

  if (childErr || !childRow) {
    return res.status(403).json({ ok: false, message: "No access to this child" });
  }

  const { data: entries, error: entriesErr } = await supabase
    .from("entries")
    .select("id, title, content, entry_date, created_at")
    .eq("child_id", childId)
    .eq("is_active", true)
    .order("entry_date", { ascending: false });

  if (entriesErr) {
    return res.status(500).json({ ok: false, message: entriesErr.message });
  }

  return res.json({ ok: true, entries: entries ?? [] });
});

router.patch("/:entryId", requireAuth, async (req, res) => {
  const entryId = Number(req.params.entryId);
  if (!entryId) return res.status(400).json({ ok: false, message: "Invalid entry id" });

  const { title, content } = req.body || {};
  if (!title?.trim()) return res.status(400).json({ ok: false, message: "Title is required" });
  if (!content?.trim()) return res.status(400).json({ ok: false, message: "Content is required" });

  const { data: userData, error: userErr } = await supabase.auth.getUser(req.accessToken);
  if (userErr || !userData?.user) return res.status(401).json({ ok: false, message: "Invalid token" });
  const userId = userData.user.id;

  // get entry -> child_id
  const { data: entryRow, error: entryErr } = await supabase
    .from("entries")
    .select("id, child_id")
    .eq("id", entryId)
    .single();

  if (entryErr || !entryRow) return res.status(404).json({ ok: false, message: "Entry not found" });

  // verify the child belongs to this parent
  const { data: childRow, error: childErr } = await supabase
    .from("children")
    .select("id")
    .eq("id", entryRow.child_id)
    .eq("parent_user_id", userId)
    .single();

  if (childErr || !childRow) return res.status(403).json({ ok: false, message: "No access" });

  const { data: updated, error: upErr } = await supabase
    .from("entries")
    .update({ title: title.trim(), content: content.trim() })
    .eq("id", entryId)
    .select("id, child_id, title, content, entry_date, created_at")
    .single();

  if (upErr) return res.status(500).json({ ok: false, message: upErr.message });

  return res.json({ ok: true, entry: updated });
});

// Soft delete an entry (set is_active = false)
router.patch("/:entryId/deactivate", requireAuth, async (req, res) => {
  const entryId = Number(req.params.entryId);
  if (!Number.isFinite(entryId)) {
    return res.status(400).json({ ok: false, message: "Invalid entry id" });
  }

  // identify user
  const { data: userData, error: userErr } = await supabase.auth.getUser(req.accessToken);
  if (userErr || !userData?.user) {
    return res.status(401).json({ ok: false, message: "Invalid token" });
  }
  const userId = userData.user.id;

  // Load entry -> find child_id
  const { data: entryRow, error: entryErr } = await supabase
    .from("entries")
    .select("id, child_id")
    .eq("id", entryId)
    .single();

  if (entryErr || !entryRow) {
    return res.status(404).json({ ok: false, message: "Entry not found" });
  }

  // verify this entry belongs to a child owned by this parent
  const { data: childRow, error: childErr } = await supabase
    .from("children")
    .select("id")
    .eq("id", entryRow.child_id)
    .eq("parent_user_id", userId)
    .single();

  if (childErr || !childRow) {
    return res.status(403).json({ ok: false, message: "No access to this entry" });
  }

  if (!supabaseAdmin) {
    return res.status(500).json({
      ok: false,
      message: "supabaseAdmin is NOT configured (missing SUPABASE_SERVICE_ROLE_KEY)",
    });
  }

  // soft delete
  const { data: updated, error: updErr } = await supabaseAdmin
    .from("entries")
    .update({ is_active: false })
    .eq("id", entryId)
    .select("id, is_active")
    .single();

  if (updErr) {
    return res.status(500).json({ ok: false, message: updErr.message });
  }

  return res.json({ ok: true, entry: updated });
});

router.get("/:entryId/photos/can-upload", async (req, res) => {
  const entryId = Number(req.params.entryId);

  if (!Number.isFinite(entryId)) {
    return res.status(400).json({
      ok: false,
      reason: "invalid_entry_id",
    });
  }

  // next step: Supabase count check
  return res.json({ ok: true, note: "placeholder" });
});

export default router;
