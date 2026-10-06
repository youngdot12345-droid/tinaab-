import crypto from "node:crypto";
import { requireDatabase } from "../db/db.js";

function makeReference() {
  return "tr_" + crypto.randomBytes(12).toString("hex");
}

export async function transferToTinaabWallet(senderUserId, username, userIdNumber, amountKobo) {
  const cleanUsername = String(username || "").trim();
  const recipientId = Number(userIdNumber);
  if (!cleanUsername || cleanUsername.length > 50) return { ok:false, reason:"A valid username is required." };
  if (!Number.isSafeInteger(recipientId) || recipientId <= 0) return { ok:false, reason:"A valid Tinaab ID number is required." };
  if (!Number.isSafeInteger(amountKobo) || amountKobo <= 0) return { ok:false, reason:"Invalid transfer amount." };

  const db = requireDatabase();
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const recipient = await client.query(
      "SELECT id, username, first_name, last_name FROM users WHERE id=$1 AND LOWER(username)=LOWER($2) LIMIT 1 FOR SHARE",
      [recipientId, cleanUsername]
    );
    if (!recipient.rowCount) {
      await client.query("ROLLBACK");
      return { ok:false, reason:"Tinaab user not found. Check the username and ID number." };
    }
    if (Number(recipient.rows[0].id) === Number(senderUserId)) {
      await client.query("ROLLBACK");
      return { ok:false, reason:"You cannot transfer money to your own wallet." };
    }

    const sender = await client.query("SELECT available_kobo FROM wallet_accounts WHERE user_id=$1 FOR UPDATE", [senderUserId]);
    const receiver = await client.query("SELECT user_id FROM wallet_accounts WHERE user_id=$1 FOR UPDATE", [recipientId]);
    if (!sender.rowCount || !receiver.rowCount) {
      await client.query("ROLLBACK");
      return { ok:false, reason:"Wallet not found." };
    }
    const available = Number(sender.rows[0].available_kobo);
    if (amountKobo > available) {
      await client.query("ROLLBACK");
      return { ok:false, reason:"Insufficient available balance." };
    }

    const reference = makeReference();
    const transfer = await client.query(
      "INSERT INTO wallet_transfers (sender_user_id,recipient_user_id,amount_kobo,reference,status) VALUES ($1,$2,$3,$4,'completed') RETURNING id,reference,amount_kobo,status,created_at",
      [senderUserId, recipientId, amountKobo, reference]
    );
    await client.query("UPDATE wallet_accounts SET available_kobo=available_kobo-$1,updated_at=NOW() WHERE user_id=$2", [amountKobo, senderUserId]);
    await client.query("UPDATE wallet_accounts SET available_kobo=available_kobo+$1,updated_at=NOW() WHERE user_id=$2", [amountKobo, recipientId]);
    await client.query(
      "INSERT INTO wallet_ledger (user_id,type,amount_kobo,reference,status,metadata) VALUES ($1,'wallet_transfer_sent',$2,$3,'posted',$4::jsonb),($5,'wallet_transfer_received',$2,$3 || '_in','posted',$6::jsonb)",
      [senderUserId,-amountKobo,reference,JSON.stringify({recipientUserId:recipientId}),recipientId,JSON.stringify({senderUserId})]
    );
    await client.query("COMMIT");
    return { ok:true, transfer:transfer.rows[0], recipient:{id:recipientId,username:recipient.rows[0].username,firstName:recipient.rows[0].first_name,lastName:recipient.rows[0].last_name} };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
}
