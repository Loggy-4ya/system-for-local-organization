/**
 * @fileoverview Unit tests for shared drag edge auto-scroll helpers.
 *
 * Run: npm run test:drag-scroll
 * Registry: .ai/docs/testing.md
 *
 * @module tests/lib/dragAutoScrollLogic.test
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DRAG_SCROLL_EDGE_PX,
  resolveDragScrollDelta,
} from "@/lib/dragAutoScrollLogic";

describe("resolveDragScrollDelta", () => {
  const bounds = { top: 100, bottom: 500 };

  it("returns 0 when the pointer is away from both edges", () => {
    assert.equal(resolveDragScrollDelta(300, bounds), 0);
  });

  it("scrolls up when the pointer is near the top edge", () => {
    const delta = resolveDragScrollDelta(100, bounds);
    assert.ok(delta < 0);
  });

  it("scrolls down when the pointer is near the bottom edge", () => {
    const delta = resolveDragScrollDelta(500, bounds);
    assert.ok(delta > 0);
  });

  it("ramps speed closer to the edge", () => {
    const nearEdge = resolveDragScrollDelta(bounds.bottom - 4, bounds);
    const farther = resolveDragScrollDelta(bounds.bottom - DRAG_SCROLL_EDGE_PX + 20, bounds);

    assert.ok(Math.abs(nearEdge) > Math.abs(farther));
  });
});
