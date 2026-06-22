/**
 * @fileoverview Unit tests for Telegram chat id conversion helpers.
 *
 * Module under test: shared/lib/telegramChannelIdLogic.ts
 * Registry: .ai/docs/testing.md
 * Run: `npm run test:telegram-channel-id-logic`
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  botChatIdToGramJsChannelId,
  extractTelegramInviteHash,
  gramJsChannelIdToBotChatId,
} from "@shared/lib/telegramChannelIdLogic";

describe("telegramChannelIdLogic", () => {
  it("round-trips supergroup ids", () => {
    const channelId = 1234567890n;
    const chatId = gramJsChannelIdToBotChatId(channelId);
    assert.equal(chatId, -1001234567890);
    assert.equal(botChatIdToGramJsChannelId(chatId), channelId);
  });

  it("extracts invite hashes from t.me links", () => {
    assert.equal(
      extractTelegramInviteHash("https://t.me/+AbCdEfGhIjK"),
      "AbCdEfGhIjK",
    );
    assert.equal(
      extractTelegramInviteHash("https://t.me/joinchat/legacyHash"),
      "legacyHash",
    );
  });
});
