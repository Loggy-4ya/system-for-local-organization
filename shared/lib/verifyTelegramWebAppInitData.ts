/**
 * @fileoverview Verify Telegram Mini App `initData` HMAC per official Bot API docs.
 *
 * @see https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 *
 * Tests: `tests/shared/lib/verifyTelegramWebAppInitData.test.ts` — `npm run test:telegram-init-data`
 *
 * @module shared/lib/verifyTelegramWebAppInitData
 */

import crypto from "crypto";

/** Parsed Telegram user embedded in Web App initData. */
export interface TelegramWebAppUser {
  /** Numeric Telegram user id. */
  id: number;
  /** First name from Telegram profile. */
  first_name: string;
  /** Optional last name. */
  last_name?: string;
  /** Optional @username without at-sign. */
  username?: string;
  /** Optional BCP-47 language code. */
  language_code?: string;
  /** Optional profile photo URL. */
  photo_url?: string;
  /** True when user allows bot to message them. */
  allows_write_to_pm?: boolean;
}

/** Verified Mini App init payload. */
export interface VerifiedTelegramWebAppInitData {
  /** Parsed Telegram user from the `user` field. */
  user: TelegramWebAppUser;
  /** Unix auth timestamp from initData. */
  authDate: number;
  /** Optional start parameter from deep link. */
  startParam: string | null;
  /** Optional chat type context. */
  chatType: string | null;
  /** Optional chat instance id. */
  chatInstance: string | null;
}

/** Maximum age of initData in seconds (24 hours). */
export const TELEGRAM_WEB_APP_AUTH_MAX_AGE_SEC = 86_400;

/**
 * Build the Telegram Web App secret key from the bot token.
 *
 * @param botToken - BotFather token.
 * @returns HMAC secret key bytes.
 */
export function buildTelegramWebAppSecretKey(botToken: string): Buffer {
  return crypto.createHmac("sha256", "WebAppData").update(botToken).digest();
}

/**
 * Compute the data-check string from initData query params (excluding hash).
 *
 * @param params - Parsed initData query parameters.
 * @returns Sorted `key=value` lines joined by newlines.
 */
export function buildTelegramWebAppDataCheckString(params: URLSearchParams): string {
  const pairs: string[] = [];

  params.forEach((value, key) => {
    if (key !== "hash") {
      pairs.push(`${key}=${value}`);
    }
  });

  pairs.sort();
  return pairs.join("\n");
}

/**
 * Verify initData HMAC and parse the embedded user object.
 *
 * @param initData - Raw `Telegram.WebApp.initData` query string.
 * @param botToken - BotFather token.
 * @returns Verified user payload.
 * @throws When hash is invalid, user missing, or auth_date expired.
 */
export function verifyTelegramWebAppInitData(
  initData: string,
  botToken: string,
): VerifiedTelegramWebAppInitData {
  if (!initData.trim()) {
    throw new Error("Telegram initData is required.");
  }

  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) {
    throw new Error("Telegram initData is missing hash.");
  }

  const secretKey = buildTelegramWebAppSecretKey(botToken);
  const dataCheckString = buildTelegramWebAppDataCheckString(params);
  const computed = crypto
    .createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  if (computed !== hash) {
    throw new Error("Invalid Telegram initData hash.");
  }

  const authDateRaw = params.get("auth_date");
  const authDate = Number(authDateRaw);
  if (!Number.isFinite(authDate)) {
    throw new Error("Telegram initData is missing auth_date.");
  }

  const nowSec = Math.floor(Date.now() / 1000);
  if (nowSec - authDate > TELEGRAM_WEB_APP_AUTH_MAX_AGE_SEC) {
    throw new Error("Telegram initData has expired.");
  }

  const userRaw = params.get("user");
  if (!userRaw) {
    throw new Error("Telegram initData is missing user.");
  }

  let user: TelegramWebAppUser;
  try {
    user = JSON.parse(userRaw) as TelegramWebAppUser;
  } catch {
    throw new Error("Telegram initData user JSON is invalid.");
  }

  if (!user?.id || !user.first_name) {
    throw new Error("Telegram initData user is incomplete.");
  }

  return {
    user,
    authDate,
    startParam: params.get("start_param"),
    chatType: params.get("chat_type"),
    chatInstance: params.get("chat_instance"),
  };
}
