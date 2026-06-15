/**
 * @fileoverview Short-lived HMAC bridge tokens for Telegram Login Widget → Auth.js session.
 *
 * After server-side Telegram hash verification, a bridge token lets the client
 * complete sign-in via the Credentials provider without storing passwords.
 *
 * @module src/lib/telegramBridge
 */

import crypto from "crypto";

/** Bridge token validity window in milliseconds (5 minutes). */
const BRIDGE_TTL_MS = 5 * 60 * 1000;

/**
 * Create a signed bridge token binding a user id to a short expiry.
 *
 * @param userId - MongoDB user document id.
 * @returns Opaque token string passed to the Credentials provider.
 */
export function createTelegramBridgeToken(userId: string): string {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET is required for Telegram bridge tokens.");

  const expiresAt = Date.now() + BRIDGE_TTL_MS;
  const payload = `${userId}:${expiresAt}`;
  const sig = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return Buffer.from(`${payload}:${sig}`).toString("base64url");
}

/**
 * Verify a bridge token and return the embedded user id.
 *
 * @param token - Token from {@link createTelegramBridgeToken}.
 * @returns User id when valid.
 * @throws When token is malformed, expired, or signature invalid.
 */
export function verifyTelegramBridgeToken(token: string): string {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET is required for Telegram bridge tokens.");

  let decoded: string;
  try {
    decoded = Buffer.from(token, "base64url").toString("utf8");
  } catch {
    throw new Error("Invalid bridge token.");
  }

  const parts = decoded.split(":");
  if (parts.length !== 3) throw new Error("Invalid bridge token.");

  const [userId, expiresAtStr, sig] = parts;
  const expiresAt = Number(expiresAtStr);
  if (!userId || !Number.isFinite(expiresAt)) throw new Error("Invalid bridge token.");

  const payload = `${userId}:${expiresAtStr}`;
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  if (sig !== expected) throw new Error("Invalid bridge token signature.");

  if (Date.now() > expiresAt) throw new Error("Bridge token has expired.");

  return userId;
}
