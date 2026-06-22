/**
 * @fileoverview Unit tests for task reminder notification copy helpers.
 *
 * Run: `npm run test:task-reminder-notification-copy`
 * Registry: `.ai/docs/testing.md`
 *
 * @module tests/shared/lib/taskReminderNotificationCopy.test
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildTaskReminderNotificationCopy } from "@shared/lib/taskReminderNotificationCopy";

describe("taskReminderNotificationCopy", () => {
  it("builds info copy for open tasks", () => {
    const copy = buildTaskReminderNotificationCopy({
      title: "Clean hall",
      status: "in_progress",
      dueAt: "2026-06-10T18:00:00.000Z",
    });
    assert.equal(copy.variant, "info");
    assert.match(copy.body, /Clean hall/);
  });

  it("builds warning copy for overdue tasks", () => {
    const copy = buildTaskReminderNotificationCopy({
      title: "Report",
      status: "overdue",
      dueAt: null,
    });
    assert.equal(copy.variant, "warning");
    assert.match(copy.title, /overdue/i);
  });
});
