import crypto from "node:crypto";
import { requireDatabase } from "../db/db.js";
import { calculateReward } from "./rewardService.js";
import { canWithdrawToday, validateWithdrawalAmount } from "./withdrawalPolicy.js";

function makeReference(prefix) { return prefix + "_" + crypto.randomBytes(12).toString("hex"); }

export async function getWallet(userId) {
  const db = requireDatabase();
  const wallet = await db.query("SELECT user_id, available_kobo, pending_kobo, updated_at FROM wallet_accounts WHERE user_id=$1", [userId]);
  if (!wallet.rowCount) return { ok:false, reason:"Wallet not found." };
  const ledger = await db.query("SELECT id,type,amount_kobo,reference,status,metadata,created_at FROM wallet_ledger WHERE user_id=$1 ORDER BY id DESC LIMIT 50", [userId]);
  return { ok:true, wallet:wallet.rows[0], ledger:ledger.rows };
}

export async function claimReward(userId, activityType, activityReference) {
  const result = calculateReward(activityType);
  if (!result.ok) return result;
  const reference = String(activityReference || "").trim();
  if (!reference || reference.length > 200) return { ok:false, reason:"A valid activity reference is required." };
  const db = requireDatabase();
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const existing = await client.query("SELECT id,status,server_amount_kobo FROM reward_claims WHERE user_id=$1 AND activity_reference=$2 LIMIT 1 FOR UPDATE", [userId, reference]);
    if (existing.rowCount) { await client.query("ROLLBACK"); return { ok:false, reason:"This activity has already been submitted.", claim:existing.rows[0] }; }
    const inserted = await client.query("INSERT INTO reward_claims (user_id,activity_type,server_amount_kobo,activity_reference,status) VALUES ($1,$2,$3,$4,$$pending$$) RETURNING id,activity_type,server_amount_kobo,activity_reference,status,created_at", [userId, activityType, result.amount * 100, reference]);
    await client.query("COMMIT");
    return { ok:true, claim:inserted.rows[0], message:"Reward submitted for server verification." };
  } catch (error) { await client.query("ROLLBACK"); if (error.code === "23505") return { ok:false, reason:"This activity has already been submitted." }; throw error; }
  finally { client.release(); }
}

export async function requestWithdrawal(userId, amountKobo, bankAccountId) {
  if (!Number.isSafeInteger(bankAccountId) || bankAccountId <= 0) return { ok:false, reason:"A valid bank account is required for withdrawal." };
  const db = requireDatabase();
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const bank = await client.query("SELECT id,bank_code,bank_name,account_name,account_number_last4 FROM bank_accounts WHERE id=$1 AND user_id=$2 AND status='active' FOR UPDATE", [bankAccountId, userId]);
    if (!bank.rowCount) { await client.query("ROLLBACK"); return { ok:false, reason:"Bank account not found or inactive." }; }
    const count = await client.query("SELECT COUNT(*)::int AS count FROM withdrawal_requests WHERE user_id=$1 AND created_at::date=CURRENT_DATE", [userId]);
    if (!canWithdrawToday(count.rows[0].count)) { await client.query("ROLLBACK"); return { ok:false, reason:"Maximum of 2 withdrawal requests per calendar day reached." }; }
    const wallet = await client.query("SELECT available_kobo FROM wallet_accounts WHERE user_id=$1 FOR UPDATE", [userId]);
    if (!wallet.rowCount) { await client.query("ROLLBACK"); return { ok:false, reason:"Wallet not found." }; }
    const validation = validateWithdrawalAmount(amountKobo, Number(wallet.rows[0].available_kobo));
    if (!validation.ok) { await client.query("ROLLBACK"); return validation; }
    const destination = bank.rows[0];
    const request = await client.query(
      "INSERT INTO withdrawal_requests (user_id,amount_kobo,fee_kobo,net_kobo,status,bank_account_id,bank_code_snapshot,bank_name_snapshot,account_name_snapshot,account_number_last4_snapshot) VALUES ($1,$2,0,$2,'pending',$3,$4,$5,$6,$7) RETURNING id,amount_kobo,fee_kobo,net_kobo,status,bank_account_id,bank_name_snapshot,account_name_snapshot,account_number_last4_snapshot,created_at",
      [userId, amountKobo, bankAccountId, destination.bank_code, destination.bank_name, destination.account_name, destination.account_number_last4]
    );
    await client.query("UPDATE wallet_accounts SET available_kobo=available_kobo-$1, pending_kobo=pending_kobo+$1, updated_at=NOW() WHERE user_id=$2", [amountKobo, userId]);
    await client.query("INSERT INTO wallet_ledger (user_id,type,amount_kobo,reference,status,metadata) VALUES ($1,$$withdrawal_hold$$,$2,$3,$$posted$$,$4::jsonb)", [userId, -amountKobo, makeReference("wdhold"), JSON.stringify({withdrawalId:request.rows[0].id, bankAccountId})]);
    await client.query("COMMIT");
    return { ok:true, withdrawal:request.rows[0], message:"Withdrawal request created for the saved bank account." };
  } catch (error) { await client.query("ROLLBACK"); throw error; }
  finally { client.release(); }
}