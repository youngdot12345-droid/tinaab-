import { getUserFromToken } from "./services/authService.js";
import { createPost, getPublicFeed, setPostLike } from "./services/postService.js";

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

export function registerPostRoutes(app) {
  app.get("/api/feed/public", async (req, res, next) => {
    try {
      res.json(await getPublicFeed(req.query.limit, req.query.cursor));
    } catch (error) { next(error); }
  });

  app.post("/api/posts", async (req, res, next) => {
    try {
      const user = await requireUser(req, res);
      if (!user) return;
      const result = await createPost(user.id, req.body || {});
      res.status(result.ok ? 201 : 400).json(result);
    } catch (error) { next(error); }
  });

  app.post("/api/posts/:postId/like", async (req, res, next) => {
    try {
      const user = await requireUser(req, res);
      if (!user) return;
      const result = await setPostLike(user.id, req.params.postId, true);
      res.status(result.ok ? 200 : 400).json(result);
    } catch (error) { next(error); }
  });

  app.delete("/api/posts/:postId/like", async (req, res, next) => {
    try {
      const user = await requireUser(req, res);
      if (!user) return;
      const result = await setPostLike(user.id, req.params.postId, false);
      res.status(result.ok ? 200 : 400).json(result);
    } catch (error) { next(error); }
  });
}
