/**
 * @fileoverview Unit tests for preview content height clamping.
 *
 * Module under test: src/components/puck/lib/previewContentHeight.ts
 * Registry: .ai/docs/testing.md
 * Run: `npm run test:preview-content-height`
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  clampPuckRootHeightToMeasuredContent,
  measurePreviewIframeContentHeightPx,
} from "@/components/puck/lib/previewContentHeight";

describe("measurePreviewIframeContentHeightPx", () => {
  it("returns null when the document is missing", () => {
    assert.equal(measurePreviewIframeContentHeightPx(null), null);
  });
});

describe("clampPuckRootHeightToMeasuredContent", () => {
  it("does not grow rootHeight above measured content", () => {
    const result = clampPuckRootHeightToMeasuredContent(
      { rootHeight: 800, zoom: 1, autoZoom: 1 },
      600,
    );

    assert.deepEqual(result, { rootHeight: 600, zoom: 1, autoZoom: 1 });
  });

  it("preserves rootHeight when it already matches measured content", () => {
    const result = clampPuckRootHeightToMeasuredContent(
      { rootHeight: 600, zoom: 1, autoZoom: 1 },
      600,
    );

    assert.deepEqual(result, { rootHeight: 600, zoom: 1, autoZoom: 1 });
  });

  it("shrinks rootHeight when scaled preview would exceed measured content", () => {
    const result = clampPuckRootHeightToMeasuredContent(
      { rootHeight: 2400, zoom: 1.42, autoZoom: 1 },
      900,
    );

    assert.equal(result.rootHeight, 634);
    assert.equal(result.zoom, 1.42);
  });

  it("returns the original config when content height is unknown", () => {
    const config = { rootHeight: 2400, zoom: 1, autoZoom: 1 };
    assert.deepEqual(clampPuckRootHeightToMeasuredContent(config, null), config);
  });
});
