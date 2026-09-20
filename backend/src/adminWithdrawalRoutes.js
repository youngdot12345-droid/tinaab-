import { getUserFromToken } from "./services/authService.js";
import { isAdmin } from "./services/adminRewardService.js";
import { listPendingWithdrawals, reconcileWithdrawal } from "./services/withdrawalService.js";

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

export function registerWithdrawalAdminRoutes(app) {
  app.get("/api/admin/withdrawals/pending", async (req, res, next) => {
    try {
      const admin = await requireAdmin(req, res);
      if (!admin) return;
      res.json(await listPendingWithdrawals(req.query?.limit));
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/admin/withdrawals/:withdrawalId/reconcile", async (req, res, next) => {
    try {
      const admin = await requireAdmin(req, res);
      if (!admin) return;

      const withdrawalId = Number(req.params.withdrawalId);
      if (!Number.isSafeInteger(withdrawalId) || withdrawalId <= 0) {
        return res.status(400).json({ ok: false, reason: "Invalid withdrawal ID." });
      }

      const result = await reconcileWithdrawal(
        withdrawalId,
        admin.id,
        String(req.body?.decision || "").trim().toLowerCase(),
        req.body?.providerReference,
        req.body?.failureReason
      );

      res.status(result.ok ? 200 : 400).json(result);
    } catch (error) {
      next(error);
    }
  });
}
