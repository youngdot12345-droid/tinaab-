import { calculateReward } from "./services/rewardService.js";
import { canFollow, validateCaption, validateMessage } from "./services/socialRules.js";
import { canWithdrawToday, validateWithdrawalAmount } from "./services/withdrawalPolicy.js";
import { registerAuthRoutes } from "./authRoutes.js";
import { registerProfileRoutes } from "./profileRoutes.js";
import { registerPostRoutes } from "./postRoutes.js";
import { registerWalletRoutes } from "./walletRoutes.js";
import { registerBankAccountRoutes } from "./bankAccountRoutes.js";
import { registerAdminRoutes } from "./adminRoutes.js";
import { registerWithdrawalAdminRoutes } from "./adminWithdrawalRoutes.js";

export function registerRoutes(app) {
  app.get("/api/health", (_req, res) => res.json({ ok: true, service: "tinaab-api" }));

  app.get("/api/security/reward-policy", (_req, res) => {
    res.json({ currency: "NGN", maxPerVerifiedActivityNaira: 500, clientMaySetAmount: false });
  });

  app.post("/api/rewards/quote", (req, res) => {
    const result = calculateReward(req.body?.activityType);
    if (!result.ok) return res.status(400).json(result);
    res.json(result);
  });

  app.post("/api/social/validate-post", (req, res) => {
    const result = validateCaption(req.body?.caption);
    if (!result.ok) return res.status(400).json(result);
    res.json(result);
  });

  app.post("/api/social/validate-message", (req, res) => {
    const result = validateMessage(req.body?.body);
    if (!result.ok) return res.status(400).json(result);
    res.json(result);
  });

  app.post("/api/social/can-follow", (req, res) => {
    const result = canFollow(req.body?.followerId, req.body?.followingId);
    if (!result.ok) return res.status(400).json(result);
    res.json(result);
  });

  app.post("/api/withdrawals/validate", (req, res) => {
    if (!canWithdrawToday(req.body?.withdrawalsToday)) {
      return res.status(429).json({ ok: false, reason: "Maximum of 2 withdrawals per calendar day reached." });
    }
    const result = validateWithdrawalAmount(req.body?.amountKobo, req.body?.availableKobo);
    if (!result.ok) return res.status(400).json(result);
    res.json({ ok: true });
  });

  registerAuthRoutes(app);
  registerProfileRoutes(app);
  registerPostRoutes(app);
  registerWalletRoutes(app);
  registerBankAccountRoutes(app);
  registerAdminRoutes(app);
  registerWithdrawalAdminRoutes(app);
}
