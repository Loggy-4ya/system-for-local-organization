/**
 * @fileoverview Unit tests for layout ↔ canvas grid offset sync.
 *
 * Run: `npm run test:run -- infinite-grid-sync-store`
 * Registry: .ai/docs/testing.md
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  modGridOffset,
  publishInfiniteGridSync,
  resolveMirroredGridOffsets,
} from "@/components/background/infiniteGridSyncStore";

describe("modGridOffset", () => {
  it("wraps negative values into the cell range", () => {
    assert.equal(modGridOffset(-10, 150), 140);
  });
});

describe("resolveMirroredGridOffsets", () => {
  it("shifts layout offsets by the mirror viewport position", () => {
    publishInfiniteGridSync({
      offsetX: 40,
      offsetY: 80,
      isLightTheme: true,
      cellGridSize: 150,
    });

    const mirrored = resolveMirroredGridOffsets(
      {
        offsetX: 40,
        offsetY: 80,
        isLightTheme: true,
        cellGridSize: 150,
        revision: 1,
      },
      { left: 320, top: 160 },
    );

    assert.equal(mirrored.offsetX, modGridOffset(40 + 320, 150));
    assert.equal(mirrored.offsetY, modGridOffset(80 + 160, 150));
  });
});
