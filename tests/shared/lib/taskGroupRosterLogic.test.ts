/**
 * @fileoverview Unit tests for task group planned roster helpers.
 *
 * Module under test: shared/lib/taskGroupRosterLogic.ts
 * Registry: .ai/docs/testing.md
 * Run: `npm run test:task-group-roster-logic`
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  dedupeTaskGroupRosterInputs,
  formatTaskForumTopicTitle,
  mergeGroupPerformerUserIds,
} from "@shared/lib/taskGroupRosterLogic";

describe("mergeGroupPerformerUserIds", () => {
  it("merges roster and child task performers uniquely", () => {
    const merged = mergeGroupPerformerUserIds(
      ["aaa", "bbb"],
      ["bbb", "ccc"],
    );
    assert.deepEqual(merged.sort(), ["aaa", "bbb", "ccc"]);
  });
});

describe("dedupeTaskGroupRosterInputs", () => {
  it("dedupes by user id and caps size", () => {
    const rows = dedupeTaskGroupRosterInputs([
      { userId: "aaa", roleLabel: "Lead" },
      { userId: "aaa", roleLabel: "Duplicate" },
      { userId: "bbb" },
    ]);
    assert.equal(rows.length, 2);
    assert.equal(rows[0]?.roleLabel, "Lead");
  });
});

describe("formatTaskForumTopicTitle", () => {
  it("truncates long task titles for Telegram topics", () => {
    const title = formatTaskForumTopicTitle("x".repeat(200));
    assert.ok(title.length <= 128);
    assert.ok(title.endsWith("…"));
  });
});
