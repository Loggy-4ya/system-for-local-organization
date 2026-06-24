/**
 * @fileoverview Unit tests for Telegram bot task list formatting.
 *
 * Run: `npm run test:telegram-bot-task-logic`
 * Registry: `.ai/docs/testing.md`
 *
 * @module tests/shared/lib/telegramBotTaskLogic.test
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatTelegramBotTasksMessage,
  resolveTelegramBotTaskTarget,
} from "@shared/lib/telegramBotTaskLogic";

describe("telegramBotTaskLogic", () => {
  const rows = [
    {
      id: "aaaaaaaaaaaaaaaaaaaaaaaa",
      title: "Part A",
      status: "in_progress" as const,
      dueAt: null,
      groupTitle: "Capstone",
      categoryLabel: "Build",
      roleLabel: "Lead",
      reportMediaAllowed: false,
    },
    {
      id: "bbbbbbbbbbbbbbbbbbbbbbbb",
      title: "Part B",
      status: "completed" as const,
      dueAt: null,
      groupTitle: "Capstone",
      categoryLabel: null,
      roleLabel: null,
      reportMediaAllowed: true,
    },
  ];

  it("formats open tasks with templates", () => {
    const text = formatTelegramBotTasksMessage(
      rows,
      {
        headerTemplate: "Project {{title}}",
        lineTemplate: "{{index}}. {{taskTitle}} — {{statusLabel}}",
        footerTemplate: "Use /task_report {{index}}",
        emptyTemplate: "All done",
      },
      { title: "Capstone" },
    );
    assert.match(text, /Project Capstone/);
    assert.match(text, /Part A/);
    assert.doesNotMatch(text, /Part B/);
    assert.match(text, /\/task_report/);
  });

  it("resolves task targets by index", () => {
    const open = rows.filter((row) => row.status !== "completed");
    assert.equal(resolveTelegramBotTaskTarget(open, "1"), rows[0].id);
  });
});
