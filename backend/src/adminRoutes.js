import { getUserFromToken } from "./services/authService.js";
import { isAdmin, listPendingRewardClaims, reviewRewardClaim } from "./services/adminRewardService.js";
import { getAdminOverview, listAdminUsers } from "./services/adminDashboardService.js";

function readBearerToken(req) {
  const header = String(req.headers.authorization || "");
  return header.startsWith("Bearer ") ? header.slice(7).trim() : null;
}

async function requireAdmin(req, res) {
  const user = await getUserFromToken(readBearerToken(req));
  if (!user) {
    res.status(401).json({ ok: false, reason: "Authentication required." });
    return null;
  }
  if (!isAdmin(user)) {
    res.status(403).json({ ok: false, reason: "Administrator access required." });
    return null;
  }
  return user;
}

export function registerAdminRoutes(app) {
  app.get("/api/admin/overview", async (req, res, next) => {
    try {
      const admin = await requireAdmin(req, res);
      if (!admin) return;
      res.json(await getAdminOverview());
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/admin/users", async (req, res, next) => {
    try {
      const admin = await requireAdmin(req, res);
      if (!admin) return;
      res.json(await listAdminUsers({
        limit: req.query?.limit,
        offset: req.query?.offset,
        search: req.query?.search
      }));
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/admin/rewards/pending", async (req, res, next) => {
    try {
      const admin = await requireAdmin(req, res);
      if (!admin) return;
      res.json(await listPendingRewardClaims(req.query?.limit));
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/admin/rewards/:claimId/review", async (req, res, next) => {
    try {
      const admin = await requireAdmin(req, res);
      if (!admin) return;

      const claimId = Number(req.params.claimId);
      if (!Number.isSafeInteger(claimId) || claimId <= 0) {
        return res.status(400).json({ ok: false, reason: "Invalid reward claim ID." });
      }

      const decision = String(req.body?.decision || "").trim().toLowerCase();
      const result = await reviewRewardClaim(
        claimId,
        admin.id,
        decision,
        req.body?.rejectionReason
      );

      res.status(result.ok ? 200 : 400).json(result);
    } catch (error) {
      next(error);
    }
  });
}
