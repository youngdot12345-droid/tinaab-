import crypto from "node:crypto";
import { requireDatabase } from "../../db/db.js";
import { initializeTransaction, verifyTransaction, createTransferRecipient, initiateTransfer, verifyTransfer } from "./paystackClient.js";

function makeReference(prefix) {
  return (prefix + "_" + crypto.randomBytes(16).toString("hex")).slice(0, 50);
}

export async function initializePayment(user, amountKobo) {
  const amount = Number(amountKobo);
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    return { ok: false, reason: "Invalid payment amount." };
  }

  const db = requireDatabase();
  const reference = makeReference("tinaabpay");
  await db.query(
    `INSERT INTO payment_transactions
      (user_id,provider,provider_reference,transaction_type,amount_kobo,currency,status)
     VALUES ($1,'paystack',$2,'wallet_topup',$3,'NGN','pending')`,
    [user.id, reference, amount]
  );

  try {
    const provider = await initializeTransaction({
      email: user.email,
      amount: String(amount),
      currency: "NGN",
      reference,
      metadata: JSON.stringify({ userId: user.id, purpose: "wallet_topup" })
    });

    await db.query(
      `UPDATE payment_transactions
          SET provider_transaction_id=$1,provider_status=$2,updated_at=NOW()
        WHERE provider_reference=$3`,
      [String(provider.data?.id || ""), String(provider.data?.status || "initialized"), reference]
    );

    return {
      ok: true,
      reference,
      authorizationUrl: provider.data?.authorization_url || null,
      accessCode: provider.data?.access_code || null
    };
  } catch (error) {
    await db.query(
      `UPDATE payment_transactions SET status='failed',provider_status='initialize_failed',failure_reason=$1,updated_at=NOW() WHERE provider_reference=$2`,
      [String(error.message || "Payment initialization failed.").slice(0, 500), reference]
    );
    throw error;
  }
}

export async function verifyPayment(reference) {
  const ref = String(reference || "").trim();
  if (!ref || ref.length > 100) return { ok: false, reason: "Invalid payment reference." };

  const db = requireDatabase();
  const provider = await verifyTransaction(ref);
  const data = provider.data || {};
  const status = String(data.status || "unknown");

  await db.query(
    `UPDATE payment_transactions
        SET provider_transaction_id=$1,provider_status=$2,updated_at=NOW()
      WHERE provider_reference=$3`,
    [data.id ? String(data.id) : null, status, ref]
  );

  return { ok: true, reference: ref, status, amountKobo: Number(data.amount || 0), currency: data.currency || "NGN" };
}

export async function createPayoutAccount(userId, name, accountNumber, bankCode) {
  const safeName = String(name || "").trim().slice(0, 120);
  const safeAccount = String(accountNumber || "").replace(/\\D/g, "").slice(0, 20);
  const safeBank = String(bankCode || "").trim().slice(0, 20);
  if (!safeName || !/^\\d{10}$/.test(safeAccount) || !safeBank) {
    return { ok: false, reason: "Valid account name, 10-digit account number and bank code are required." };
  }

  const provider = await createTransferRecipient({
    type: "nuban", name: safeName, account_number: safeAccount, bank_code: safeBank, currency: "NGN"
  });
  const recipient = provider.data;
  if (!recipient?.recipient_code) return { ok: false, reason: "Payment provider did not return a recipient code." };

  const db = requireDatabase();
  await db.query(
    `INSERT INTO payout_accounts
      (user_id,provider,recipient_code,bank_code,account_name_last4,status,updated_at)
     VALUES ($1,'paystack',$2,$3,$4,'active',NOW())
     ON CONFLICT (user_id) DO UPDATE SET provider='paystack',recipient_code=EXCLUDED.recipient_code,bank_code=EXCLUDED.bank_code,account_name_last4=EXCLUDED.account_name_last4,status='active',updated_at=NOW()`,
    [userId, recipient.recipient_code, safeBank, (recipient.details?.account_number ? String(recipient.details.account_number).slice(-4) : safeAccount.slice(-4))]
  );

  return { ok: true, recipientCode: recipient.recipient_code, accountName: recipient.details?.account_name || recipient.name || safeName, accountLast4: recipient.details?.account_number ? String(recipient.details.account_number).slice(-4) : safeAccount.slice(-4) };
}

export async function sendPayout({ withdrawalId, amountKobo, recipientCode, reference }) {
  const amount = Number(amountKobo);
  if (!Number.isSafeInteger(amount) || amount <= 0) return { ok: false, reason: "Invalid payout amount." };
  const providerReference = String(reference || "").trim();
  if (!/^[a-z0-9_-]{16,50}$/.test(providerReference)) return { ok: false, reason: "Invalid payout reference." };

  const provider = await initiateTransfer({
    source: "balance", amount, recipient: recipientCode, reference: providerReference,
    reason: "Tinaab wallet withdrawal", currency: "NGN"
  });
  const data = provider.data || {};

  const db = requireDatabase();
  await db.query(
    `UPDATE withdrawal_requests SET provider_reference=$1 WHERE id=$2 AND status='pending'`,
    [String(data.reference || providerReference), withdrawalId]
  );

  return { ok: true, reference: data.reference || providerReference, status: data.status || "pending", transferCode: data.transfer_code || null };
}

export async function verifyPayout(reference) {
  const ref = String(reference || "").trim();
  if (!ref) return { ok: false, reason: "Payout reference is required." };
  const provider = await verifyTransfer(ref);
  const data = provider.data || {};
  return { ok: true, reference: ref, status: data.status || "unknown", amountKobo: Number(data.amount || 0), currency: data.currency || "NGN" };
}
