/**
 * @fileoverview Unit tests for mobile panel open animation logic.
 *
 * Module under test: src/components/puck/lib/mobilePanelLayout.ts
 * Related: src/components/puck/NexusMobilePanelOpenAnimation.tsx
 * Registry: .ai/docs/testing.md
 * Run: `npm run test:mobile-panel-open-animation`
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  shouldSkipMobilePanelOpenAnimation,
  resolveMobilePanelOpenHeightPx,
} from "@/components/puck/lib/mobilePanelLayout";

describe("shouldSkipMobilePanelOpenAnimation", () => {
  it("returns false when current height is undefined", () => {
    assert.equal(shouldSkipMobilePanelOpenAnimation(undefined, 300), false);
  });

  it("returns false when current height is significantly below target height (e.g. 0px)", () => {
    assert.equal(shouldSkipMobilePanelOpenAnimation(0, 300), false);
    assert.equal(shouldSkipMobilePanelOpenAnimation(100, 300), false);
  });

  it("returns true when current height is close to target height (>= 85%)", () => {
    assert.equal(shouldSkipMobilePanelOpenAnimation(255, 300), true); // exactly 85%
    assert.equal(shouldSkipMobilePanelOpenAnimation(280, 300), true); // > 85%
  });

  it("returns false when current height is just below 85% of target height", () => {
    assert.equal(shouldSkipMobilePanelOpenAnimation(254, 300), false); // just below 85%
  });
});

describe("resolveMobilePanelOpenHeightPx", () => {
  it("returns a valid clamped height based on viewport height", () => {
    const height = resolveMobilePanelOpenHeightPx(1000);
    // Min height is 160px, max height is 480px (or 60vh of 1000 = 600px, capped at 480px)
    assert.ok(height >= 160, "height should be at least 160px");
    assert.ok(height <= 480, "height should be at most 480px");
  });

  it("clamps small viewports to min height", () => {
    const height = resolveMobilePanelOpenHeightPx(300);
    assert.equal(height, 160, "height should clamp to min 160px");
  });
});
