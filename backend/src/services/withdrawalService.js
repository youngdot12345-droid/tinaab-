import crypto from "node:crypto";
import { requireDatabase } from "../db/db.js";

function makeReference(prefix) {
  return prefix + "_" + crypto.randomBytes(12).toString("hex");
}

export async function listPendingWithdrawals(limit = 50) {
  const db = requireDatabase();
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);
  const result = await db.query(
    `SELECT wr.id, wr.user_id, u.email, u.username, wr.amount_kobo, wr.fee_kobo,
            wr.net_kobo, wr.status, wr.provider_reference, wr.created_at
       FROM withdrawal_requests wr
       JOIN users u ON u.id = wr.user_id
      WHERE wr.status = 'pending'
      ORDER BY wr.id ASC
      LIMIT $1`,
    [safeLimit]
  );
  return { ok: true, withdrawals: result.rows };
}

async function audit(client, actorId, action, targetId, metadata) {
  await client.query(
    "INSERT INTO audit_logs (actor_user_id,action,target_type,target_id,metadata) VALUES ($1,$2,'withdrawal',$3,$4::jsonb)",
    [actorId, action, String(targetId), JSON.stringify(metadata || {})]
  );
}

export async function reconcileWithdrawal(withdrawalId, actorId, decision, providerReference = "", failureReason = "") {
  const db = requireDatabase();
  const client = await db.connect();

  try {
    await client.query("BEGIN");
    const result = await client.query(
      `SELECT id,user_id,amount_kobo,fee_kobo,net_kobo,status,provider_reference
         FROM withdrawal_requests
        WHERE id=$1
        FOR UPDATE`,
      [withdrawalId]
    );
    const withdrawal = result.rows[0];

    if (!withdrawal) {
      await client.query("ROLLBACK");
      return { ok: false, reason: "Withdrawal not found." };
    }
    if (withdrawal.status !== "pending") {
      await client.query("ROLLBACK");
      return { ok: false, reason: "Withdrawal has already been reconciled.", withdrawal };
    }

    const wallet = await client.query(
      "SELECT available_kobo,pending_kobo FROM wallet_accounts WHERE user_id=$1 FOR UPDATE",
      [withdrawal.user_id]
    );
    if (!wallet.rowCount) {
      await client.query("ROLLBACK");
      return { ok: false, reason: "Wallet not found." };
    }

    if (decision === "fail") {
      const reason = String(failureReason || "").trim().slice(0, 500) || "Payout failed.";
      const moved = await client.query(
        "UPDATE wallet_accounts SET available_kobo=available_kobo+$1,pending_kobo=pending_kobo-$1,updated_at=NOW() WHERE user_id=$2 AND pending_kobo >= $1",
        [withdrawal.amount_kobo, withdrawal.user_id]
      );
      if (!moved.rowCount) {
        await client.query("ROLLBACK");
        return { ok: false, reason: "Wallet pending balance cannot cover this withdrawal reversal." };
      }

      await client.query(
        `INSERT INTO wallet_ledger
          (user_id,type,amount_kobo,reference,status,metadata)
         VALUES ($1,'withdrawal_reversal',$2,$3,'posted',$4::jsonb)`,
        [
          withdrawal.user_id,
          withdrawal.amount_kobo,
          makeReference("wdreversal"),
          JSON.stringify({ withdrawalId: withdrawal.id, reason })
        ]
      );

      const updated = await client.query(
        "UPDATE withdrawal_requests SET status='failed',processed_at=NOW(),failure_reason=$1 WHERE id=$2 RETURNING id,status,processed_at,failure_reason",
        [reason, withdrawal.id]
      );

      await audit(client, actorId, "withdrawal_failed", withdrawal.id, { reason });
      await client.query("COMMIT");
      return { ok: true, withdrawal: updated.rows[0] };
    }

    if (decision !== "success") {
      await client.query("ROLLBACK");
      return { ok: false, reason: "Decision must be success or fail." };
    }

    const providerRef = String(providerReference || "").trim().slice(0, 200);
    if (!providerRef) {
      await client.query("ROLLBACK");
      return { ok: false, reason: "A provider reference is required for a successful payout." };
    }

    const duplicate = await client.query(
      "SELECT id FROM withdrawal_requests WHERE provider_reference=$1 AND id<>$2 LIMIT 1",
      [providerRef, withdrawal.id]
    );
    if (duplicate.rowCount) {
      await client.query("ROLLBACK");
      return { ok: false, reason: "Provider reference is already linked to another withdrawal." };
    }

    const moved = await client.query(
      "UPDATE wallet_accounts SET pending_kobo=pending_kobo-$1,updated_at=NOW() WHERE user_id=$2 AND pending_kobo >= $1",
      [withdrawal.amount_kobo, withdrawal.user_id]
    );
    if (!moved.rowCount) {
      await client.query("ROLLBACK");
      return { ok: false, reason: "Wallet pending balance cannot cover this withdrawal." };
    }

    const updated = await client.query(
      "UPDATE withdrawal_requests SET status='paid',processed_at=NOW(),provider_reference=$1 WHERE id=$2 RETURNING id,status,processed_at,provider_reference",
      [providerRef, withdrawal.id]
    );

    await audit(client, actorId, "withdrawal_paid", withdrawal.id, {
      providerReference: providerRef,
      amountKobo: withdrawal.amount_kobo
    });

    await client.query("COMMIT");
    return { ok: true, withdrawal: updated.rows[0] };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
