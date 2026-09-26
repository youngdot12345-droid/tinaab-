import { getUserFromToken } from "../../backend/src/services/authService.js";

function readBearerToken(req) {
  const header = String(req.headers.authorization || "");
  return header.startsWith("Bearer ") ? header.slice(7).trim() : null;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, reason: "Method not allowed." });
  }

  try {
    const user = await getUserFromToken(readBearerToken(req));
    if (!user) return res.status(401).json({ ok: false, reason: "Authentication required." });
    return res.status(200).json({ ok: true, user });
  } catch (error) {
    console.error("Tinaab session error:", error);
    const status = Number(error?.statusCode) || 500;
    return res.status(status).json({
      ok: false,
      reason: status === 503 ? "Tinaab database is not configured yet." : "Unable to load your session right now."
    });
  }
}
