/**
 * @fileoverview Unit tests for canvas drop-target sizing during Edit-mode drag hover.
 *
 * Module under test: src/components/puck/lib/canvasDropTargetLogic.ts
 * Registry: .ai/docs/testing.md
 * Run: `npm run test:canvas-drop-target`
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  CANVAS_DROP_PROBE_TOP_INSET_PX,
  CANVAS_DROP_TARGET_DEFAULT_DRAGGED_PX,
  CANVAS_DROP_TARGET_MIN_PX,
  CANVAS_DROP_PREVIEW_MAX_PX,
  CANVAS_DRAG_MARKER_ATTR,
  areDistinctCarouselSlidesInSameCarousel,
  countCanvasDropZoneDepth,
  isCanvasDragActiveInPreview,
  isCanvasDragGhostElement,
  isPreviewDocumentReady,
  isCanvasDropZoneMoreSpecific,
  isCanvasRootDropZone,
  isNestedCanvasDropZone,
  isPointInsideRect,
  parseCarouselSlideIndexFromZoneCompound,
  pickInnermostDropZone,
  pickDeepestDropZone,
  resolveCanvasDropOverlayGeometry,
  resolveCanvasDropTargetMetrics,
  resolveCanvasDropProbePoint,
  resolveCanvasSlotKind,
  resolveSectionDropZoneAtPoint,
  resolveCanvasDropZoneMeasureElement,
  getCanvasDropZoneMeasureRect,
  findDropZoneUnderPointer,
  shouldSkipCarouselSourceSlideHoverUpdate,
  isCanvasDropZoneEmptyForDrag,
  clampCanvasOverlayRectToZone,
  resolveDropZoneFromHitStack,
  setCanvasDragMarker,
  setCanvasActiveDropZoneMarker,
  shouldAcceptCanvasReleaseTargetUpdate,
  shouldKeepStickyDropTarget,
  type CanvasHitTestNode,
} from "@/components/puck/lib/canvasDropTargetLogic";

describe("resolveCanvasSlotKind", () => {
  it("classifies grid item slots", () => {
    assert.equal(resolveCanvasSlotKind("nexus-grid-item foo"), "grid-item");
  });

  it("classifies carousel slide slots", () => {
    assert.equal(resolveCanvasSlotKind("nexus-carousel__dropzone"), "carousel-slide");
  });

  it("falls back to generic for unknown classes", () => {
    assert.equal(resolveCanvasSlotKind("some-other-class"), "generic");
  });
});

describe("isCanvasDragGhostElement", () => {
  it("treats SVGAnimatedString className as a string for drawer drag markers", () => {
    const svgClassName = { baseVal: "lucide-icon DrawerItem--isDragging" };

    assert.equal(
      isCanvasDragGhostElement({
        className: svgClassName,
        attributes: {},
      }),
      true,
    );
  });

  it("does not skip drop zones even when className carries drag styling", () => {
    assert.equal(
      isCanvasDragGhostElement({
        className: "nexus-section__dropzone DrawerItem--isDragging",
        attributes: { "data-puck-dropzone": "section-1:content" },
      }),
      false,
    );
  });
});

describe("resolveCanvasDropTargetMetrics", () => {
  it("fills empty slots to at least the dragged block height", () => {
    const metrics = resolveCanvasDropTargetMetrics({
      draggedHeightPx: 320,
      draggedWidthPx: 640,
      containerHeightPx: 240,
      containerWidthPx: 400,
      slotKind: "carousel-slide",
      isEmptySlot: true,
    });

    assert.equal(metrics.minHeightPx, 320);
    assert.equal(metrics.minHeightCss, "320px");
    assert.equal(metrics.widthCss, "100%");
  });

  it("uses container height when it exceeds dragged height on empty slots", () => {
    const metrics = resolveCanvasDropTargetMetrics({
      draggedHeightPx: 120,
      draggedWidthPx: 300,
      containerHeightPx: 400,
      containerWidthPx: 500,
      slotKind: "grid-item",
      isEmptySlot: true,
    });

    assert.equal(metrics.minHeightPx, 400);
  });

  it("reserves append space below occupied children", () => {
    const metrics = resolveCanvasDropTargetMetrics({
      draggedHeightPx: 200,
      draggedWidthPx: 300,
      containerHeightPx: 360,
      containerWidthPx: 400,
      slotKind: "grid-item",
      isEmptySlot: false,
      occupiedChildrenHeightPx: 160,
    });

    assert.equal(metrics.minHeightPx, 200);
  });

  it("never drops below the minimum drop-target floor", () => {
    const metrics = resolveCanvasDropTargetMetrics({
      draggedHeightPx: 0,
      draggedWidthPx: 0,
      containerHeightPx: 0,
      containerWidthPx: 0,
      slotKind: "generic",
      isEmptySlot: true,
    });

    assert.equal(metrics.minHeightPx, CANVAS_DROP_TARGET_DEFAULT_DRAGGED_PX);
    assert.ok(metrics.minHeightPx >= CANVAS_DROP_TARGET_MIN_PX);
  });

  it("guards against inflated empty container height by falling back to dragged height when container exceeds quadruple of dragged height", () => {
    const metrics = resolveCanvasDropTargetMetrics({
      draggedHeightPx: 150,
      draggedWidthPx: 300,
      containerHeightPx: 700, // exceeds 150 * 4
      containerWidthPx: 400,
      slotKind: "carousel-slide",
      isEmptySlot: true,
    });

    assert.equal(metrics.minHeightPx, 150);
  });

  it("enforces CANVAS_DROP_PREVIEW_MAX_PX preview height cap", () => {
    const metrics = resolveCanvasDropTargetMetrics({
      draggedHeightPx: 5000,
      draggedWidthPx: 300,
      containerHeightPx: 6000,
      containerWidthPx: 400,
      slotKind: "carousel-slide",
      isEmptySlot: true,
    });

    assert.equal(metrics.minHeightPx, CANVAS_DROP_PREVIEW_MAX_PX);
  });
});

describe("pickDeepestDropZone", () => {
  it("prefers Puck destination markers over deeper siblings", () => {
    const root: CanvasHitTestNode = {
      className: "",
      attributes: {},
      parent: null,
    };
    const outer: CanvasHitTestNode = {
      className: "nexus-section__dropzone",
      attributes: { "data-puck-dropzone": "section-1:content" },
      parent: root,
    };
    const inner: CanvasHitTestNode = {
      className: "nexus-grid-item DropZone--isDestination",
      attributes: { "data-puck-dropzone": "grid-item-1:content" },
      parent: outer,
    };

    assert.equal(pickDeepestDropZone([outer, inner], root), inner);
  });

  it("chooses the deepest zone when no Puck marker is present", () => {
    const root: CanvasHitTestNode = {
      className: "",
      attributes: {},
      parent: null,
    };
    const outer: CanvasHitTestNode = {
      className: "nexus-section__dropzone",
      attributes: { "data-puck-dropzone": "section-1:content" },
      parent: root,
    };
    const inner: CanvasHitTestNode = {
      className: "nexus-carousel__dropzone",
      attributes: { "data-puck-dropzone": "carousel:slides[0].content" },
      parent: outer,
    };

    assert.ok(countCanvasDropZoneDepth(inner, root) > countCanvasDropZoneDepth(outer, root));
    assert.equal(pickDeepestDropZone([outer, inner], root), inner);
  });
});

describe("resolveDropZoneFromHitStack", () => {
  it("walks hit nodes up to the nearest drop zone", () => {
    const root: CanvasHitTestNode = {
      className: "",
      attributes: {},
      parent: null,
    };
    const zone: CanvasHitTestNode = {
      className: "nexus-section__dropzone",
      attributes: { "data-puck-dropzone": "section-1:content" },
      parent: root,
    };
    const child: CanvasHitTestNode = {
      className: "nexus-text",
      attributes: {},
      parent: zone,
    };

    assert.equal(resolveDropZoneFromHitStack([child], root), zone);
  });

  it("collects every drop zone in the hit ancestry chain", () => {
    const root: CanvasHitTestNode = {
      className: "",
      attributes: {},
      parent: null,
    };
    const outer: CanvasHitTestNode = {
      className: "nexus-section__dropzone",
      attributes: { "data-puck-dropzone": "section-1:content" },
      parent: root,
    };
    const inner: CanvasHitTestNode = {
      className: "nexus-grid-item",
      attributes: { "data-puck-dropzone": "grid-item-1:content" },
      parent: outer,
    };
    const leaf: CanvasHitTestNode = {
      className: "nexus-text",
      attributes: {},
      parent: inner,
    };

    assert.equal(resolveDropZoneFromHitStack([leaf], root), inner);
  });
});

describe("isPointInsideRect", () => {
  it("detects points inside a bounding box", () => {
    assert.equal(
      isPointInsideRect({ left: 10, right: 110, top: 20, bottom: 120 }, 50, 60),
      true,
    );
    assert.equal(
      isPointInsideRect({ left: 10, right: 110, top: 20, bottom: 120 }, 5, 60),
      false,
    );
  });
});

describe("pickInnermostDropZone", () => {
  it("prefers nested slots over the page root wrapper", () => {
    const sectionZone = {
      getAttribute: (name: string) => (name === "data-puck-dropzone" ? "section-1:content" : null),
      className: "nexus-section__dropzone",
      contains: () => false,
      getBoundingClientRect: () => ({ width: 400, height: 120 }),
      closest: () => null,
    } as unknown as HTMLElement;

    const rootZone = {
      getAttribute: (name: string) => (name === "data-puck-dropzone" ? "root:content" : null),
      className: "",
      contains: (el: unknown) => el === sectionZone,
      getBoundingClientRect: () => ({ width: 800, height: 600 }),
      closest: () => null,
    } as unknown as HTMLElement;

    assert.equal(pickInnermostDropZone([rootZone, sectionZone]), sectionZone);
  });

  it("picks the carousel slide whose card contains the pointer", () => {
    const slide0 = {
      getBoundingClientRect: () => ({ left: 0, right: 200, top: 100, bottom: 300, width: 200, height: 200 }),
    };

    const slide1 = {
      getBoundingClientRect: () => ({ left: 210, right: 410, top: 100, bottom: 300, width: 200, height: 200 }),
    };

    const zone0 = {
      getAttribute: (name: string) =>
        name === "data-puck-dropzone" ? "carousel:slides[0].content" : null,
      className: "nexus-carousel__dropzone DropZone--isDestination",
      contains: () => false,
      getBoundingClientRect: () => ({ left: 0, right: 200, top: 100, bottom: 500, width: 200, height: 400 }),
      closest: (selector: string) => (selector === ".nexus-carousel__slide" ? slide0 : null),
    } as unknown as HTMLElement;

    const zone1 = {
      getAttribute: (name: string) =>
        name === "data-puck-dropzone" ? "carousel:slides[1].content" : null,
      className: "nexus-carousel__dropzone",
      contains: () => false,
      getBoundingClientRect: () => ({ left: 210, right: 410, top: 100, bottom: 500, width: 200, height: 400 }),
      closest: (selector: string) => (selector === ".nexus-carousel__slide" ? slide1 : null),
    } as unknown as HTMLElement;

    assert.equal(
      pickInnermostDropZone([zone0, zone1], { clientX: 300, clientY: 200 }),
      zone1,
    );
  });

  it("ignores puck destination markers outside the pointer slide card", () => {
    const slide0 = {
      getBoundingClientRect: () => ({ left: 0, right: 200, top: 100, bottom: 300, width: 200, height: 200 }),
    };

    const slide1 = {
      getBoundingClientRect: () => ({ left: 210, right: 410, top: 100, bottom: 300, width: 200, height: 200 }),
    };

    const zone0 = {
      getAttribute: (name: string) =>
        name === "data-puck-dropzone" ? "carousel:slides[0].content" : null,
      className: "nexus-carousel__dropzone DropZone--isDestination",
      contains: () => false,
      getBoundingClientRect: () => ({ left: 0, right: 200, top: 100, bottom: 500, width: 200, height: 400 }),
      closest: (selector: string) => (selector === ".nexus-carousel__slide" ? slide0 : null),
    } as unknown as HTMLElement;

    const zone1 = {
      getAttribute: (name: string) =>
        name === "data-puck-dropzone" ? "carousel:slides[1].content" : null,
      className: "nexus-carousel__dropzone",
      contains: () => false,
      getBoundingClientRect: () => ({ left: 210, right: 410, top: 100, bottom: 500, width: 200, height: 400 }),
      closest: (selector: string) => (selector === ".nexus-carousel__slide" ? slide1 : null),
    } as unknown as HTMLElement;

    assert.equal(
      pickInnermostDropZone([zone0, zone1], { clientX: 300, clientY: 200 }),
      zone1,
    );
  });
});

describe("resolveCanvasDropOverlayGeometry", () => {
  it("clamps ghost height to the target slot height", () => {
    const geometry = resolveCanvasDropOverlayGeometry({
      zoneRect: { top: 100, left: 20, width: 400, height: 180, bottom: 280 },
      draggedHeightPx: 320,
      isEmpty: true,
      occupiedChildrenHeightPx: 0,
      isRootZone: false,
    });

    assert.equal(geometry.showContainerOutline, false);
    assert.equal(geometry.ghost.height, 180);
    assert.equal(geometry.ghost.top, 100);
  });

  it("shows a container outline only for empty root slots", () => {
    const geometry = resolveCanvasDropOverlayGeometry({
      zoneRect: { top: 0, left: 0, width: 800, height: 600, bottom: 600 },
      draggedHeightPx: 200,
      isEmpty: true,
      occupiedChildrenHeightPx: 0,
      isRootZone: true,
    });

    assert.equal(geometry.showContainerOutline, true);
    assert.equal(geometry.ghost.height, 200);
  });

  it("fills empty carousel slide ghosts to the full slide card", () => {
    const geometry = resolveCanvasDropOverlayGeometry({
      zoneRect: { top: 100, left: 20, width: 400, height: 240, bottom: 340 },
      draggedHeightPx: 128,
      isEmpty: true,
      occupiedChildrenHeightPx: 0,
      isRootZone: false,
      slotKind: "carousel-slide",
      fillEmptyCarouselSlot: true,
      clampGhostToZone: true,
    });

    assert.equal(geometry.ghost.height, 240);
    assert.equal(geometry.ghost.top, 100);
    assert.equal(geometry.ghost.width, 400);
  });

  it("clamps carousel ghosts that would extend below the slide card", () => {
    const geometry = resolveCanvasDropOverlayGeometry({
      zoneRect: { top: 100, left: 20, width: 400, height: 180, bottom: 280 },
      draggedHeightPx: 320,
      isEmpty: false,
      occupiedChildrenHeightPx: 120,
      isRootZone: false,
      slotKind: "carousel-slide",
      fillEmptyCarouselSlot: true,
      clampGhostToZone: true,
    });

    assert.equal(geometry.ghost.top, 100);
    assert.equal(geometry.ghost.height, 180);
  });
});

describe("isCanvasDropZoneEmptyForDrag", () => {
  it("treats a slot as empty when only the dragged block remains", () => {
    const dropZone = {
      querySelectorAll(selector: string) {
        if (selector.includes("data-dnd-dragging")) {
          return [
            { getAttribute: (name: string) => (name === "data-puck-component" ? "video-1" : null) },
          ];
        }
        return [];
      },
    };

    assert.equal(isCanvasDropZoneEmptyForDrag(dropZone, "video-1"), true);
    assert.equal(isCanvasDropZoneEmptyForDrag(dropZone, "other-id"), false);
  });
});

describe("clampCanvasOverlayRectToZone", () => {
  it("clips overlay rects to the slot bounds", () => {
    const clamped = clampCanvasOverlayRectToZone(
      { top: 220, left: 20, width: 400, height: 160 },
      { top: 100, left: 20, width: 400, height: 180, bottom: 280, right: 420 },
    );

    assert.equal(clamped.top, 220);
    assert.equal(clamped.height, 60);
  });
});

describe("shouldKeepStickyDropTarget", () => {
  it("releases sticky when the pointer moved to another slide on the same carousel", () => {
    const stickyZone = {
      getAttribute: (name: string) =>
        name === "data-puck-dropzone" ? "carousel:slides[0].content" : null,
      getBoundingClientRect: () => ({ left: 0, right: 200, top: 100, bottom: 300 }),
      closest: () => null,
      classList: { contains: () => true },
      className: "nexus-carousel__dropzone",
    };

    const nextZone = {
      contains: () => false,
      getAttribute: (name: string) =>
        name === "data-puck-dropzone" ? "carousel:slides[1].content" : null,
      getBoundingClientRect: () => ({ left: 210, right: 410, top: 100, bottom: 300 }),
      closest: () => null,
      classList: { contains: () => true },
      className: "nexus-carousel__dropzone",
    };

    assert.equal(
      shouldKeepStickyDropTarget(
        stickyZone,
        "carousel:slides[0].content",
        nextZone,
        "carousel:slides[1].content",
        300,
        200,
      ),
      false,
    );
  });

  it("keeps a nested carousel slot when pointer-up resolves the page root", () => {
    const stickyZone = {
      getAttribute: (name: string) =>
        name === "data-puck-dropzone" ? "carousel:slides[0].content" : null,
      getBoundingClientRect: () => ({ left: 40, right: 440, top: 200, bottom: 380 }),
    };

    const rootZone = {
      contains: () => true,
      getAttribute: (name: string) => (name === "data-puck-dropzone" ? "root:content" : null),
      getBoundingClientRect: () => ({ width: 800, height: 600 }),
    };

    assert.equal(
      shouldKeepStickyDropTarget(
        stickyZone,
        "carousel:slides[0].content",
        rootZone,
        "root:content",
        200,
        260,
      ),
      true,
    );
  });

  it("allows upgrading to a more specific nested slot", () => {
    const gridItemZone = {
      contains: () => false,
      getAttribute: (name: string) => (name === "data-puck-dropzone" ? "grid-item-1:content" : null),
      getBoundingClientRect: () => ({ width: 180, height: 120 }),
    };

    const carouselZone = {
      contains: (node: unknown) => node === gridItemZone,
      getAttribute: (name: string) =>
        name === "data-puck-dropzone" ? "carousel:slides[0].content" : null,
      getBoundingClientRect: () => ({ left: 40, right: 440, top: 200, bottom: 380 }),
    };

    assert.equal(
      shouldKeepStickyDropTarget(
        carouselZone,
        "carousel:slides[0].content",
        gridItemZone,
        "grid-item-1:content",
        200,
        260,
      ),
      false,
    );
  });
});

describe("isNestedCanvasDropZone", () => {
  it("classifies root vs nested compound keys", () => {
    assert.equal(isNestedCanvasDropZone("root:content"), false);
    assert.equal(isNestedCanvasDropZone("carousel:slides[0].content"), true);
    assert.equal(isCanvasRootDropZone("root:content"), true);
  });
});

describe("isCanvasDropZoneMoreSpecific", () => {
  it("prefers DOM-nested zones over ancestors", () => {
    const outer = {
      contains: (node: unknown) => node === inner,
      getAttribute: () => "root:content",
      getBoundingClientRect: () => ({ width: 800, height: 600 }),
    };
    const inner = {
      contains: () => false,
      getAttribute: () => "carousel:slides[0].content",
      getBoundingClientRect: () => ({ width: 400, height: 180 }),
    };

    assert.equal(isCanvasDropZoneMoreSpecific(inner, outer), true);
    assert.equal(isCanvasDropZoneMoreSpecific(outer, inner), false);
  });
});

describe("isPreviewDocumentReady", () => {
  it("returns false when documentElement is missing", () => {
    assert.equal(isPreviewDocumentReady(null), false);
    assert.equal(isPreviewDocumentReady({ documentElement: null } as unknown as Document), false);
    assert.equal(isCanvasDragActiveInPreview({ documentElement: null } as unknown as Document), false);
  });
});

describe("setCanvasActiveDropZoneMarker", () => {
  it("marks one drop zone and clears previous markers", () => {
    const attrs = new Map<string, string>();
    const zoneA = {
      setAttribute(name: string, value: string) {
        attrs.set(`a:${name}`, value);
      },
      removeAttribute(name: string) {
        attrs.delete(`a:${name}`);
      },
      hasAttribute(name: string) {
        return attrs.has(`a:${name}`);
      },
    };
    const zoneB = {
      setAttribute(name: string, value: string) {
        attrs.set(`b:${name}`, value);
      },
      removeAttribute(name: string) {
        attrs.delete(`b:${name}`);
      },
      hasAttribute(name: string) {
        return attrs.has(`b:${name}`);
      },
    };

    const previewDoc = {
      documentElement: {},
      querySelectorAll(selector: string) {
        if (selector.includes("data-nexus-active-dropzone")) {
          const nodes: Array<typeof zoneA | typeof zoneB> = [];
          if (attrs.has("a:data-nexus-active-dropzone")) nodes.push(zoneA);
          if (attrs.has("b:data-nexus-active-dropzone")) nodes.push(zoneB);
          return nodes;
        }
        return [];
      },
    } as unknown as Document;

    setCanvasActiveDropZoneMarker(previewDoc, zoneA as unknown as HTMLElement);
    assert.equal(attrs.has("a:data-nexus-active-dropzone"), true);

    setCanvasActiveDropZoneMarker(previewDoc, zoneB as unknown as HTMLElement);
    assert.equal(attrs.has("a:data-nexus-active-dropzone"), false);
    assert.equal(attrs.has("b:data-nexus-active-dropzone"), true);

    setCanvasActiveDropZoneMarker(previewDoc, null);
    assert.equal(attrs.has("b:data-nexus-active-dropzone"), false);
  });
});

describe("carousel slide zone helpers", () => {
  it("parses slide indices from compound keys", () => {
    assert.equal(parseCarouselSlideIndexFromZoneCompound("carousel:slides[2].content"), 2);
    assert.equal(parseCarouselSlideIndexFromZoneCompound("root:content"), null);
  });

  it("detects distinct slides on the same carousel", () => {
    assert.equal(
      areDistinctCarouselSlidesInSameCarousel(
        "carousel:slides[0].content",
        "carousel:slides[1].content",
      ),
      true,
    );
    assert.equal(
      areDistinctCarouselSlidesInSameCarousel(
        "carousel:slides[0].content",
        "carousel:slides[0].content",
      ),
      false,
    );
  });
});

describe("shouldAcceptCanvasReleaseTargetUpdate", () => {
  it("rejects pointer-up downgrade from neighbor slide back to source slide", () => {
    assert.equal(
      shouldAcceptCanvasReleaseTargetUpdate(
        { destinationZone: "carousel:slides[1].content", destinationIndex: 0 },
        { destinationZone: "carousel:slides[0].content", destinationIndex: 0 },
        { sourceZone: "carousel:slides[0].content" },
        "release",
      ),
      false,
    );
  });

  it("accepts pointer-up upgrade from source slide to neighbor slide", () => {
    assert.equal(
      shouldAcceptCanvasReleaseTargetUpdate(
        { destinationZone: "carousel:slides[0].content", destinationIndex: 0 },
        { destinationZone: "carousel:slides[1].content", destinationIndex: 0 },
        { sourceZone: "carousel:slides[0].content" },
        "release",
      ),
      true,
    );
  });

  it("rejects nested slot downgrade to page root on pointer-up glitch", () => {
    assert.equal(
      shouldAcceptCanvasReleaseTargetUpdate(
        { destinationZone: "carousel:slides[1].content", destinationIndex: 0 },
        { destinationZone: "root:content", destinationIndex: 0 },
        { sourceZone: "carousel:slides[0].content" },
        "release",
      ),
      false,
    );
  });

  it("accepts drag-out to root on pointer-up when hover never left source slide", () => {
    assert.equal(
      shouldAcceptCanvasReleaseTargetUpdate(
        { destinationZone: "carousel:slides[0].content", destinationIndex: 0 },
        { destinationZone: "root:content", destinationIndex: 0 },
        { sourceZone: "carousel:slides[0].content" },
        "release",
      ),
      true,
    );
  });

  it("rejects hover downgrade from neighbor slide back to source slide", () => {
    assert.equal(
      shouldAcceptCanvasReleaseTargetUpdate(
        { destinationZone: "carousel:slides[1].content", destinationIndex: 0 },
        { destinationZone: "carousel:slides[0].content", destinationIndex: 0 },
        { sourceZone: "carousel:slides[0].content" },
        "hover",
      ),
      false,
    );
  });

  it("always accepts hover updates from nested slot to page root", () => {
    assert.equal(
      shouldAcceptCanvasReleaseTargetUpdate(
        { destinationZone: "carousel:slides[0].content", destinationIndex: 0 },
        { destinationZone: "root:content", destinationIndex: 0 },
        { sourceZone: "carousel:slides[0].content" },
        "hover",
      ),
      true,
    );
  });

  it("accepts updates when no previous hover target was recorded", () => {
    assert.equal(
      shouldAcceptCanvasReleaseTargetUpdate(
        null,
        { destinationZone: "carousel:slides[1].content", destinationIndex: 0 },
        { sourceZone: "carousel:slides[0].content" },
        "release",
      ),
      true,
    );
  });
});

describe("resolveCanvasDropProbePoint — top-anchor hit-test", () => {
  it("anchors probe Y to the drag ghost top inset", () => {
    const ghost = {
      getBoundingClientRect: () => ({
        left: 80,
        right: 480,
        top: 300,
        bottom: 700,
        width: 400,
        height: 400,
      }),
    };

    const previewDoc = {
      contains: (node: unknown) => node === ghost,
      querySelector: (selector: string) =>
        selector.includes("data-dnd-dragging") ? ghost : null,
    } as unknown as Document;

    const probe = resolveCanvasDropProbePoint(
      previewDoc,
      {} as Document,
      null,
      150,
      650,
    );

    assert.equal(probe.usesTopAnchor, true);
    assert.equal(probe.y, 300 + CANVAS_DROP_PROBE_TOP_INSET_PX);
    assert.equal(probe.x, 150);
  });

  it("clamps probe X to the ghost horizontal bounds", () => {
    const ghost = {
      getBoundingClientRect: () => ({
        left: 100,
        right: 200,
        top: 50,
        bottom: 150,
        width: 100,
        height: 100,
      }),
    };

    const previewDoc = {
      contains: () => true,
      querySelector: () => ghost,
    } as unknown as Document;

    const probe = resolveCanvasDropProbePoint(previewDoc, {} as Document, null, 40, 120);

    assert.equal(probe.x, 100);
    assert.equal(probe.y, 50 + CANVAS_DROP_PROBE_TOP_INSET_PX);
  });

  it("falls back to raw pointer when no drag ghost is present", () => {
    const previewDoc = {
      contains: () => false,
      querySelector: () => null,
    } as unknown as Document;
    const parentDoc = { querySelector: () => null } as unknown as Document;

    const probe = resolveCanvasDropProbePoint(previewDoc, parentDoc, null, 220, 440);

    assert.deepEqual(probe, { x: 220, y: 440, usesTopAnchor: false });
  });

  it("resolves nested carousel slot when pointer is on ghost bottom but top overlaps slide", () => {
    const ghost = {
      getBoundingClientRect: () => ({
        left: 80,
        right: 480,
        top: 290,
        bottom: 690,
        width: 400,
        height: 400,
      }),
    };

    const slideRect = { left: 0, right: 200, top: 300, bottom: 500, width: 200, height: 200 };

    const previewDoc = {
      documentElement: { contains: () => true },
      contains: () => true,
      querySelector: (selector: string) => {
        if (selector.includes("data-dnd-dragging")) {
          return ghost;
        }
        return null;
      },
      querySelectorAll: (selector: string) => {
        if (selector === ".nexus-carousel") {
          return [
            {
              getBoundingClientRect: () => ({
                left: 0,
                right: 420,
                top: 280,
                bottom: 520,
                width: 420,
                height: 240,
              }),
              querySelectorAll: () => [
                {
                  getBoundingClientRect: () => slideRect,
                  querySelector: () => ({
                    className: "nexus-carousel__dropzone",
                    classList: { contains: (c: string) => c === "nexus-carousel__dropzone" },
                    getAttribute: (name: string) =>
                      name === "data-puck-dropzone" ? "carousel-1:slides[0].content" : null,
                    hasAttribute: (name: string) => name === "data-puck-dropzone",
                    closest: () => ({ getBoundingClientRect: () => slideRect }),
                    getBoundingClientRect: () => slideRect,
                    contains: () => false,
                    querySelectorAll: () => [],
                  }),
                },
              ],
            },
          ];
        }
        if (selector.includes("nexus-section__dropzone")) {
          return [
            {
              className: "nexus-section__dropzone",
              classList: { contains: (c: string) => c === "nexus-section__dropzone" },
              getAttribute: (name: string) =>
                name === "data-puck-dropzone" ? "section-1:content" : null,
              hasAttribute: (name: string) => name === "data-puck-dropzone",
              closest: () => ({
                getBoundingClientRect: () => ({
                  left: 80,
                  right: 560,
                  top: 60,
                  bottom: 720,
                  width: 480,
                  height: 660,
                }),
              }),
              getBoundingClientRect: () => ({
                left: 120,
                right: 520,
                top: 520,
                bottom: 720,
                width: 400,
                height: 200,
              }),
              contains: () => false,
              querySelectorAll: () => [],
            },
          ];
        }
        return [];
      },
      elementsFromPoint: () => [],
      elementFromPoint: () => null,
    } as unknown as Document;

    const probe = resolveCanvasDropProbePoint(previewDoc, {} as Document, null, 150, 650);
    const zone = findDropZoneUnderPointer(previewDoc, probe.x, probe.y, null);

    assert.equal(zone?.getAttribute("data-puck-dropzone"), "carousel-1:slides[0].content");

    const rawZone = findDropZoneUnderPointer(previewDoc, 150, 650, null);
    assert.equal(rawZone?.getAttribute("data-puck-dropzone"), "section-1:content");
  });
});

describe("setCanvasDragMarker", () => {
  it("toggles data-puck-dragging on the preview document root", () => {
    const attrs = new Map<string, string>();
    const previewDoc = {
      documentElement: {
        setAttribute(name: string, value: string) {
          attrs.set(name, value);
        },
        removeAttribute(name: string) {
          attrs.delete(name);
        },
        hasAttribute(name: string) {
          return attrs.has(name);
        },
      },
      querySelector: () => null,
    } as unknown as Document;

    setCanvasDragMarker(previewDoc, true);
    assert.equal(attrs.has(CANVAS_DRAG_MARKER_ATTR), true);
    assert.equal(isCanvasDragActiveInPreview(previewDoc), true);

    setCanvasDragMarker(previewDoc, false);
    assert.equal(attrs.has(CANVAS_DRAG_MARKER_ATTR), false);
    assert.equal(isCanvasDragActiveInPreview(previewDoc), false);
  });
});
