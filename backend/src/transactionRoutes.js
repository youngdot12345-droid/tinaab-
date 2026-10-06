import { getUserFromToken } from "./services/authService.js";
import { setTransactionPin } from "./services/transactionPinService.js";
import { createPayoutRequest } from "./services/payoutService.js";

function readBearerToken(req){const h=String(req.headers.authorization||"");return h.startsWith("Bearer ")?h.slice(7).trim():null;}
async function requireUser(req,res){const user=await getUserFromToken(readBearerToken(req));if(!user){res.status(401).json({ok:false,reason:"Authentication required."});return null;}return user;}

export function registerTransactionRoutes(app){
  app.post("/api/transaction-pin",async(req,res,next)=>{try{const user=await requireUser(req,res);if(!user)return;const result=await setTransactionPin(user.id,req.body?.currentPin,req.body?.newPin);res.status(result.ok?200:400).json(result);}catch(error){next(error);}});
  app.post("/api/payouts",async(req,res,next)=>{try{const user=await requireUser(req,res);if(!user)return;const result=await createPayoutRequest(user.id,req.body||{});res.status(result.ok?201:400).json(result);}catch(error){next(error);}});
}
