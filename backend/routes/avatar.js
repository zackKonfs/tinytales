import express from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { uploadAvatar } from "../middleware/uploadAvatar.js";
import { supabaseForReq } from "../supabaseRequest.js";

const router = express.Router();

function extFromMime(mime) {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return null;
}

router.post("/avatar/parent", requireAuth, uploadAvatar.single("avatar"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded. Use field name: avatar" });
    }

    const ext = extFromMime(req.file.mimetype);
    if (!ext) return res.status(400).json({ error: "Unsupported image type." });

    const supabase = supabaseForReq(req);

    // Storage path: avatars/<userId>/parent/avatar.<ext>
    const path = `${req.user.id}/parent/avatar.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from("avatars")
      .upload(path, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: true,
      });

    if (uploadErr) return res.status(400).json({ error: uploadErr.message });

    // Save to YOUR parent table
    const { error: dbErr } = await supabase
      .from("parents")
      .update({ avatar_path: path })
      .eq("user_id", req.user.id);

    if (dbErr) return res.status(400).json({ error: dbErr.message });

    const { data } = supabase.storage.from("avatars").getPublicUrl(path);

    return res.json({
      ok: true,
      avatar_path: path,
      avatar_url: data.publicUrl,
    });
  } catch (err) {
    if (err?.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ error: "File too large. Max 1.5MB allowed." });
    }
    if (err?.message?.includes("Only JPG, PNG, or WEBP")) {
      return res.status(400).json({ error: err.message });
    }
    return res.status(500).json({ error: "Upload failed." });
  }
});

router.get("/avatar/debug/list", requireAuth, async (req, res) => {
    try {
        const supabase = supabaseForReq(req);

        const { data, error } = await supabase.storage
        .from("avatars")
        .list(req.user.id, { limit: 100 });

        console.log("DEBUG LIST RESULT:", { data, error });

        return res.json({
        ok: !error,
        error: error?.message,
        folder: req.user.id,
        files: data,
        });
    } catch (err) {
        console.error("DEBUG LIST ERROR:", err);
        return res.status(500).json({ error: "Debug list failed" });
    }
    });

    router.post(
        "/avatar/children/:childId",
        requireAuth,
        uploadAvatar.single("avatar"),
        async (req, res) => {
            try {
            const { childId } = req.params;

            if (!req.file) {
                return res.status(400).json({ error: "No file uploaded. Use field name: avatar" });
            }

            const ext = extFromMime(req.file.mimetype);
            if (!ext) return res.status(400).json({ error: "Unsupported image type." });

            const supabase = supabaseForReq(req);

            // Verify ownership
            const { data: child, error: childErr } = await supabase
                .from("children")
                .select("id, parent_user_id")
                .eq("id", childId)
                .single();

            if (childErr || !child) {
                return res.status(404).json({ error: "Child not found." });
            }

            if (child.parent_user_id !== req.user.id) {
                return res.status(403).json({ error: "Not your child." });
            }

            // Storage path
            const path = `${req.user.id}/children/${childId}/avatar.${ext}`;

            const { error: uploadErr } = await supabase.storage
                .from("avatars")
                .upload(path, req.file.buffer, {
                contentType: req.file.mimetype,
                upsert: true,
                });

            if (uploadErr) return res.status(400).json({ error: uploadErr.message });

            // Save to children table
            const { data: updated, error: dbErr } = await supabase
                .from("children")
                .update({ avatar_path: path })
                .eq("id", childId)
                .select("id, avatar_path")
                .single();

            if (dbErr) return res.status(400).json({ error: dbErr.message });

            const { data } = supabase.storage.from("avatars").getPublicUrl(path);

            return res.json({
                ok: true,
                avatar_path: path,
                avatar_url: data.publicUrl,
            });
            } catch (err) {
            if (err?.code === "LIMIT_FILE_SIZE") {
                return res.status(400).json({ error: "File too large. Max 1.5MB allowed." });
            }
            return res.status(500).json({ error: "Upload failed." });
            }
        }
    );

export default router;