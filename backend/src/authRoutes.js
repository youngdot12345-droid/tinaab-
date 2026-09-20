import { getUserFromToken, login, logout, signup, verifyEmail } from "./services/authService.js";

function readBearerToken(req) {
  const header = String(req.headers.authorization || "");
  return header.startsWith("Bearer ") ? header.slice(7).trim() : null;
}

export function registerAuthRoutes(app) {
  app.post("/api/auth/signup", async (req, res, next) => {
    try { res.status(201).json(await signup(req.body || {})); } catch (error) { next(error); }
  });

  app.post("/api/auth/verify-email", async (req, res, next) => {
    try { res.json(await verifyEmail(req.body?.email, req.body?.code)); } catch (error) { next(error); }
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
