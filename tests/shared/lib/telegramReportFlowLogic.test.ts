/**
 * @fileoverview Unit tests for Telegram report wizard flow helpers.
 *
 * Run: `npm run test:telegram-report-flow-logic`
 * Registry: `.ai/docs/testing.md`
 *
 * @module tests/shared/lib/telegramReportFlowLogic.test
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  normalizeTelegramReportFlowSteps,
  plainTelegramTextToReportDescription,
  resolveEffectiveTelegramReportFlowSteps,
} from "@shared/lib/telegramReportFlowLogic";

describe("telegramReportFlowLogic", () => {
  it("normalizes invalid configured steps", () => {
    assert.deepEqual(normalizeTelegramReportFlowSteps(["media", "media", "invalid"]), ["media"]);
    assert.deepEqual(normalizeTelegramReportFlowSteps([]), ["description"]);
  });

  it("drops media when task disallows proof attachments", () => {
    assert.deepEqual(
      resolveEffectiveTelegramReportFlowSteps(["description", "media"], false),
      ["description"],
    );
    assert.deepEqual(
      resolveEffectiveTelegramReportFlowSteps(["media", "description"], true),
      ["media", "description"],
    );
  });

  it("wraps plain Telegram text as HTML", () => {
    const html = plainTelegramTextToReportDescription("Done\nline two");
    assert.match(html, /<p>Done<br\/>line two<\/p>/);
  });
});
