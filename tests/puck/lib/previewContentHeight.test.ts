/**
 * @fileoverview Unit tests for preview content height clamping.
 *
 * Module under test: src/components/puck/lib/previewContentHeight.ts
 * Registry: .ai/docs/testing.md
 * Run: `npm run test:preview-content-height`
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  clampPuckRootHeightToMeasuredContent,
  measurePreviewIframeContentHeightPx,
  PREVIEW_CONTENT_HEIGHT_OVERLAY_PAD_PX,
  PREVIEW_EMPTY_PAGE_MIN_ROOT_HEIGHT_PX,
  syncPuckRootHeightToMeasuredContent,
  syncPuckRootHeightToPreviewContent,
} from "@/components/puck/lib/previewContentHeight";

describe("measurePreviewIframeContentHeightPx", () => {
  it("returns null when the document is missing", () => {
    assert.equal(measurePreviewIframeContentHeightPx(null), null);
  });

  it("uses the content slot plus overlay padding only", () => {
    const doc = {
      documentElement: { scrollHeight: 900 },
      querySelector: () => ({ scrollHeight: 520, offsetHeight: 520 }),
      getElementById: () => ({ scrollHeight: 760, offsetHeight: 760 }),
      body: { scrollHeight: 640, offsetHeight: 640 },
    } as unknown as Document;

    assert.equal(measurePreviewIframeContentHeightPx(doc), 568);
  });

  it("prefers the content column when the slot is flex-stretched", () => {
    const doc = {
      documentElement: { scrollHeight: 2400 },
      querySelector: (selector: string) =>
        selector.includes("> div")
          ? { scrollHeight: 720, offsetHeight: 720 }
          : { scrollHeight: 2400, offsetHeight: 2400 },
      getElementById: () => null,
      body: { scrollHeight: 2400, offsetHeight: 2400 },
    } as unknown as Document;

    assert.equal(measurePreviewIframeContentHeightPx(doc, "edit"), 768);
    assert.equal(measurePreviewIframeContentHeightPx(doc, "interactive"), 720);
  });

  it("ignores inflated frame-root, body, and document scroll heights", () => {
    const doc = {
      documentElement: { scrollHeight: 12000 },
      querySelector: () => ({ scrollHeight: 640, offsetHeight: 640 }),
      getElementById: () => ({ scrollHeight: 12000, offsetHeight: 12000 }),
      body: { scrollHeight: 12000, offsetHeight: 12000 },
    } as unknown as Document;

    assert.equal(measurePreviewIframeContentHeightPx(doc), 688);
  });

  it("returns null before the content slot mounts", () => {
    const doc = {
      documentElement: { scrollHeight: 480 },
      querySelector: () => null,
      getElementById: () => null,
      body: { scrollHeight: 420, offsetHeight: 420 },
    } as unknown as Document;

    assert.equal(measurePreviewIframeContentHeightPx(doc), null);
  });
});

describe("clampPuckRootHeightToMeasuredContent", () => {
  it("does not grow rootHeight above measured content", () => {
    const result = clampPuckRootHeightToMeasuredContent(
      { rootHeight: 800, zoom: 1, autoZoom: 1 },
      600,
    );

    assert.deepEqual(result, { rootHeight: 600, zoom: 1, autoZoom: 1 });
  });

  it("preserves rootHeight when it already matches measured content", () => {
    const result = clampPuckRootHeightToMeasuredContent(
      { rootHeight: 600, zoom: 1, autoZoom: 1 },
      600,
    );

    assert.deepEqual(result, { rootHeight: 600, zoom: 1, autoZoom: 1 });
  });

  it("shrinks rootHeight when scaled preview would exceed measured content", () => {
    const result = clampPuckRootHeightToMeasuredContent(
      { rootHeight: 2400, zoom: 1.42, autoZoom: 1 },
      900,
    );

    assert.equal(result.rootHeight, 900);
    assert.equal(result.zoom, 1.42);
  });

  it("returns the original config when content height is unknown", () => {
    const config = { rootHeight: 2400, zoom: 1, autoZoom: 1 };
    assert.deepEqual(clampPuckRootHeightToMeasuredContent(config, null), config);
  });
});

describe("syncPuckRootHeightToMeasuredContent", () => {
  it("grows rootHeight when measured content exceeds the current rootHeight", () => {
    const result = syncPuckRootHeightToMeasuredContent(
      { rootHeight: 400, zoom: 1, autoZoom: 1 },
      900,
    );

    assert.equal(result.rootHeight, 900);
  });

  it("shrinks rootHeight when measured content is shorter than the current rootHeight but not below the viewport floor", () => {
    const result = syncPuckRootHeightToMeasuredContent(
      { rootHeight: 1200, zoom: 1, autoZoom: 1 },
      640,
      720,
    );

    assert.equal(result.rootHeight, 720);
  });

  it("applies the empty-page floor when measured content is shorter than the minimum", () => {
    const result = syncPuckRootHeightToMeasuredContent(
      { rootHeight: 1200, zoom: 1, autoZoom: 1 },
      120,
    );

    assert.equal(result.rootHeight, PREVIEW_EMPTY_PAGE_MIN_ROOT_HEIGHT_PX);
  });

  it("uses the canvas shell floor when measured content is shorter than the shell viewport", () => {
    const result = syncPuckRootHeightToMeasuredContent(
      { rootHeight: 200, zoom: 1, autoZoom: 1 },
      250,
      720,
    );

    assert.equal(result.rootHeight, 720);
  });

  it("uses the canvas shell floor when content height is unknown", () => {
    const result = syncPuckRootHeightToMeasuredContent(
      { rootHeight: 200, zoom: 1, autoZoom: 1 },
      null,
      720,
    );

    assert.equal(result.rootHeight, 720);
  });

  it("grows rootHeight above the shell viewport when blocks exceed the panel", () => {
    const result = syncPuckRootHeightToMeasuredContent(
      { rootHeight: 720, zoom: 1, autoZoom: 1 },
      1800,
      720,
    );

    assert.equal(result.rootHeight, 1800);
  });

  it("preserves rootHeight when it already matches the synced target", () => {
    const config = { rootHeight: 640, zoom: 1, autoZoom: 1 };
    assert.deepEqual(syncPuckRootHeightToMeasuredContent(config, 640), config);
  });

  it("preserves rootHeight in interactive mode until the canvas shell is measurable", () => {
    const config = { rootHeight: 2400, zoom: 1.42, autoZoom: 1 };
    assert.deepEqual(syncPuckRootHeightToPreviewContent(config, "interactive"), config);
  });

  it("locks interactive rootHeight to the full canvas inner viewport", () => {
    const inner = { clientHeight: 740 };
    const doc = {
      querySelector: (selector: string) => {
        if (selector.includes("PuckCanvas-inner")) return inner;
        if (selector.includes("PuckCanvas-controls")) {
          return { getBoundingClientRect: () => ({ height: 50 }) };
        }
        if (selector.includes("PuckCanvas_")) return { clientHeight: 740 };
        return null;
      },
    } as unknown as Document;

    const originalDocument = globalThis.document;
    const originalWindow = globalThis.window;
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: doc,
    });
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        matchMedia: (query: string) => ({
          matches: query.includes("min-width: 901px"),
        }),
      },
    });

    try {
      const result = syncPuckRootHeightToPreviewContent(
        { rootHeight: 2400, zoom: 1, autoZoom: 1 },
        "interactive",
      );

      assert.equal(result.rootHeight, 740);
    } finally {
      Object.defineProperty(globalThis, "document", {
        configurable: true,
        value: originalDocument,
      });
      Object.defineProperty(globalThis, "window", {
        configurable: true,
        value: originalWindow,
      });
    }
  });

  it("does not creep rootHeight when frame-root reflects puck viewport stretch", () => {
    const slot = { scrollHeight: 720, offsetHeight: 720 };
    let rootHeight = 900;

    for (let cycle = 0; cycle < 12; cycle += 1) {
      const doc = {
        querySelector: () => slot,
        getElementById: () => ({
          scrollHeight: rootHeight,
          offsetHeight: rootHeight,
        }),
        documentElement: { scrollHeight: rootHeight },
        body: { scrollHeight: rootHeight, offsetHeight: rootHeight },
      } as unknown as Document;

      const measured = measurePreviewIframeContentHeightPx(doc);
      assert.equal(measured, 720 + PREVIEW_CONTENT_HEIGHT_OVERLAY_PAD_PX);

      const result = syncPuckRootHeightToMeasuredContent(
        { rootHeight, zoom: 1, autoZoom: 1 },
        measured,
      );
      rootHeight = result.rootHeight;
    }

    assert.equal(rootHeight, 720 + PREVIEW_CONTENT_HEIGHT_OVERLAY_PAD_PX);
  });
});
