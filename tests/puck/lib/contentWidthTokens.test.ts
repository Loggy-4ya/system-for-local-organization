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
  DEFAULT_CONTENT_WIDTH,
  GLOBAL_LAYOUT_CONTENT_WIDTH,
} from "@/components/puck/lib/contentWidthTokens";

describe("clampPageContentWidth", () => {
  it("preserves full bleed for Puck page layout", () => {
    assert.equal(clampPageContentWidth("full"), "full");
    assert.equal(contentWidthContainerStyle("full").maxWidth, "100%");
  });

  it("preserves contained presets", () => {
    assert.equal(clampPageContentWidth("lg"), "lg");
    assert.equal(clampPageContentWidth("xl"), "xl");
  });
});

describe("global layout width", () => {
  it("defaults chrome to 1400px independent of per-page overrides", () => {
    assert.equal(GLOBAL_LAYOUT_CONTENT_WIDTH, "xl");
    assert.equal(DEFAULT_CONTENT_WIDTH, "xl");
    assert.equal(contentWidthContainerStyle(GLOBAL_LAYOUT_CONTENT_WIDTH).maxWidth, "1400px");
  });
});

describe("resolveContentBandMaxWidth", () => {
  it("fills page container for matching xl tokens", async () => {
    const { resolveContentBandMaxWidth } = await import(
      "@/components/puck/lib/contentWidthTokens"
    );
    assert.equal(resolveContentBandMaxWidth("xl", undefined, "xl"), "100%");
  });

  it("upgrades legacy lg blocks on xl pages to fill the container", async () => {
    const { resolveContentBandMaxWidth } = await import(
      "@/components/puck/lib/contentWidthTokens"
    );
    assert.equal(resolveContentBandMaxWidth("lg", undefined, "xl"), "100%");
  });

  it("keeps intentionally narrow blocks below page width", async () => {
    const { resolveContentBandMaxWidth } = await import(
      "@/components/puck/lib/contentWidthTokens"
    );
    assert.equal(resolveContentBandMaxWidth("sm", undefined, "xl"), "800px");
  });
});

describe("STATIC_ROUTE_CONTENT_WIDTH", () => {
  it("aligns every built-in static route with the global chrome band (1400px)", async () => {
    const {
      STATIC_ROUTE_CONTENT_WIDTH,
      STATIC_DEFAULT_CONTENT_WIDTH,
      resolveStaticRouteContentWidth,
    } = await import("@/components/puck/lib/contentWidthTokens");

    assert.equal(STATIC_DEFAULT_CONTENT_WIDTH, "xl");

    for (const token of Object.values(STATIC_ROUTE_CONTENT_WIDTH)) {
      assert.equal(token, "xl");
      assert.equal(contentWidthContainerStyle(token).maxWidth, "1400px");
    }

    assert.equal(resolveStaticRouteContentWidth("/"), "xl");
    assert.equal(resolveStaticRouteContentWidth("/profile"), "xl");
    assert.equal(resolveStaticRouteContentWidth("/profile/settings"), "xl");
    assert.equal(resolveStaticRouteContentWidth("/admin/global-layout"), "xl");
    assert.equal(resolveStaticRouteContentWidth("/login"), "xl");
  });
});
