/**
 * @fileoverview Unit tests for Telegram bot user registration classification.
 *
 * Run: `npm run test:telegram-bot-user-logic`
 * Registry: `.ai/docs/testing.md`
 *
 * @module tests/shared/lib/telegramBotUserLogic.test
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  classifyTelegramBotUser,
  formatTelegramBotMissingFieldLabels,
} from "@shared/lib/telegramBotUserLogic";

describe("telegramBotUserLogic", () => {
  it("classifies missing user as unknown", () => {
    assert.equal(classifyTelegramBotUser(null), "unknown");
  });

  it("classifies sparse linked account as incomplete", () => {
    const kind = classifyTelegramBotUser({
      name: "Ada",
      surname: null,
      phone: null,
      specialty: null,
      group: null,
      avatar: null,
      sociumRoles: [],
      telegramId: 42,
      personalDataConsentAt: null,
    });
    assert.equal(kind, "incomplete");
  });

  it("classifies complete Telegram Mini App user as ready", () => {
    const kind = classifyTelegramBotUser({
      name: "Ada",
      surname: "Lovelace",
      phone: "+380501234567",
      specialty: "CS",
      group: "K-41",
      avatar: "/uploads/avatars/a.png",
      sociumRoles: [],
      telegramId: 42,
      personalDataConsentAt: new Date(),
    });
    assert.equal(kind, "ready");
  });

  it("lists missing field labels for incomplete profiles", () => {
    const labels = formatTelegramBotMissingFieldLabels({
      name: "Ada",
      surname: null,
      phone: null,
      specialty: "CS",
      group: "K-41",
      avatar: "/uploads/avatars/a.png",
      sociumRoles: [],
      telegramId: 42,
      personalDataConsentAt: null,
    });
    assert.match(labels, /Surname/);
    assert.match(labels, /Phone number/);
    assert.match(labels, /Personal data processing consent/);
  });
});
