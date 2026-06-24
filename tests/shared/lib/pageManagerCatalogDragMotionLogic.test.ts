/**
 * @fileoverview Tests for Page Manager catalog drag preview helpers.
 *
 * Run: `npm run test:page-manager-catalog-drag-motion-logic`
 * Registry: `.ai/docs/testing.md`
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  resolveManagerCatalogDestinationIndex,
  resolveManagerCatalogPreviewShiftOffsets,
} from "@shared/lib/pageManagerCatalogDragMotionLogic";

describe("resolveManagerCatalogDestinationIndex", () => {
  it("resolves before and after insert positions", () => {
    assert.equal(resolveManagerCatalogDestinationIndex(0, 2, "before"), 1);
    assert.equal(resolveManagerCatalogDestinationIndex(0, 1, "after"), 1);
    assert.equal(resolveManagerCatalogDestinationIndex(3, 1, "before"), 1);
    assert.equal(resolveManagerCatalogDestinationIndex(1, 1, "before"), 1);
  });
});

describe("resolveManagerCatalogPreviewShiftOffsets", () => {
  it("returns no shifts when the destination equals the source", () => {
    assert.equal(
      resolveManagerCatalogPreviewShiftOffsets(4, 2, 2, "before").size,
      0,
    );
  });

  it("shifts siblings down when dragging forward", () => {
    const shifts = resolveManagerCatalogPreviewShiftOffsets(4, 0, 2, "after");
    assert.equal(shifts.get(1), -1);
    assert.equal(shifts.get(2), -1);
    assert.equal(shifts.has(0), false);
  });

  it("shifts siblings up when dragging backward", () => {
    const shifts = resolveManagerCatalogPreviewShiftOffsets(4, 3, 0, "before");
    assert.equal(shifts.get(0), 1);
    assert.equal(shifts.get(1), 1);
    assert.equal(shifts.get(2), 1);
    assert.equal(shifts.has(3), false);
  });
});
