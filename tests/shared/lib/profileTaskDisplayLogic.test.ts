/**
 * @fileoverview Tests for profile task display helpers.
 *
 * Run: `npm run test:profile-task-display-logic`
 * Registry: `.ai/docs/testing.md`
 *
 * @module tests/shared/lib/profileTaskDisplayLogic.test
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { TaskListRow } from "@shared/domains/TaskDomain";
import {
  isProfileOpenTaskStatus,
  profileTaskStatusBadgeClass,
  sortProfileTaskRows,
} from "@shared/lib/profileTaskDisplayLogic";

/** Minimal task list row fixture for sorting tests. */
function taskRow(status: TaskListRow["status"], updatedAt: string): TaskListRow {
  return {
    id: `${status}-${updatedAt}`,
    title: status,
    status,
    dueAt: null,
    tags: [],
    categoryId: null,
    categoryLabel: null,
    authorUserId: "author",
    authorDisplayName: "Author",
    performerCount: 1,
    groupId: null,
    groupTitle: null,
    createdAt: new Date(updatedAt),
    updatedAt: new Date(updatedAt),
  };
}

describe("isProfileOpenTaskStatus", () => {
  it("treats completed tasks as closed on profile panels", () => {
    assert.equal(isProfileOpenTaskStatus("completed"), false);
    assert.equal(isProfileOpenTaskStatus("in_progress"), true);
  });
});

describe("profileTaskStatusBadgeClass", () => {
  it("marks overdue tasks as warning badges", () => {
    assert.equal(profileTaskStatusBadgeClass("overdue"), "badge-warning");
  });
});

describe("sortProfileTaskRows", () => {
  it("ranks overdue tasks ahead of in-progress work", () => {
    const sorted = sortProfileTaskRows([
      taskRow("in_progress", "2026-06-22T12:00:00.000Z"),
      taskRow("overdue", "2026-06-21T12:00:00.000Z"),
    ]);

    assert.equal(sorted[0]?.status, "overdue");
  });
});
