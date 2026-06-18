/**
 * @fileoverview Unit tests for grid cell array reorder helpers.
 *
 * Module under test: src/components/puck/lib/gridItemArrayReorder.ts
 * Registry: .ai/docs/testing.md
 * Run: `npm run test:grid-item-array-reorder`
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  reorderGridItemArray,
  resolveGridCellDropIndex,
} from "@/components/puck/lib/gridItemArrayReorder";

describe("reorderGridItemArray", () => {
  it("moves an entry forward", () => {
    const items = [{ label: "A" }, { label: "B" }, { label: "C" }];
    assert.deepEqual(reorderGridItemArray(items, 0, 2), [
      { label: "B" },
      { label: "C" },
      { label: "A" },
    ]);
  });

  it("no-ops on equal indices", () => {
    const items = [{ label: "A" }, { label: "B" }];
    assert.deepEqual(reorderGridItemArray(items, 1, 1), items);
  });
});

describe("resolveGridCellDropIndex", () => {
  it("returns the hovered cell index", () => {
    assert.equal(resolveGridCellDropIndex(0, 2, 3), 2);
  });
});
