/**
 * @fileoverview Unit tests for task status transitions.
 *
 * Run: `npm run test:task-status-logic`
 * Registry: `.ai/docs/testing.md`
 *
 * @module tests/shared/lib/taskStatusLogic.test
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canTransitionTaskStatus,
  shouldMarkTaskOverdue,
  statusAfterTaskReport,
} from "@shared/lib/taskStatusLogic";

describe("taskStatusLogic", () => {
  it("marks overdue when due date passed", () => {
    const past = new Date(Date.now() - 60_000);
    assert.equal(
      shouldMarkTaskOverdue({ status: "dispatched", dueAt: past }),
      true,
    );
    assert.equal(
      shouldMarkTaskOverdue({ status: "completed", dueAt: past }),
      false,
    );
  });

  it("allows dispatched → acknowledged path", () => {
    assert.equal(canTransitionTaskStatus("dispatched", "acknowledged"), true);
    assert.equal(canTransitionTaskStatus("draft", "completed"), false);
  });

  it("moves to submitted after report", () => {
    assert.equal(statusAfterTaskReport("in_progress"), "submitted");
  });
});
