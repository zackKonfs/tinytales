export function mustAdmin(req, res, next) {
  const email = (req.user?.email || "").toLowerCase();
  const allowed = ["zack.xu@hotmail.com"];

  if (!allowed.includes(email)) {
    return res.status(403).json({ ok: false, message: "Forbidden" });
  }

  next();
}