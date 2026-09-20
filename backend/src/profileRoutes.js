import { getUserFromToken } from "./services/authService.js";
import { followUser, getFollowingFeed, getProfileByUsername, unfollowUser } from "./services/profileService.js";

function readBearerToken(req) {
  const header = String(req.headers.authorization || "");
  return header.startsWith("Bearer ") ? header.slice(7).trim() : null;
}

async function requireUser(req, res) {
  const user = await getUserFromToken(readBearerToken(req));
  if (!user) {
    res.status(401).json({ ok: false, reason: "Authentication required." });
    return null;
  }
  return user;
}

export function registerProfileRoutes(app) {
  app.get("/api/profiles/:username", async (req, res, next) => {
    try {
      const viewer = await getUserFromToken(readBearerToken(req));
      const profile = await getProfileByUsername(req.params.username, viewer?.id || null);
      if (!profile) return res.status(404).json({ ok: false, reason: "Profile not found." });
      res.json({ ok: true, profile });
    } catch (error) { next(error); }
  });

  app.post("/api/users/:userId/follow", async (req, res, next) => {
    try {
      const user = await requireUser(req, res);
      if (!user) return;
      const result = await followUser(user.id, req.params.userId);
      res.status(result.ok ? 200 : 400).json(result);
    } catch (error) { next(error); }
  });

  app.delete("/api/users/:userId/follow", async (req, res, next) => {
    try {
      const user = await requireUser(req, res);
      if (!user) return;
      const result = await unfollowUser(user.id, req.params.userId);
      res.status(result.ok ? 200 : 400).json(result);
    } catch (error) { next(error); }
  });

  app.get("/api/feed/following", async (req, res, next) => {
    try {
      const user = await requireUser(req, res);
      if (!user) return;
      const result = await getFollowingFeed(user.id, req.query.limit, req.query.cursor);
      res.json(result);
    } catch (error) { next(error); }
  });
}
