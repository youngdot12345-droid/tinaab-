import { getUserFromToken } from "./services/authService.js";
import { addBankAccount, listBankAccounts, setDefaultBankAccount, removeBankAccount } from "./services/bankAccountService.js";

function readBearerToken(req) {
  const header = String(req.headers.authorization || "");
  return header.startsWith("Bearer ") ? header.slice(7).trim() : null;
}

async function requireUser(req, res) {
  const user = await getUserFromToken(readBearerToken(req));
  if (!user) {
    res.status(401).json({ ok:false, reason:"Authentication required." });
    return null;
  }
  return user;
}

export function registerBankAccountRoutes(app) {
  app.get("/api/bank-accounts", async (req,res,next) => {
    try {
      const user = await requireUser(req,res);
      if (!user) return;
      res.json(await listBankAccounts(user.id));
    } catch (error) { next(error); }
  });

  app.post("/api/bank-accounts", async (req,res,next) => {
    try {
      const user = await requireUser(req,res);
      if (!user) return;
      const result = await addBankAccount(user.id, req.body || {});
      res.status(result.ok ? 201 : 400).json(result);
    } catch (error) { next(error); }
  });

  app.post("/api/bank-accounts/:id/default", async (req,res,next) => {
    try {
      const user = await requireUser(req,res);
      if (!user) return;
      const result = await setDefaultBankAccount(user.id, Number(req.params.id));
      res.status(result.ok ? 200 : 400).json(result);
    } catch (error) { next(error); }
  });

  app.delete("/api/bank-accounts/:id", async (req,res,next) => {
    try {
      const user = await requireUser(req,res);
      if (!user) return;
      const result = await removeBankAccount(user.id, Number(req.params.id));
      res.status(result.ok ? 200 : 400).json(result);
    } catch (error) { next(error); }
  });
}
