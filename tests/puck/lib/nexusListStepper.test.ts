/**
 * @fileoverview Tests for list stepper id helpers.
 *
 * Run: npm run test:nexus-list-stepper
 * Registry: .ai/docs/testing.md
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  nexusListStepId,
  nexusListStepIndex,
} from "../../../src/components/puck/lib/nexusListStepper";

describe("nexusListStepper", () => {
  it("nexusListStepId and nexusListStepIndex round-trip", () => {
    assert.equal(nexusListStepId(3), "step-3");
    assert.equal(nexusListStepIndex("step-3"), 3);
    assert.equal(nexusListStepIndex("other"), null);
  });
});
