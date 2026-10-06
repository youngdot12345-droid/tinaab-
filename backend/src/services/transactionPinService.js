import crypto from "node:crypto";
import { requireDatabase } from "../db/db.js";
function normalizePin(pin) { const value=String(pin ?? "").trim(); return /^\\d{4,6}$/.test(value) ? value : null; }
function hashPin(pin,salt=crypto.randomBytes(16).toString("hex")) { const hash=crypto.scryptSync(pin,salt,64).toString("hex"); return salt+":"+hash; }
function verifyHash(pin,stored) { const [salt,expected]=String(stored||"").split(":"); if(!salt||!expected)return false; const actual=crypto.scryptSync(pin,salt,64).toString("hex"); const a=Buffer.from(actual,"hex"),b=Buffer.from(expected,"hex"); return a.length===b.length&&crypto.timingSafeEqual(a,b); }
export async function setTransactionPin(userId,currentPin,newPin) {
  const pin=normalizePin(newPin); if(!pin)return {ok:false,reason:"Transaction PIN must contain 4 to 6 digits."};
  const current=currentPin==null?null:normalizePin(currentPin); const db=requireDatabase();
  const existing=await db.query("SELECT pin_hash FROM transaction_pins WHERE user_id=$1",[userId]);
  if(existing.rowCount){ if(!current||!verifyHash(current,existing.rows[0].pin_hash))return {ok:false,reason:"Current transaction PIN is required."}; await db.query("UPDATE transaction_pins SET pin_hash=$1,failed_attempts=0,locked_until=NULL,updated_at=NOW() WHERE user_id=$2",[hashPin(pin),userId]); }
  else await db.query("INSERT INTO transaction_pins (user_id,pin_hash) VALUES ($1,$2)",[userId,hashPin(pin)]);
  return {ok:true,message:"Transaction PIN saved securely."};
}
export async function verifyTransactionPin(userId,suppliedPin,client=null) {
  const pin=normalizePin(suppliedPin); if(!pin)return {ok:false,reason:"A valid transaction PIN is required."}; const db=client||requireDatabase();
  const result=await db.query("SELECT pin_hash,failed_attempts,locked_until FROM transaction_pins WHERE user_id=$1 FOR UPDATE",[userId]);
  if(!result.rowCount)return {ok:false,reason:"Set your Tinaab transaction PIN before making a payout."}; const row=result.rows[0];
  if(row.locked_until&&new Date(row.locked_until).getTime()>Date.now())return {ok:false,reason:"Transaction PIN is temporarily locked. Try again later."};
  if(verifyHash(pin,row.pin_hash)){await db.query("UPDATE transaction_pins SET failed_attempts=0,locked_until=NULL,updated_at=NOW() WHERE user_id=$1",[userId]);return {ok:true};}
  const attempts=Number(row.failed_attempts||0)+1;
  if(attempts>=5){await db.query("UPDATE transaction_pins SET failed_attempts=0,locked_until=NOW()+INTERVAL '15 minutes',updated_at=NOW() WHERE user_id=$1",[userId]);return {ok:false,reason:"Incorrect transaction PIN. PIN locked for 15 minutes after too many attempts."};}
  await db.query("UPDATE transaction_pins SET failed_attempts=$1,updated_at=NOW() WHERE user_id=$2",[attempts,userId]); return {ok:false,reason:"Incorrect transaction PIN."};
}
