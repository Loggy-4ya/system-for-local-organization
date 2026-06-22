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
  resolveCarouselSlideCompositeFlags,
  resolveCompositeSlideFromSlotContent,
  serializeCarouselSlideCompositeFlagsKey,
  parseCarouselSlideCompositeFlagsKey,
} from "@/components/puck/lib/carouselMediaFill";

/** Minimal HTMLElement mock for closest/querySelector chains. */
function mockMediaRoot(options: {
  slideQuerySelector?: (selector: string) => Element | null;
  slideQuerySelectorAll?: (selector: string) => NodeListOf<Element> | Element[];
  slideFound?: boolean;
}): HTMLElement {
  const slide = {
    querySelector: options.slideQuerySelector ?? (() => null),
    querySelectorAll:
      options.slideQuerySelectorAll ??
      (() => [] as unknown as NodeListOf<Element>),
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

  it("returns true when the slide hosts multiple direct blocks", () => {
    const dropzone = {
      querySelectorAll: () => [{ id: "a" }, { id: "b" }] as unknown as NodeListOf<Element>,
    };
    const root = mockMediaRoot({
      slideQuerySelector: (selector) =>
        selector.includes("data-puck-dropzone") ? (dropzone as unknown as Element) : null,
      slideQuerySelectorAll: (selector) => {
        if (selector.includes("data-puck-component")) {
          return [{ id: "a" }, { id: "b" }] as unknown as NodeListOf<Element>;
        }
        return [] as unknown as NodeListOf<Element>;
      },
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

  it("suppresses auto fill when slide stacks multiple blocks", () => {
    const dropzone = {
      querySelectorAll: () => [{ id: "a" }, { id: "b" }] as unknown as NodeListOf<Element>,
    };
    const root = mockMediaRoot({
      slideQuerySelector: (selector) =>
        selector.includes("data-puck-dropzone") ? (dropzone as unknown as Element) : null,
      slideQuerySelectorAll: (selector) => {
        if (selector.includes("data-puck-component")) {
          return [{ id: "a" }, { id: "b" }] as unknown as NodeListOf<Element>;
        }
        return [] as unknown as NodeListOf<Element>;
      },
    });
    assert.equal(resolveCarouselMediaFill("auto", true, root), false);
  });

  it("suppresses auto fill when compositeSlide flag is set (first paint)", () => {
    const root = mockMediaRoot({ slideQuerySelector: () => null });
    assert.equal(resolveCarouselMediaFill("auto", true, root, true), false);
  });
});

describe("resolveCompositeSlideFromSlotContent", () => {
  it("returns true for multi-block slide slots", () => {
    assert.equal(
      resolveCompositeSlideFromSlotContent([
        { type: "NexusInput", props: {} },
        { type: "NexusVideo", props: {} },
      ]),
      true,
    );
  });

  it("returns true for single nested grid slide slots", () => {
    assert.equal(
      resolveCompositeSlideFromSlotContent([{ type: "NexusGrid", props: {} }]),
      true,
    );
  });
});

describe("resolveCarouselSlideCompositeFlags", () => {
  it("reads composite layout from Puck zone indexes", () => {
    const data = {
      content: [
        {
          type: "NexusCarousel",
          props: {
            id: "carousel-1",
            slides: [{ label: "Slide 1", content: [] }],
          },
        },
      ],
      zones: {},
    };

    const flags = resolveCarouselSlideCompositeFlags(data, "carousel-1", 1, {
      nodes: {
        input: { data: { type: "NexusInput", props: { id: "input" } } },
        video: { data: { type: "NexusVideo", props: { id: "video" } } },
      },
      zones: {
        "carousel-1:slides[0].content": { contentIds: ["input", "video"] },
      },
    });

    assert.deepEqual(flags, [true]);
  });

  it("falls back to inline slide content arrays", () => {
    const data = {
      content: [
        {
          type: "NexusCarousel",
          props: {
            id: "carousel-1",
            slides: [
              {
                label: "Slide 1",
                content: [
                  { type: "NexusInput", props: { id: "input" } },
                  { type: "NexusVideo", props: { id: "video" } },
                ],
              },
            ],
          },
        },
      ],
      zones: {},
    };

    const flags = resolveCarouselSlideCompositeFlags(data, "carousel-1", 1, null);
    assert.deepEqual(flags, [true]);
  });
});

describe("carousel slide composite flag serialization", () => {
  it("round-trips boolean flags through a stable string key", () => {
    const key = serializeCarouselSlideCompositeFlagsKey([true, false, true]);
    assert.equal(key, "1,0,1");
    assert.deepEqual(parseCarouselSlideCompositeFlagsKey(key, 3), [true, false, true]);
  });

  it("pads missing entries when slide count grows", () => {
    assert.deepEqual(parseCarouselSlideCompositeFlagsKey("1,0", 3), [true, false, false]);
  });
});
