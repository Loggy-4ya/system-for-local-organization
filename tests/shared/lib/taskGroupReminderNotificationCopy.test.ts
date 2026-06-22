/**
 * @fileoverview Unit tests for task group reminder notification copy.
 *
 * Run: `npm run test:task-group-reminder-notification-copy`
 * Registry: `.ai/docs/testing.md`
 *
 * @module tests/shared/lib/taskGroupReminderNotificationCopy.test
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildTaskGroupReminderNotificationCopy } from "@shared/lib/taskGroupReminderNotificationCopy";

describe("taskGroupReminderNotificationCopy", () => {
  it("builds consolidated copy for open parts", () => {
    const copy = buildTaskGroupReminderNotificationCopy("Festival prep", [
      { id: "1", title: "Design posters" },
      { id: "2", title: "Book venue" },
    ]);

    assert.equal(copy.title, "Project reminder");
    assert.match(copy.body, /Festival prep/);
    assert.match(copy.body, /2 open parts/);
    assert.match(copy.body, /Design posters/);
    assert.match(copy.body, /Book venue/);
    assert.equal(copy.variant, "info");
  });

  it("uses warning variant when project deadline passed", () => {
    const copy = buildTaskGroupReminderNotificationCopy(
      "Late project",
      [{ id: "1", title: "Part A" }],
      new Date("2020-01-01T12:00:00Z"),
    );

    assert.equal(copy.title, "Project overdue");
    assert.equal(copy.variant, "warning");
  });
});
