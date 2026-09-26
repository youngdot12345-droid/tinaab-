import { signup } from "../../backend/src/services/authService.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, reason: "Method not allowed." });
  }

  try {
    const result = await signup(req.body || {});
    return res.status(result.ok ? 201 : 400).json(result);
  } catch (error) {
    console.error("Tinaab signup error:", error);
    const status = Number(error?.statusCode) || 500;
    return res.status(status).json({
      ok: false,
      reason: status === 503 ? "Tinaab database is not configured yet." : "Unable to create account right now."
    });
  }
}
