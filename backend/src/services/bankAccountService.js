import crypto from "node:crypto";
import { requireDatabase } from "../db/db.js";

function getSecret(name) {
  const value = String(process.env[name] || "").trim();
  if (!value) {
    const error = new Error(name + " is not configured.");
    error.statusCode = 503;
    throw error;
  }
  return value;
}

function normalizeAccountNumber(value) {
  const accountNumber = String(value || "").replace(/\s+/g, "");
  if (!/^\d{10}$/.test(accountNumber)) throw new Error("Nigerian bank account number must contain exactly 10 digits.");
  return accountNumber;
}

function encryptAccountNumber(accountNumber) {
  const keyText = getSecret("BANK_ACCOUNT_ENCRYPTION_KEY");
  const key = /^[0-9a-fA-F]{64}$/.test(keyText)
    ? Buffer.from(keyText, "hex")
    : Buffer.from(keyText, "base64");
  if (key.length !== 32) throw new Error("BANK_ACCOUNT_ENCRYPTION_KEY must decode to 32 bytes.");
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(accountNumber, "utf8"), cipher.final()]);
  return {
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64")
  };
}

function hashAccountNumber(accountNumber) {
  return crypto.createHmac("sha256", getSecret("BANK_ACCOUNT_HASH_SECRET")).update(accountNumber).digest("hex");
}

function mask(last4) {
  return "••••" + last4;
}

export async function addBankAccount(userId, input) {
  const bankCode = String(input?.bankCode || "").trim();
  const bankName = String(input?.bankName || "").trim();
  const accountName = String(input?.accountName || "").trim();
  const accountNumber = normalizeAccountNumber(input?.accountNumber);

  if (!bankCode || bankCode.length > 30) throw new Error("A valid bank code is required.");
  if (!bankName || bankName.length > 120) throw new Error("A valid bank name is required.");
  if (!accountName || accountName.length > 160) throw new Error("A valid account name is required.");

  const encrypted = encryptAccountNumber(accountNumber);
  const accountHash = hashAccountNumber(accountNumber);
  const db = requireDatabase();
  const client = await db.connect();

  try {
    await client.query("BEGIN");
    const duplicate = await client.query(
      "SELECT id FROM bank_accounts WHERE user_id=$1 AND account_number_hash=$2 AND status='active' LIMIT 1",
      [userId, accountHash]
    );
    if (duplicate.rowCount) {
      await client.query("ROLLBACK");
      return { ok:false, reason:"This bank account is already saved." };
    }

    const existing = await client.query(
      "SELECT COUNT(*)::int AS count FROM bank_accounts WHERE user_id=$1 AND status='active'",
      [userId]
    );
    const isDefault = Number(existing.rows[0].count) === 0;

    const inserted = await client.query(
      `INSERT INTO bank_accounts
       (user_id,bank_code,bank_name,account_name,account_number_ciphertext,account_number_iv,account_number_tag,account_number_hash,account_number_last4,status,is_default)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'active',$10)
       RETURNING id,bank_code,bank_name,account_name,account_number_last4,status,is_default,created_at,updated_at`,
      [userId, bankCode, bankName, accountName, encrypted.ciphertext, encrypted.iv, encrypted.tag, accountHash, accountNumber.slice(-4), isDefault]
    );

    await client.query("COMMIT");
    return { ok:true, bankAccount:{...inserted.rows[0], accountNumberMasked:mask(inserted.rows[0].account_number_last4)} };
  } catch (error) {
    await client.query("ROLLBACK");
    if (error.code === "23505") return { ok:false, reason:"This bank account is already saved or another default account is being created." };
    throw error;
  } finally {
    client.release();
  }
}

export async function listBankAccounts(userId) {
  const db = requireDatabase();
  const result = await db.query(
    "SELECT id,bank_code,bank_name,account_name,account_number_last4,status,is_default,created_at,updated_at FROM bank_accounts WHERE user_id=$1 ORDER BY is_default DESC, id DESC",
    [userId]
  );
  return {
    ok:true,
    bankAccounts:result.rows.map(row => ({...row, accountNumberMasked:mask(row.account_number_last4)}))
  };
}

export async function setDefaultBankAccount(userId, bankAccountId) {
  const db = requireDatabase();
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const account = await client.query(
      "SELECT id FROM bank_accounts WHERE id=$1 AND user_id=$2 AND status='active' FOR UPDATE",
      [bankAccountId, userId]
    );
    if (!account.rowCount) {
      await client.query("ROLLBACK");
      return { ok:false, reason:"Bank account not found." };
    }
    await client.query("UPDATE bank_accounts SET is_default=FALSE, updated_at=NOW() WHERE user_id=$1", [userId]);
    await client.query("UPDATE bank_accounts SET is_default=TRUE, updated_at=NOW() WHERE id=$1", [bankAccountId]);
    await client.query("COMMIT");
    return { ok:true, message:"Default bank account updated." };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function removeBankAccount(userId, bankAccountId) {
  const db = requireDatabase();
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const account = await client.query(
      "SELECT id,is_default FROM bank_accounts WHERE id=$1 AND user_id=$2 AND status='active' FOR UPDATE",
      [bankAccountId, userId]
    );
    if (!account.rowCount) {
      await client.query("ROLLBACK");
      return { ok:false, reason:"Bank account not found." };
    }

    const pending = await client.query(
      "SELECT 1 FROM withdrawal_requests WHERE bank_account_id=$1 AND status IN ('pending','processing') LIMIT 1",
      [bankAccountId]
    );
    if (pending.rowCount) {
      await client.query("ROLLBACK");
      return { ok:false, reason:"This bank account cannot be removed while a withdrawal is processing." };
    }

    await client.query("UPDATE bank_accounts SET status='removed',is_default=FALSE,updated_at=NOW() WHERE id=$1", [bankAccountId]);

    if (account.rows[0].is_default) {
      await client.query(
        "UPDATE bank_accounts SET is_default=TRUE,updated_at=NOW() WHERE id=(SELECT id FROM bank_accounts WHERE user_id=$1 AND status='active' ORDER BY id DESC LIMIT 1)",
        [userId]
      );
    }

    await client.query("COMMIT");
    return { ok:true, message:"Bank account removed." };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
