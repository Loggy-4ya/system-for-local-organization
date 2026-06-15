/**
 * @fileoverview Unit tests for content width tokens and page chrome decoupling.
 *
 * Module under test: src/components/puck/lib/contentWidthTokens.ts
 *
 * Run: `npm run test:content-width-tokens`
 * Registry: .ai/docs/testing.md
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  clampPageContentWidth,
  contentWidthContainerStyle,
  MAX_PROJECT_CONTENT_WIDTH,
  GLOBAL_LAYOUT_CONTENT_WIDTH,
} from "@/components/puck/lib/contentWidthTokens";

describe("clampPageContentWidth", () => {
  it("maps legacy full page layout to project max (xl)", () => {
    assert.equal(clampPageContentWidth("full"), MAX_PROJECT_CONTENT_WIDTH);
  });

  it("preserves contained presets within project max", () => {
    assert.equal(clampPageContentWidth("lg"), "lg");
    assert.equal(clampPageContentWidth("xl"), "xl");
  });
});

describe("global layout width", () => {
  it("uses fixed xl band independent of page layout", () => {
    assert.equal(GLOBAL_LAYOUT_CONTENT_WIDTH, "xl");
    assert.equal(contentWidthContainerStyle(GLOBAL_LAYOUT_CONTENT_WIDTH).maxWidth, "1400px");
  });
});
