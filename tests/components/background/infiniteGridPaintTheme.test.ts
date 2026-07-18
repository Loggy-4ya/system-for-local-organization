/**
 * @fileoverview Unit tests for InfiniteGrid theme paint resolution.
 *
 * Run: `npm run test:run -- infinite-grid-paint-theme`
 * Registry: .ai/docs/testing.md
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveInfiniteGridPaintIsLight } from "@/components/background/infiniteGridPaintTheme";

describe("resolveInfiniteGridPaintIsLight", () => {
  it("prefers DOM data-theme over resolvedTheme system", () => {
    assert.equal(resolveInfiniteGridPaintIsLight("system", "light"), true);
    assert.equal(resolveInfiniteGridPaintIsLight("system", "dark"), false);
  });

  it("falls back to resolvedTheme when DOM attribute is absent", () => {
    assert.equal(resolveInfiniteGridPaintIsLight("light", null), true);
    assert.equal(resolveInfiniteGridPaintIsLight("dark", null), false);
    assert.equal(resolveInfiniteGridPaintIsLight("system", null), false);
  });
});
