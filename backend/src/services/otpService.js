import crypto from "node:crypto";

const CODE_TTL_MS = 10 * 60 * 1000;

export function createEmailCode() {
  const code = String(crypto.randomInt(100000, 1000000));
  const hash = crypto.createHash("sha256").update(code).digest("hex");
  return {
    code,
    hash,
    expiresAt: new Date(Date.now() + CODE_TTL_MS)
  };
}

export function hashEmailCode(code) {
  return crypto.createHash("sha256").update(String(code)).digest("hex");
}

export function isValidCode(inputCode, storedHash, expiresAt) {
  if (!inputCode || !storedHash || Date.now() > new Date(expiresAt).getTime()) return false;
  const supplied = Buffer.from(hashEmailCode(inputCode), "hex");
  const stored = Buffer.from(storedHash, "hex");
  return supplied.length === stored.length && crypto.timingSafeEqual(supplied, stored);
}
