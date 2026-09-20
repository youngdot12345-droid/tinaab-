import { getUserFromToken } from "./services/authService.js";
import { initializePayment, verifyPayment, createPayoutAccount } from "./services/payment/paymentService.js";

function token(req) {
  const value = String(req.headers.authorization || "");
  return value.startsWith("Bearer ") ? value.slice(7).trim() : null;
}

async function requireUser(req, res) {
  const user = await getUserFromToken(token(req));
  if (!user) {
    res.status(401).json({ ok: false, reason: "Authentication required." });
    return null;
  }
  return user;
}

export function registerPaymentRoutes(app) {
  app.post("/api/payments/initialize", async (req, res, next) => {
    try {
      const user = await requireUser(req, res);
      if (!user) return;
      const result = await initializePayment(user, Number(req.body?.amountKobo));
      res.status(result.ok ? 201 : 400).json(result);
    } catch (error) { next(error); }
  });

  app.get("/api/payments/:reference/verify", async (req, res, next) => {
    try {
      const user = await requireUser(req, res);
      if (!user) return;
      const result = await verifyPayment(req.params.reference);
      res.status(result.ok ? 200 : 400).json(result);
    } catch (error) { next(error); }
  });

  app.post("/api/payout-accounts", async (req, res, next) => {
    try {
      const user = await requireUser(req, res);
      if (!user) return;
      const result = await createPayoutAccount(user.id, req.body?.name, req.body?.accountNumber, req.body?.bankCode);
      res.status(result.ok ? 201 : 400).json(result);
    } catch (error) { next(error); }
  });
}
