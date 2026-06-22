/**
 * @fileoverview Unit tests for telegram group command formatting.
 *
 * Run: `npm run test:telegram-group-command-logic`
 * Registry: `.ai/docs/testing.md`
 *
 * @module tests/shared/lib/telegramGroupCommandLogic.test
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatTelegramProjectStatusMessage,
  formatTelegramTaskDonePickerMessage,
  resolveTelegramTaskDoneTarget,
} from "@shared/lib/telegramGroupCommandLogic";

describe("telegramGroupCommandLogic", () => {
  const tasks = [
    { id: "aaaaaaaaaaaaaaaaaaaaaaaa", title: "Part A", status: "in_progress" as const },
    { id: "bbbbbbbbbbbbbbbbbbbbbbbb", title: "Part B", status: "completed" as const },
    { id: "cccccccccccccccccccccccc", title: "Part C", status: "dispatched" as const },
  ];

  it("formats status with open parts only", () => {
    const text = formatTelegramProjectStatusMessage("Capstone", tasks);
    assert.match(text, /Capstone/);
    assert.match(text, /Part A/);
    assert.match(text, /Part C/);
    assert.doesNotMatch(text, /Part B/);
  });

  it("resolves task_done by 1-based index", () => {
    const open = tasks.filter((t) => t.status !== "completed");
    const id = resolveTelegramTaskDoneTarget(open, "2");
    assert.equal(id, "cccccccccccccccccccccccc");
  });

  it("resolves single open task without arg", () => {
    const open = [{ id: "only", title: "Solo", status: "in_progress" as const }];
    assert.equal(resolveTelegramTaskDoneTarget(open, undefined), "only");
  });

  it("returns picker message when arg missing and multiple open", () => {
    const open = tasks.filter((t) => t.status !== "completed");
    const text = formatTelegramTaskDonePickerMessage(open);
    assert.match(text, /\/task_done 1/);
  });
});
