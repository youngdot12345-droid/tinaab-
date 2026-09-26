import { logout } from "../../backend/src/services/authService.js";

function readBearerToken(req) {
  const header = String(req.headers.authorization || "");
  return header.startsWith("Bearer ") ? header.slice(7).trim() : null;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, reason: "Method not allowed." });
  }

  try {
    await logout(readBearerToken(req));
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("Tinaab logout error:", error);
    const status = Number(error?.statusCode) || 500;
    return res.status(status).json({
      ok: false,
      reason: status === 503 ? "Tinaab database is not configured yet." : "Unable to log out right now."
    });
  }
}
