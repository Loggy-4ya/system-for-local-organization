/**
 * Run: npm run test:grid-edit-sizing
 * Registry: .ai/docs/testing.md
 *
 * Module under test: src/components/puck/lib/gridEditSizing.ts
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  resolveCarouselAwareGridCellSpanRow,
  resolveCarouselAwareGridGap,
} from "@/components/puck/lib/gridEditSizing";

describe("resolveCarouselAwareGridGap", () => {
  it("tightens default MD gap inside carousel slides", () => {
    assert.equal(resolveCarouselAwareGridGap("16px", true), "8px");
    assert.equal(resolveCarouselAwareGridGap("16px", false), "16px");
    assert.equal(resolveCarouselAwareGridGap("24px", true), "24px");
  });
});

describe("resolveCarouselAwareGridCellSpanRow", () => {
  it("forces single-row placement for carousel grids regardless of stored span", () => {
    assert.equal(resolveCarouselAwareGridCellSpanRow("2", true), 1);
    assert.equal(resolveCarouselAwareGridCellSpanRow("3", true), 1);
    assert.equal(resolveCarouselAwareGridCellSpanRow("2", false), 2);
  });
});
