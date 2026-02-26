import express from "express";
import multer from "multer";
import { createClient } from "@supabase/supabase-js";
import { requireAuth } from "../middleware/requireAuth.js";
import { supabase, supabaseAdmin } from "../supabaseClient.js";

const router = express.Router();

// ---------- helpers ----------
function rls(req) {
  // Use the verified token set by requireAuth
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${req.accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function mustAdmin(res) {
  if (!supabaseAdmin) {
    res.status(500).json({ ok: false, message: "supabaseAdmin missing (SERVICE ROLE KEY not set)" });
    return false;
  }
  return true;
}

function safeDate(entry_date) {
  return typeof entry_date === "string" && entry_date.length >= 10
    ? entry_date.slice(0, 10)
    : new Date().toISOString().slice(0, 10);
}

async function requireChildOwned(req, childId) {
  const sb = rls(req);
  const userId = req.user.id;

  const { data, error } = await sb
    .from("children")
    .select("id")
    .eq("id", childId)
    .eq("parent_user_id", userId)
    .maybeSingle();

  if (error) return { ok: false, status: 500, message: error.message };
  if (!data) return { ok: false, status: 403, message: "No access to this child" };

  return { ok: true };
}

async function requireEntryOwned(req, entryId) {
  const sb = rls(req);
  const userId = req.user.id;

  const { data: entryRow, error: entryErr } = await sb
    .from("entries")
    .select("id, child_id, photo_paths")
    .eq("id", entryId)
    .maybeSingle();

  if (entryErr) return { ok: false, status: 500, message: entryErr.message };
  if (!entryRow) return { ok: false, status: 404, message: "Entry not found" };

  const { data: childRow, error: childErr } = await sb
    .from("children")
    .select("id")
    .eq("id", entryRow.child_id)
    .eq("parent_user_id", userId)
    .maybeSingle();

  if (childErr) return { ok: false, status: 500, message: childErr.message };
  if (!childRow) return { ok: false, status: 403, message: "No access to this entry" };

  return { ok: true, entryRow };
}

// ---------- ping ----------
router.get("/_ping", (req, res) => res.json({ ok: true, from: "entries.js" }));
router.get("/__ping", (req, res) => res.json({ ok: true, from: "entries.js" }));

// ---------- multer ----------
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 1.5 * 1024 * 1024 }, // 1.5MB
});

// ---------- routes ----------

// Create entry
router.post("/", requireAuth, async (req, res) => {
  const { child_id, title, content, entry_date } = req.body || {};

  const childId = Number(child_id);
  if (!childId) return res.status(400).json({ ok: false, message: "Invalid child_id" });

  const t = (title ?? "").trim();
  const c = (content ?? "").trim();
  if (!t) return res.status(400).json({ ok: false, message: "Title is required" });
  if (!c) return res.status(400).json({ ok: false, message: "Content is required" });

  // ownership check
  const own = await requireChildOwned(req, childId);
  if (!own.ok) return res.status(own.status).json({ ok: false, message: own.message });

  const { data: inserted, error: insErr } = await supabase
    .from("entries")
    .insert([
      {
        child_id: childId,
        title: t,
        content: c,
        entry_date: safeDate(entry_date),
        is_active: true,
      },
    ])
    .select("id, child_id, title, content, entry_date, created_at, photo_paths")
    .single();

  if (insErr) return res.status(500).json({ ok: false, message: insErr.message });
  return res.json({ ok: true, entry: inserted });
});

// Update entry (full update used by frontend)
router.put("/:entryId", requireAuth, async (req, res) => {
  const entryId = Number(req.params.entryId);
  if (!entryId) return res.status(400).json({ ok: false, message: "Invalid entryId" });

  const { title, content, entry_date } = req.body || {};
  const t = (title ?? "").trim();
  const c = (content ?? "").trim();
  if (!t) return res.status(400).json({ ok: false, message: "Title is required" });
  if (!c) return res.status(400).json({ ok: false, message: "Content is required" });

  const own = await requireEntryOwned(req, entryId);
  if (!own.ok) return res.status(own.status).json({ ok: false, message: own.message });

  const { data: updated, error: updErr } = await supabase
    .from("entries")
    .update({ title: t, content: c, entry_date: safeDate(entry_date) })
    .eq("id", entryId)
    .select("id, child_id, title, content, entry_date, created_at, photo_paths")
    .single();

  if (updErr) return res.status(500).json({ ok: false, message: updErr.message });
  return res.json({ ok: true, entry: updated });
});

// Optional partial update (kept for compatibility)
router.patch("/:entryId", requireAuth, async (req, res) => {
  const entryId = Number(req.params.entryId);
  if (!entryId) return res.status(400).json({ ok: false, message: "Invalid entry id" });

  const { title, content } = req.body || {};
  const t = (title ?? "").trim();
  const c = (content ?? "").trim();
  if (!t) return res.status(400).json({ ok: false, message: "Title is required" });
  if (!c) return res.status(400).json({ ok: false, message: "Content is required" });

  const own = await requireEntryOwned(req, entryId);
  if (!own.ok) return res.status(own.status).json({ ok: false, message: own.message });

  const { data: updated, error: upErr } = await supabase
    .from("entries")
    .update({ title: t, content: c })
    .eq("id", entryId)
    .select("id, child_id, title, content, entry_date, created_at, photo_paths")
    .single();

  if (upErr) return res.status(500).json({ ok: false, message: upErr.message });
  return res.json({ ok: true, entry: updated });
});

// List entries by child
router.get("/children/:id/entries", requireAuth, async (req, res) => {
  const childId = Number(req.params.id);
  if (!childId) return res.status(400).json({ ok: false, message: "Invalid child id" });

  const own = await requireChildOwned(req, childId);
  if (!own.ok) return res.status(own.status).json({ ok: false, message: own.message });

  const sb = rls(req);
  const { data: entries, error: entriesErr } = await sb
    .from("entries")
    .select("id, title, content, entry_date, created_at, photo_paths")
    .eq("child_id", childId)
    .eq("is_active", true)
    .order("entry_date", { ascending: false });

  if (entriesErr) return res.status(500).json({ ok: false, message: entriesErr.message });
  return res.json({ ok: true, entries: entries ?? [] });
});

// Overwrite photo_paths array
router.patch("/:entryId/photo-paths", requireAuth, async (req, res) => {
  const entryId = Number(req.params.entryId);
  if (!Number.isFinite(entryId)) {
    return res.status(400).json({ ok: false, message: "Invalid entryId" });
  }

  const incoming = req.body?.photo_paths;
  const paths = Array.isArray(incoming) ? incoming : [];
  if (paths.length > 3) {
    return res.status(400).json({ ok: false, message: "Max 3 photos per entry" });
  }

  const own = await requireEntryOwned(req, entryId);
  if (!own.ok) return res.status(own.status).json({ ok: false, message: own.message });

  if (!mustAdmin(res)) return;

  const { data: updated, error: updErr } = await supabaseAdmin
    .from("entries")
    .update({ photo_paths: paths })
    .eq("id", entryId)
    .select("id, child_id, title, content, entry_date, created_at, photo_paths")
    .single();

  if (updErr) return res.status(500).json({ ok: false, message: updErr.message });
  return res.json({ ok: true, entry: updated });
});

// Soft delete entry
router.patch("/:entryId/deactivate", requireAuth, async (req, res) => {
  const entryId = Number(req.params.entryId);
  if (!Number.isFinite(entryId)) {
    return res.status(400).json({ ok: false, message: "Invalid entry id" });
  }

  const own = await requireEntryOwned(req, entryId);
  if (!own.ok) return res.status(own.status).json({ ok: false, message: own.message });

  if (!mustAdmin(res)) return;

  const { data: updated, error: updErr } = await supabaseAdmin
    .from("entries")
    .update({ is_active: false })
    .eq("id", entryId)
    .select("id, is_active")
    .single();

  if (updErr) return res.status(500).json({ ok: false, message: updErr.message });
  return res.json({ ok: true, entry: updated });
});

// Upload photos (append to existing photo_paths)
router.post("/:entryId/photos", requireAuth, upload.array("photos", 3), async (req, res) => {
  const entryId = Number(req.params.entryId);
  if (!Number.isFinite(entryId)) {
    return res.status(400).json({ ok: false, message: "Invalid entryId" });
  }

  if (!mustAdmin(res)) return;

  const own = await requireEntryOwned(req, entryId);
  if (!own.ok) return res.status(own.status).json({ ok: false, message: own.message });

  const files = req.files || [];
  if (files.length === 0) return res.status(400).json({ ok: false, message: "No photos uploaded" });

  const existing = own.entryRow.photo_paths || [];
  if (existing.length + files.length > 3) {
    return res.status(400).json({ ok: false, message: "Max 3 photos per entry" });
  }

  const newPaths = [];

  for (let i = 0; i < files.length; i++) {
    const f = files[i];

    if (!f.mimetype?.startsWith("image/")) {
      return res.status(400).json({ ok: false, message: "All files must be images" });
    }

    const safeName = (f.originalname || `photo_${i}.jpg`).replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${entryId}/${Date.now()}_${i}_${safeName}`;

    const { error: upErr } = await supabaseAdmin.storage
      .from("entry-photos")
      .upload(path, f.buffer, { contentType: f.mimetype });

    if (upErr) return res.status(500).json({ ok: false, message: upErr.message || "Upload failed" });

    newPaths.push(path);
  }

  const merged = [...existing, ...newPaths];

  const { data: updated, error: updErr } = await supabaseAdmin
    .from("entries")
    .update({ photo_paths: merged })
    .eq("id", entryId)
    .select("id, child_id, title, content, entry_date, created_at, photo_paths")
    .single();

  if (updErr) return res.status(500).json({ ok: false, message: updErr.message || "DB update failed" });
  return res.json({ ok: true, entry: updated });
});

// Get signed photo urls for entry
router.get("/:entryId/photos", requireAuth, async (req, res) => {
  const entryId = Number(req.params.entryId);
  if (!Number.isFinite(entryId)) {
    return res.status(400).json({ ok: false, message: "Invalid entryId" });
  }

  if (!mustAdmin(res)) return;

  const own = await requireEntryOwned(req, entryId);
  if (!own.ok) return res.status(own.status).json({ ok: false, message: own.message });

  const paths = own.entryRow.photo_paths || [];
  if (paths.length === 0) return res.json({ ok: true, urls: [] });

  const { data, error } = await supabaseAdmin.storage
    .from("entry-photos")
    .createSignedUrls(paths, 60 * 60);

  if (error) return res.status(500).json({ ok: false, message: error.message });

  const urls = (data || []).map((x) => x.signedUrl).filter(Boolean);
  return res.json({ ok: true, urls });
});

export default router;