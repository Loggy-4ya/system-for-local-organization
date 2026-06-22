/**
 * @fileoverview Unit tests for telegram operator env helpers.
 *
 * Run: `npm run test:telegram-operator-env`
 * Registry: `.ai/docs/testing.md`
 *
 * @module tests/shared/lib/telegramOperatorEnv.test
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isTelegramOperatorEnvConfigured,
  missingTelegramOperatorEnvKeys,
} from "@shared/lib/telegramOperatorEnv";

describe("telegramOperatorEnv", () => {
  it("requires api id, hash, session, and bot token", () => {
    assert.equal(
      isTelegramOperatorEnvConfigured({
        apiId: "12345",
        apiHash: "hash",
        operatorSession: "session",
        botToken: "token",
      }),
      true,
    );

    const missing = missingTelegramOperatorEnvKeys({
      apiId: "12345",
      operatorSession: "session",
    });
    assert.ok(missing.includes("TELEGRAM_API_HASH"));
    assert.ok(missing.includes("TELEGRAM_BOT_TOKEN"));
  });
});
