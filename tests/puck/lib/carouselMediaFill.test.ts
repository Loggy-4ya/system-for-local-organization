/**
 * Run: npm run test:carousel-media-fill
 * Registry: .ai/docs/testing.md
 *
 * Module under test: src/components/puck/lib/carouselMediaFill.ts
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  isCompositeCarouselSlideContent,
  resolveCarouselEditSlideFloorPx,
  resolveCarouselMediaFill,
} from "@/components/puck/lib/carouselMediaFill";

/** Minimal HTMLElement mock for closest/querySelector chains. */
function mockMediaRoot(options: {
  slideQuerySelector?: (selector: string) => Element | null;
  slideFound?: boolean;
}): HTMLElement {
  const slide = {
    querySelector: options.slideQuerySelector ?? (() => null),
  };

  return {
    closest: (selector: string) =>
      options.slideFound === false || selector !== ".nexus-carousel__slide" ? null : slide,
  } as unknown as HTMLElement;
}

describe("isCompositeCarouselSlideContent", () => {
  it("returns false when media is not inside a carousel slide", () => {
    const root = mockMediaRoot({ slideFound: false });
    assert.equal(isCompositeCarouselSlideContent(root), false);
  });

  it("returns false when carousel sits inside a grid cell but slide has no inner grid", () => {
    const root = mockMediaRoot({
      slideQuerySelector: () => null,
    });
    assert.equal(isCompositeCarouselSlideContent(root), false);
  });

  it("returns true when the slide contains a nested grid layout", () => {
    const grid = { tag: "grid" };
    const root = mockMediaRoot({
      slideQuerySelector: (selector) =>
        selector.includes("nexus-grid") ? (grid as unknown as Element) : null,
    });
    assert.equal(isCompositeCarouselSlideContent(root), true);
  });
});

describe("resolveCarouselEditSlideFloorPx", () => {
  it("uses edit row minimum when slide width is unknown", () => {
    assert.equal(resolveCarouselEditSlideFloorPx(0, 240), 240);
  });

  it("uses the larger of 16:9 fill height and the auto min height", () => {
    assert.equal(resolveCarouselEditSlideFloorPx(480, 240), 270);
    assert.equal(resolveCarouselEditSlideFloorPx(800, 240), 450);
  });
});

describe("resolveCarouselMediaFill", () => {
  it("fills carousel slides in auto mode when not composite", () => {
    const root = mockMediaRoot({ slideQuerySelector: () => null });
    assert.equal(resolveCarouselMediaFill("auto", true, root), true);
  });

  it("suppresses auto fill when slide hosts a nested grid", () => {
    const grid = { tag: "grid" };
    const root = mockMediaRoot({
      slideQuerySelector: (selector) =>
        selector.includes("nexus-grid") ? (grid as unknown as Element) : null,
    });
    assert.equal(resolveCarouselMediaFill("auto", true, root), false);
  });
});
