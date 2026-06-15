/**
 * @fileoverview Unit tests for Puck block page-root visibility models.
 *
 * Module under test: src/components/puck/lib/blockRenderVisibility.ts
 * Registry: .ai/docs/testing.md
 * Run: `npm run test:block-render-visibility`
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  NEXUS_VIDEO_DEFAULT_LAYOUT,
  PUCK_BLOCK_VISIBILITY_REGISTRY,
  evaluateAllBlockPageVisibility,
  estimateMediaBlockHeightPx,
  findInvisibleBlocksOnPageRoot,
  isMediaBlockVisibleOnPage,
  resolveImageBlockLayoutModel,
  resolveMediaFillSlide,
  resolveVideoBlockLayoutModel,
} from "../../../src/components/puck/lib/blockRenderVisibility";
import { MEDIA_ASPECT_RATIO_DEFAULTS } from "../../../src/components/puck/lib/mediaAspectRatio";

describe("resolveMediaFillSlide", () => {
  it("auto fill applies only inside a carousel slide", () => {
    assert.equal(resolveMediaFillSlide("auto", "pageRoot"), false);
    assert.equal(resolveMediaFillSlide("auto", "carouselSlide"), true);
    assert.equal(resolveMediaFillSlide("auto", "carouselComposite"), false);
  });

  it("fill mode applies everywhere including page root", () => {
    assert.equal(resolveMediaFillSlide("fill", "pageRoot"), true);
    assert.equal(resolveMediaFillSlide("fill", "carouselSlide"), true);
  });

  it("natural mode never fill-slides", () => {
    assert.equal(resolveMediaFillSlide("natural", "carouselSlide"), false);
  });
});

describe("resolveVideoBlockLayoutModel", () => {
  it("default video props use aspect-ratio frame on page root (visible)", () => {
    const model = resolveVideoBlockLayoutModel(NEXUS_VIDEO_DEFAULT_LAYOUT, "pageRoot");
    assert.equal(model.fillSlide, false);
    assert.equal(model.hasAspectRatioFrame, true);
    assert.ok(model.aspectRatio > 0);
    assert.equal(isMediaBlockVisibleOnPage(model, "pageRoot"), true);
  });

  it("carouselFill fill on page root collapses (regression guard)", () => {
    const model = resolveVideoBlockLayoutModel(
      { ...NEXUS_VIDEO_DEFAULT_LAYOUT, carouselFill: "fill" },
      "pageRoot",
    );
    assert.equal(model.fillSlide, true);
    assert.equal(isMediaBlockVisibleOnPage(model, "pageRoot"), false);
    assert.equal(estimateMediaBlockHeightPx(model, 960), 0);
  });

  it("auto fill inside carousel slide uses fill-slide layout", () => {
    const model = resolveVideoBlockLayoutModel(NEXUS_VIDEO_DEFAULT_LAYOUT, "carouselSlide");
    assert.equal(model.fillSlide, true);
    assert.equal(isMediaBlockVisibleOnPage(model, "carouselSlide"), true);
  });

  it("estimates non-zero height for default YouTube video at 960px width", () => {
    const model = resolveVideoBlockLayoutModel(NEXUS_VIDEO_DEFAULT_LAYOUT, "pageRoot");
    const height = estimateMediaBlockHeightPx(model, 960);
    assert.ok(height >= 180, `expected visible height, got ${height}px`);
  });
});

describe("resolveImageBlockLayoutModel", () => {
  it("default image auto fill is visible on page root via aspect frame", () => {
    const model = resolveImageBlockLayoutModel(
      {
        aspectRatioPreset: MEDIA_ASPECT_RATIO_DEFAULTS.preset,
        aspectRatioCustom: MEDIA_ASPECT_RATIO_DEFAULTS.custom,
        carouselFill: "auto",
      },
      "pageRoot",
    );
    assert.equal(model.fillSlide, false);
    assert.equal(isMediaBlockVisibleOnPage(model, "pageRoot"), true);
  });
});

describe("PUCK_BLOCK_VISIBILITY_REGISTRY", () => {
  it("includes every Puck component from puckConfig", () => {
    const expected = [
      "NexusSection",
      "NexusGrid",
      "NexusGridItem",
      "NexusColumns",
      "NexusSpacer",
      "NexusHeading",
      "NexusText",
      "NexusImage",
      "NexusQuote",
      "NexusVideo",
      "NexusAccordion",
      "NexusList",
      "NexusButton",
      "NexusTabs",
      "NexusCarousel",
      "NexusInput",
      "NexusNewsCard",
      "NexusUserBadge",
      "NexusStatCard",
      "NexusAvatar",
    ];
    const registered = PUCK_BLOCK_VISIBILITY_REGISTRY.map((spec) => spec.blockType).sort();
    assert.deepEqual(registered, [...expected].sort());
  });

  it("all blocks are visible on page root with default props", () => {
    const invisible = findInvisibleBlocksOnPageRoot();
    assert.deepEqual(
      invisible,
      [],
      invisible.map((b) => `${b.blockType}: ${b.reason ?? "unknown"}`).join("; "),
    );
  });

  it("NexusVideo specifically renders with measurable height", () => {
    const video = evaluateAllBlockPageVisibility().find((b) => b.blockType === "NexusVideo");
    assert.ok(video);
    assert.equal(video?.visibleOnPageRoot, true);
  });
});
