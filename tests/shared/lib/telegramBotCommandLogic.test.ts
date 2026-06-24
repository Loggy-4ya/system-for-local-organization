/**
 * @fileoverview Unit tests for Telegram bot command parsing.
 *
 * Run: `npm run test:telegram-bot-command-logic`
 * Registry: `.ai/docs/testing.md`
 *
 * @module tests/shared/lib/telegramBotCommandLogic.test
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isTelegramReportWizardControlCommand,
  parseTelegramBotCommand,
  shouldCancelTelegramBotSessionForCommand,
} from "@shared/lib/telegramBotCommandLogic";

describe("telegramBotCommandLogic", () => {
  it("strips @bot suffix from commands", () => {
    const parsed = parseTelegramBotCommand("/tasks@nexus_bot");
    assert.equal(parsed?.name, "/tasks");
  });

  it("parses command arguments", () => {
    const parsed = parseTelegramBotCommand("/task_report 2");
    assert.equal(parsed?.name, "/task_report");
    assert.equal(parsed?.arg, "2");
  });

  it("treats wizard helpers as non-cancelling", () => {
    assert.equal(isTelegramReportWizardControlCommand("/done"), true);
    assert.equal(shouldCancelTelegramBotSessionForCommand("/done"), false);
    assert.equal(shouldCancelTelegramBotSessionForCommand("/tasks"), true);
    assert.equal(shouldCancelTelegramBotSessionForCommand("/cancel"), false);
  });
});
