import rateLimit from "express-rate-limit";
import { getUserFromToken, login, logout, resendVerificationEmail, signup, verifyEmail } from "./services/authService.js";

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, reason: "Too many authentication attempts. Try again later." }
});

const resendLimiter = rateLimit({\n  windowMs: 15 * 60 * 1000,\n  limit: 3,\n  standardHeaders: true,\n  legacyHeaders: false,\n  message: { ok: false, reason: "Too many code requests. Please wait 15 minutes before trying again." }\n});\n\nfunction readBearerToken(req) {
  const header = String(req.headers.authorization || "");
  return header.startsWith("Bearer ") ? header.slice(7).trim() : null;
}

export function registerAuthRoutes(app) {
  app.use("/api/auth", authLimiter);

  app.post("/api/auth/signup", async (req, res, next) => {
    try { const result = await signup(req.body || {}); res.status(result.ok ? 201 : (result.reason === "Email or username is already in use." ? 409 : 400)).json(result); } catch (error) { next(error); }
  });

  app.post("/api/auth/resend-verification", resendLimiter, async (req, res, next) => {\n    try {\n      const result = await resendVerificationEmail(req.body?.email);\n      res.json(result);\n    } catch (error) { next(error); }\n  });\n\n  app.post("/api/auth/verify-email", async (req, res, next) => {
    try { const result = await verifyEmail(req.body?.email, req.body?.code); res.status(result.ok ? 200 : 400).json(result); } catch (error) { next(error); }
  });

  app.post("/api/auth/login", async (req, res, next) => {
    try {
      const result = await login(req.body?.email, req.body?.password);
      if (!result.ok) return res.status(401).json(result);
      res.json(result);
    } catch (error) { next(error); }
  });

  app.get("/api/auth/me", async (req, res, next) => {
    try {
      const user = await getUserFromToken(readBearerToken(req));
      if (!user) return res.status(401).json({ ok: false, reason: "Authentication required." });
      res.json({ ok: true, user });
    } catch (error) { next(error); }
  });

  app.post("/api/auth/logout", async (req, res, next) => {
    try { await logout(readBearerToken(req)); res.json({ ok: true }); } catch (error) { next(error); }
  });
}
