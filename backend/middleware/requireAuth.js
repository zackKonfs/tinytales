export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ ok: false, message: "Missing token" });
  }

  req.accessToken = token;
  next();
}
