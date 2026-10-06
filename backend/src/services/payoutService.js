import crypto from "node:crypto";
import { requireDatabase } from "../db/db.js";
import { verifyTransactionPin } from "./transactionPinService.js";
function getSecret(name){const value=String(process.env[name]||"").trim();if(!value){const e=new Error(name+" is not configured.");e.statusCode=503;throw e;}return value;}
function normalizeAccountNumber(value){const n=String(value||"").replace(/\\s+/g,"");return /^\\d{10}$/.test(n)?n:null;}
function encryptAccountNumber(n){const t=getSecret("BANK_ACCOUNT_ENCRYPTION_KEY");const key=/^[0-9a-fA-F]{64}$/.test(t)?Buffer.from(t,"hex"):Buffer.from(t,"base64");if(key.length!==32){const e=new Error("BANK_ACCOUNT_ENCRYPTION_KEY must decode to 32 bytes.");e.statusCode=503;throw e;}const iv=crypto.randomBytes(12);const c=crypto.createCipheriv("aes-256-gcm",key,iv);const ciphertext=Buffer.concat([c.update(n,"utf8"),c.final()]);return {ciphertext:ciphertext.toString("base64"),iv:iv.toString("base64"),tag:c.getAuthTag().toString("base64")};}
function hashAccountNumber(n){return crypto.createHmac("sha256",getSecret("BANK_ACCOUNT_HASH_SECRET")).update(n).digest("hex");}
function makeReference(){return "payout_"+crypto.randomBytes(12).toString("hex");}
export async function createPayoutRequest(userId,input){
  const accountNumber=normalizeAccountNumber(input?.accountNumber),accountName=String(input?.accountName||"").trim(),amountKobo=Number(input?.amountKobo);
  if(!accountNumber)return {ok:false,reason:"Enter a valid 10-digit Nigerian account number."}; if(!accountName||accountName.length>160)return {ok:false,reason:"Enter a valid account name."}; if(!Number.isSafeInteger(amountKobo)||amountKobo<=0)return {ok:false,reason:"Enter a valid payout amount."};
  const db=requireDatabase();
  const pin=await verifyTransactionPin(userId,input?.transactionPin);
  if(!pin.ok)return pin;
  const client=await db.connect();
  try{await client.query("BEGIN");const wallet=await client.query("SELECT available_kobo FROM wallet_accounts WHERE user_id=$1 FOR UPDATE",[userId]);if(!wallet.rowCount){await client.query("ROLLBACK");return {ok:false,reason:"Wallet not found."};}if(amountKobo>Number(wallet.rows[0].available_kobo)){await client.query("ROLLBACK");return {ok:false,reason:"Insufficient available wallet balance."};}
    const encrypted=encryptAccountNumber(accountNumber),accountHash=hashAccountNumber(accountNumber),reference=makeReference();
    const payout=await client.query("INSERT INTO payout_requests (user_id,amount_kobo,account_name,account_number_ciphertext,account_number_iv,account_number_tag,account_number_hash,account_number_last4,status,provider) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'pending','pending_provider') RETURNING id,amount_kobo,account_name,account_number_last4,status,provider,created_at",[userId,amountKobo,accountName,encrypted.ciphertext,encrypted.iv,encrypted.tag,accountHash,accountNumber.slice(-4)]);
    await client.query("UPDATE wallet_accounts SET available_kobo=available_kobo-$1,pending_kobo=pending_kobo+$1,updated_at=NOW() WHERE user_id=$2",[amountKobo,userId]);
    await client.query("INSERT INTO wallet_ledger (user_id,type,amount_kobo,reference,status,metadata) VALUES ($1,'payout_hold',$2,$3,'posted',$4::jsonb)",[userId,-amountKobo,reference,JSON.stringify({payoutRequestId:payout.rows[0].id,accountNumberLast4:accountNumber.slice(-4)})]);
    await client.query("COMMIT");return {ok:true,payout:{...payout.rows[0],reference},message:"Payout request created and placed on hold pending payout-provider processing."};
  }catch(error){await client.query("ROLLBACK");throw error;}finally{client.release();}
}
