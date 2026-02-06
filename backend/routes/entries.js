import express from "express";
const router = express.Router();

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
