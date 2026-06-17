/**
 * @fileoverview Unit tests for Telegram Mini App initData verification.
 *
 * Module under test: shared/lib/verifyTelegramWebAppInitData.ts
 * Registry: .ai/docs/testing.md
 * Run: `npm run test:telegram-init-data`
 */

import assert from "node:assert/strict";
import crypto from "crypto";
import { describe, it } from "node:test";

import {
  buildTelegramWebAppDataCheckString,
  buildTelegramWebAppSecretKey,
  verifyTelegramWebAppInitData,
} from "@shared/lib/verifyTelegramWebAppInitData";

const BOT_TOKEN = "123456789:AAFakeTokenForTests";

/**
 * Build a signed initData query string for tests.
 *
 * @param overrides - Optional field overrides.
 * @returns Raw initData query string.
 */
function buildSignedInitData(overrides?: {
  authDate?: number;
  user?: Record<string, unknown>;
}): string {
  const authDate = overrides?.authDate ?? Math.floor(Date.now() / 1000);
  const user = JSON.stringify(
    overrides?.user ?? { id: 424242, first_name: "Mini", username: "mini_user" },
  );

  const params = new URLSearchParams({
    auth_date: String(authDate),
    user,
  });

  const secretKey = buildTelegramWebAppSecretKey(BOT_TOKEN);
  const dataCheckString = buildTelegramWebAppDataCheckString(params);
  const hash = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");
  params.set("hash", hash);

  return params.toString();
}

describe("verifyTelegramWebAppInitData", () => {
  it("accepts a valid signed payload", () => {
    const initData = buildSignedInitData();
    const verified = verifyTelegramWebAppInitData(initData, BOT_TOKEN);

    assert.equal(verified.user.id, 424242);
    assert.equal(verified.user.first_name, "Mini");
    assert.equal(verified.user.username, "mini_user");
  });

  it("rejects tampered hash", () => {
    const initData = `${buildSignedInitData()}&tampered=1`;

    assert.throws(
      () => verifyTelegramWebAppInitData(initData, BOT_TOKEN),
      /Invalid Telegram initData hash/,
    );
  });

  it("rejects expired auth_date", () => {
    const initData = buildSignedInitData({ authDate: Math.floor(Date.now() / 1000) - 90_000 });

    assert.throws(
      () => verifyTelegramWebAppInitData(initData, BOT_TOKEN),
      /expired/,
    );
  });
});
