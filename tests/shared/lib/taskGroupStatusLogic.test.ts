/**
 * @fileoverview Unit tests for task group aggregate status helpers.
 *
 * Run: `npm run test:task-group-status-logic`
 * Registry: `.ai/docs/testing.md`
 *
 * @module tests/shared/lib/taskGroupStatusLogic.test
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  allGroupTasksTerminal,
  shouldCompleteTaskGroup,
  statusAfterGroupActivation,
} from "@shared/lib/taskGroupStatusLogic";

describe("taskGroupStatusLogic", () => {
  it("activates draft groups when first task is linked", () => {
    assert.equal(statusAfterGroupActivation("draft"), "active");
    assert.equal(statusAfterGroupActivation("active"), "active");
  });

  it("detects when all child tasks are terminal", () => {
    assert.equal(allGroupTasksTerminal(["completed", "cancelled"]), true);
    assert.equal(allGroupTasksTerminal(["completed", "in_progress"]), false);
    assert.equal(allGroupTasksTerminal([]), false);
  });

  it("auto-completes active groups when every part is done", () => {
    assert.equal(
      shouldCompleteTaskGroup("active", ["completed", "cancelled"]),
      true,
    );
    assert.equal(shouldCompleteTaskGroup("draft", ["completed"]), false);
    assert.equal(shouldCompleteTaskGroup("active", ["in_progress"]), false);
  });
});
