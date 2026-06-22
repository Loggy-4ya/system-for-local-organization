/**
 * @fileoverview Unit tests for Telegram workspace strategy resolution.
 *
 * Run: `npm run test:telegram-workspace-logic`
 * Registry: `.ai/docs/testing.md`
 *
 * @module tests/shared/lib/telegramWorkspaceLogic.test
 */

import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import {
  generateTelegramWorkspaceLinkToken,
  interpolateTelegramWorkspaceTemplate,
  meetsTelegramWorkspacePerformerThreshold,
  resolveTelegramWorkspaceStrategy,
} from "@shared/lib/telegramWorkspaceLogic";

describe("telegramWorkspaceLogic", () => {
  const previous = process.env.TELEGRAM_OPERATOR_SESSION;

  afterEach(() => {
    if (previous === undefined) delete process.env.TELEGRAM_OPERATOR_SESSION;
    else process.env.TELEGRAM_OPERATOR_SESSION = previous;
  });

  beforeEach(() => {
    delete process.env.TELEGRAM_OPERATOR_SESSION;
  });

  it("resolves auto to manual_link when operator session is missing", () => {
    const resolved = resolveTelegramWorkspaceStrategy("auto", {
      enabled: true,
      defaultStrategy: "auto",
    });
    assert.equal(resolved, "manual_link");
  });

  it("resolves auto to user_session when full worker env is configured", () => {
    process.env.TELEGRAM_OPERATOR_SESSION = "1:test-session";
    process.env.TELEGRAM_API_ID = "12345";
    process.env.TELEGRAM_API_HASH = "hash";
    process.env.TELEGRAM_BOT_TOKEN = "token";
    const resolved = resolveTelegramWorkspaceStrategy("auto", {
      enabled: true,
      defaultStrategy: "auto",
    });
    assert.equal(resolved, "user_session");
    delete process.env.TELEGRAM_API_ID;
    delete process.env.TELEGRAM_API_HASH;
    delete process.env.TELEGRAM_BOT_TOKEN;
  });

  it("inherits institution default strategy", () => {
    const resolved = resolveTelegramWorkspaceStrategy("inherit", {
      enabled: true,
      defaultStrategy: "disabled",
    });
    assert.equal(resolved, "disabled");
  });

  it("interpolates template placeholders", () => {
    const text = interpolateTelegramWorkspaceTemplate("Project {{title}} — token {{linkToken}}", {
      title: "Spring fest",
      groupId: "abc",
      linkToken: "xyz",
    });
    assert.match(text, /Spring fest/);
    assert.match(text, /xyz/);
  });

  it("generates link tokens of expected length", () => {
    const token = generateTelegramWorkspaceLinkToken();
    assert.equal(token.length, 12);
  });

  it("checks performer threshold", () => {
    assert.equal(meetsTelegramWorkspacePerformerThreshold(2, 2), true);
    assert.equal(meetsTelegramWorkspacePerformerThreshold(1, 2), false);
  });
});
