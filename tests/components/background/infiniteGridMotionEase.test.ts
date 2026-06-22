/**
 * @fileoverview Unit tests for InfiniteGrid motion easing helpers.
 *
 * Module under test: src/components/background/infiniteGridMotionEase.ts
 * Registry: .ai/docs/testing.md
 * Run: `npm run test:infinite-grid-motion-ease`
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  isGridMotionScaleSettled,
  shouldStopGridMotionLoop,
  stepGridMotionScale,
} from "@/components/background/infiniteGridMotionEase";

describe("stepGridMotionScale", () => {
  it("eases toward static without overshooting", () => {
    let scale = 1;
    for (let i = 0; i < 120; i += 1) {
      scale = stepGridMotionScale(scale, 0, 16);
    }
    assert.ok(scale < 0.01);
    assert.ok(scale >= 0);
  });

  it("eases toward dynamic from a frozen start", () => {
    let scale = 0;
    for (let i = 0; i < 120; i += 1) {
      scale = stepGridMotionScale(scale, 1, 16);
    }
    assert.ok(scale > 0.99);
    assert.ok(scale <= 1);
  });

  it("reports settled after easing toward static", () => {
    let scale = 1;
    for (let i = 0; i < 120; i += 1) {
      scale = stepGridMotionScale(scale, 0, 16);
    }
    assert.equal(isGridMotionScaleSettled(scale, true), true);
  });
});

describe("isGridMotionScaleSettled", () => {
  it("detects static and dynamic settled states", () => {
    assert.equal(isGridMotionScaleSettled(0, true), true);
    assert.equal(isGridMotionScaleSettled(0.05, true), false);
    assert.equal(isGridMotionScaleSettled(1, false), true);
    assert.equal(isGridMotionScaleSettled(0.5, false), false);
  });
});

describe("shouldStopGridMotionLoop", () => {
  it("stops only for settled static mode", () => {
    assert.equal(shouldStopGridMotionLoop(0, true), true);
    assert.equal(shouldStopGridMotionLoop(0.5, true), false);
    assert.equal(shouldStopGridMotionLoop(1, false), false);
    assert.equal(shouldStopGridMotionLoop(0, false), false);
  });
});
