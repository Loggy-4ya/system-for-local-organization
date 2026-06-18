/**
 * @fileoverview Unit tests for canvas toolbar island stack sync above the plugin panel.
 *
 * Module under test: src/components/puck/lib/canvasIslandStackSync.ts
 * Registry: .ai/docs/testing.md
 * Run: `npm run test:canvas-island-stack`
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  measureCanvasIslandStackBottomPx,
  shouldUseMeasuredCanvasIslandStack,
} from "@/components/puck/lib/canvasIslandStackSync";

describe("shouldUseMeasuredCanvasIslandStack", () => {
  it("always defers to smooth stack calc (measured px caused settle snap)", () => {
    assert.equal(shouldUseMeasuredCanvasIslandStack(["data-nexus-panel-opening"]), false);
    assert.equal(shouldUseMeasuredCanvasIslandStack(["data-nexus-panel-closing"]), false);
    assert.equal(shouldUseMeasuredCanvasIslandStack(["data-nexus-panel-expanding"]), false);
    assert.equal(
      shouldUseMeasuredCanvasIslandStack([
        "data-nexus-panel-layout-mutating",
        "data-nexus-panel-resizing",
      ]),
      false,
    );
    assert.equal(shouldUseMeasuredCanvasIslandStack([]), false);
  });
});

describe("measureCanvasIslandStackBottomPx", () => {
  it("returns gap when panel top aligns with canvas bottom", () => {
    assert.equal(measureCanvasIslandStackBottomPx(800, 800, 10), 10);
  });

  it("adds panel height plus gap when panel sits above canvas bottom", () => {
    assert.equal(measureCanvasIslandStackBottomPx(800, 640, 10), 170);
  });

  it("never returns negative offsets", () => {
    assert.equal(measureCanvasIslandStackBottomPx(800, 820, 10), 0);
  });

  it("returns null for invalid inputs", () => {
    assert.equal(measureCanvasIslandStackBottomPx(Number.NaN, 640, 10), null);
    assert.equal(measureCanvasIslandStackBottomPx(800, Number.NaN, 10), null);
    assert.equal(measureCanvasIslandStackBottomPx(800, 640, Number.NaN), null);
  });
});
