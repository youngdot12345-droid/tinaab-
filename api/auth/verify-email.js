import { verifyEmail } from "../../backend/src/services/authService.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, reason: "Method not allowed." });
  }

  try {
    const result = await verifyEmail(req.body?.email, req.body?.code);
    return res.status(result.ok ? 200 : 400).json(result);
  } catch (error) {
    console.error("Tinaab email verification error:", error);
    const status = Number(error?.statusCode) || 500;
    return res.status(status).json({
      ok: false,
      reason: status === 503 ? "Tinaab database is not configured yet." : "Unable to verify email right now."
    });
  }
}
