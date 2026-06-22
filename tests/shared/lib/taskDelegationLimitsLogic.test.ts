/**
 * @fileoverview Unit tests for task delegation limits normalization.
 *
 * Run: `npm run test:task-delegation-limits-logic`
 * Registry: `.ai/docs/testing.md`
 *
 * @module tests/shared/lib/taskDelegationLimitsLogic.test
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  normalizeTaskDelegationLimits,
  serializeTaskDelegationLimits,
} from "@shared/lib/taskDelegationLimitsLogic";
import { DEFAULT_TASK_DELEGATION_LIMITS } from "@shared/constants/taskSettings";

describe("taskDelegationLimitsLogic", () => {
  it("returns defaults when stored map is empty", () => {
    assert.deepEqual(normalizeTaskDelegationLimits(null), DEFAULT_TASK_DELEGATION_LIMITS);
    assert.deepEqual(normalizeTaskDelegationLimits({}), DEFAULT_TASK_DELEGATION_LIMITS);
  });

  it("merges partial overrides from string keys", () => {
    const merged = normalizeTaskDelegationLimits({ "4": 2, "6": 1 });
    assert.equal(merged[4], 2);
    assert.equal(merged[6], 1);
    assert.equal(merged[0], null);
  });

  it("serializes all access levels for admin API", () => {
    const serialized = serializeTaskDelegationLimits(DEFAULT_TASK_DELEGATION_LIMITS);
    assert.equal(Object.keys(serialized).length, 7);
    assert.equal(serialized["0"], null);
  });
});
