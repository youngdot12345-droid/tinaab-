import { getUserFromToken } from "./services/authService.js";
import { getWallet, claimReward, requestWithdrawal } from "./services/walletService.js";

function readBearerToken(req) { const header=String(req.headers.authorization||""); return header.startsWith("Bearer ") ? header.slice(7).trim() : null; }
async function requireUser(req,res) { const user=await getUserFromToken(readBearerToken(req)); if(!user){res.status(401).json({ok:false,reason:"Authentication required."});return null;} return user; }

export function registerWalletRoutes(app) {
  app.get("/api/wallet", async (req,res,next)=>{ try { const user=await requireUser(req,res); if(!user)return; res.json(await getWallet(user.id)); } catch(error){next(error);} });
  app.post("/api/rewards/claim", async (req,res,next)=>{ try { const user=await requireUser(req,res); if(!user)return; const result=await claimReward(user.id,req.body?.activityType,req.body?.activityReference); res.status(result.ok?201:400).json(result); } catch(error){next(error);} });
  app.post("/api/withdrawals", async (req,res,next)=>{ try { const user=await requireUser(req,res); if(!user)return; const result=await requestWithdrawal(user.id,Number(req.body?.amountKobo),Number(req.body?.bankAccountId)); res.status(result.ok?201:400).json(result); } catch(error){next(error);} });
}