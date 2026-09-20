import crypto from "node:crypto";
import { requireDatabase } from "../db/db.js";

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function normalizeUsername(username) {
  return String(username || "").trim().toLowerCase();
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.scryptSync(String(password), salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, expected] = String(stored || "").split(":");
  if (!salt || !expected) return false;
  const actual = crypto.scryptSync(String(password), salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(actual, "hex"), Buffer.from(expected, "hex"));
}

function createToken() {
  return crypto.randomBytes(32).toString("base64url");
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function validateSignup(input) {
  const email = normalizeEmail(input.email);
  const firstName = String(input.firstName || "").trim();
  const lastName = String(input.lastName || "").trim();
  const username = normalizeUsername(input.username);
  const password = String(input.password || "");
  if (!email.includes("@") || !firstName || !lastName || !/^[a-z0-9_]{3,30}$/.test(username)) {
    return { ok: false, reason: "Enter valid signup details." };
  }
  if (password.length < 10) return { ok: false, reason: "Password must be at least 10 characters." };
  return { ok: true, email, firstName, lastName, username, password };
}

export async function signup(input) {
  const data = validateSignup(input);
  if (!data.ok) return data;
  const db = requireDatabase();
  const passwordHash = hashPassword(data.password);
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const userResult = await client.query(
      `INSERT INTO users (email, first_name, last_name, username, password_hash)
       VALUES ($1,$2,$3,$4,$5) RETURNING id, email, first_name, last_name, username, email_verified`,
      [data.email, data.firstName, data.lastName, data.username, passwordHash]
    );
    const user = userResult.rows[0];
    const code = String(crypto.randomInt(100000, 1000000));
    const codeHash = crypto.createHash("sha256").update(code).digest("hex");
    await client.query(
      `INSERT INTO email_codes (user_id, email, code_hash, expires_at) VALUES ($1,$2,$3,NOW() + INTERVAL '10 minutes')`,
      [user.id, user.email, codeHash]
    );
    await client.query("INSERT INTO wallet_accounts (user_id) VALUES ($1)", [user.id]);
    await client.query("COMMIT");
    if (process.env.NODE_ENV !== "production") console.log(`[Tinaab development email code] ${user.email}: ${code}`);
    return { ok: true, user, message: "Account created. Check your email for the verification code." };
  } catch (error) {
    await client.query("ROLLBACK");
    if (error.code === "23505") return { ok: false, reason: "Email or username is already in use." };
    throw error;
  } finally {
    client.release();
  }
}

export async function verifyEmail(emailInput, codeInput) {
  const email = normalizeEmail(emailInput);
  const code = String(codeInput || "");
  const db = requireDatabase();
  const result = await db.query(
    `SELECT ec.id, ec.user_id, ec.code_hash, ec.expires_at
     FROM email_codes ec JOIN users u ON u.id = ec.user_id
     WHERE LOWER(ec.email)=LOWER($1) AND ec.used_at IS NULL
     ORDER BY ec.id DESC LIMIT 1`, [email]
  );
  const record = result.rows[0];
  if (!record || new Date(record.expires_at).getTime() < Date.now()) return { ok: false, reason: "Code expired or invalid." };
  const supplied = crypto.createHash("sha256").update(code).digest("hex");
  if (supplied !== record.code_hash) return { ok: false, reason: "Code expired or invalid." };
  await db.query("UPDATE email_codes SET used_at=NOW() WHERE id=$1", [record.id]);
  await db.query("UPDATE users SET email_verified=TRUE WHERE id=$1", [record.user_id]);
  return { ok: true, message: "Email verified successfully." };
}

export async function login(emailInput, password) {
  const email = normalizeEmail(emailInput);
  const db = requireDatabase();
  const result = await db.query("SELECT id,email,first_name,last_name,username,email_verified,password_hash FROM users WHERE LOWER(email)=LOWER($1) LIMIT 1", [email]);
  const user = result.rows[0];
  if (!user || !verifyPassword(password, user.password_hash)) return { ok: false, reason: "Invalid email or password." };
  if (!user.email_verified) return { ok: false, reason: "Verify your email before logging in." };
  const token = createToken();
  await db.query("INSERT INTO sessions (user_id, token_hash, expires_at) VALUES ($1,$2,$3)", [user.id, hashToken(token), new Date(Date.now() + SESSION_TTL_MS)]);
  delete user.password_hash;
  return { ok: true, token, user };
}

export async function getUserFromToken(token) {
  if (!token) return null;
  const db = requireDatabase();
  const result = await db.query(
    `SELECT u.id,u.email,u.first_name,u.last_name,u.username,u.email_verified
     FROM sessions s JOIN users u ON u.id=s.user_id
     WHERE s.token_hash=$1 AND s.revoked_at IS NULL AND s.expires_at > NOW() LIMIT 1`,
    [hashToken(token)]
  );
  return result.rows[0] || null;
}

export async function logout(token) {
  if (!token) return;
  const db = requireDatabase();
  await db.query("UPDATE sessions SET revoked_at=NOW() WHERE token_hash=$1", [hashToken(token)]);
}
