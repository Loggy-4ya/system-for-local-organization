/**
 * Run: npm run test:grid-cell-placement
 * Registry: .ai/docs/testing.md
 *
 * Module under test: src/components/puck/lib/gridCellPlacement.ts
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { resolveGridCellPlacements } from "@/components/puck/lib/gridCellPlacement";

describe("resolveGridCellPlacements", () => {
  it("packs half-width cells left-to-right, top-to-bottom on a 12-column grid", () => {
    const cells = Array.from({ length: 5 }, () => ({ spanCol: 6, spanRow: 1 }));
    const placements = resolveGridCellPlacements(12, cells);

    assert.deepEqual(placements, [
      { gridColumn: "1 / span 6", gridRow: "1 / span 1" },
      { gridColumn: "7 / span 6", gridRow: "1 / span 1" },
      { gridColumn: "1 / span 6", gridRow: "2 / span 1" },
      { gridColumn: "7 / span 6", gridRow: "2 / span 1" },
      { gridColumn: "1 / span 6", gridRow: "3 / span 1" },
    ]);
  });

  it("continues row-major order when earlier cells use taller row spans", () => {
    const placements = resolveGridCellPlacements(12, [
      { spanCol: 6, spanRow: 2 },
      { spanCol: 6, spanRow: 2 },
      { spanCol: 6, spanRow: 1 },
      { spanCol: 6, spanRow: 1 },
    ]);

    assert.deepEqual(placements, [
      { gridColumn: "1 / span 6", gridRow: "1 / span 2" },
      { gridColumn: "7 / span 6", gridRow: "1 / span 2" },
      { gridColumn: "1 / span 6", gridRow: "3 / span 1" },
      { gridColumn: "7 / span 6", gridRow: "3 / span 1" },
    ]);
  });
});
