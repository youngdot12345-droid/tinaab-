import { requireDatabase } from "../db/db.js";
import { rewardToKobo } from "./walletRules.js";

function adminEmails() {
  return new Set(
    String(process.env.TINAAB_ADMIN_EMAILS || "")
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean)
  );
}

export function isAdmin(user) {
  if (!user) return false;
  if (user.role === "admin") return true;
  return adminEmails().has(String(user.email || "").toLowerCase());
}

async function writeAudit(client, actorUserId, action, targetType, targetId, metadata = {}) {
  await client.query(
    "INSERT INTO audit_logs (actor_user_id,action,target_type,target_id,metadata) VALUES ($1,$2,$3,$4,$5::jsonb)",
    [actorUserId, action, targetType, String(targetId), JSON.stringify(metadata)]
  );
}

export async function listPendingRewardClaims(limit = 50) {
  const db = requireDatabase();
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);
  const result = await db.query(
    `SELECT rc.id, rc.user_id, u.email, u.username, rc.activity_type,
            rc.server_amount_kobo, rc.activity_reference, rc.status, rc.created_at
       FROM reward_claims rc
       JOIN users u ON u.id = rc.user_id
      WHERE rc.status = 'pending'
      ORDER BY rc.id ASC
      LIMIT $1`,
    [safeLimit]
  );
  return { ok: true, claims: result.rows };
}

export async function reviewRewardClaim(claimId, reviewerId, decision, rejectionReason = "") {
  const db = requireDatabase();
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const claimResult = await client.query(
      "SELECT id,user_id,activity_type,server_amount_kobo,activity_reference,status FROM reward_claims WHERE id=$1 FOR UPDATE",
      [claimId]
    );
    const claim = claimResult.rows[0];

    if (!claim) {
      await client.query("ROLLBACK");
      return { ok: false, reason: "Reward claim not found." };
    }

    if (claim.status !== "pending") {
      await client.query("ROLLBACK");
      return { ok: false, reason: "Reward claim has already been reviewed.", claim };
    }

    if (decision === "reject") {
      const reason = String(rejectionReason || "").trim().slice(0, 500) || "Claim did not pass verification.";
      const updated = await client.query(
        "UPDATE reward_claims SET status='rejected', reviewed_at=NOW(), reviewed_by=$1, rejection_reason=$2 WHERE id=$3 RETURNING id,status,reviewed_at,rejection_reason",
        [reviewerId, reason, claim.id]
      );
      await writeAudit(client, reviewerId, "reward_claim_rejected", "reward_claim", claim.id, { userId: claim.user_id, reason });
      await client.query("COMMIT");
      return { ok: true, claim: updated.rows[0] };
    }

    if (decision !== "approve") {
      await client.query("ROLLBACK");
      return { ok: false, reason: "Decision must be approve or reject." };
    }

    const wallet = await client.query(
      "SELECT user_id,available_kobo,pending_kobo FROM wallet_accounts WHERE user_id=$1 FOR UPDATE",
      [claim.user_id]
    );

    if (!wallet.rowCount) {
      await client.query("ROLLBACK");
      return { ok: false, reason: "Wallet not found for reward recipient." };
    }

    // Recalculate from the configured server rule before crediting.
    const amountKobo = rewardToKobo(Math.floor(Number(claim.server_amount_kobo) / 100));
    const reference = "reward_claim_" + claim.id;

    const existingLedger = await client.query(
      "SELECT id FROM wallet_ledger WHERE reference=$1 LIMIT 1",
      [reference]
    );

    if (!existingLedger.rowCount) {
      await client.query(
        `INSERT INTO wallet_ledger
           (user_id,type,amount_kobo,reference,status,metadata)
         VALUES ($1,'reward_credit',$2,$3,'posted',$4::jsonb)`,
        [
          claim.user_id,
          amountKobo,
          reference,
          JSON.stringify({ rewardClaimId: claim.id, activityType: claim.activity_type })
        ]
      );

      await client.query(
        "UPDATE wallet_accounts SET available_kobo=available_kobo+$1, updated_at=NOW() WHERE user_id=$2",
        [amountKobo, claim.user_id]
      );
    }

    const updated = await client.query(
      "UPDATE reward_claims SET status='approved', reviewed_at=NOW(), reviewed_by=$1 WHERE id=$2 RETURNING id,status,reviewed_at",
      [reviewerId, claim.id]
    );

    await writeAudit(client, reviewerId, "reward_claim_approved", "reward_claim", claim.id, {
      userId: claim.user_id,
      amountKobo,
      ledgerCreated: !existingLedger.rowCount
    });

    await client.query("COMMIT");
    return { ok: true, claim: updated.rows[0], amountKobo };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
