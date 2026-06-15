/**
 * @fileoverview Section + carousel hit-test and overlay tests for canvas drag.
 *
 * Covers default starter section (glass island shell) and cross-slide carousel picks.
 *
 * Module under test: src/components/puck/lib/canvasDropTargetLogic.ts
 * Registry: .ai/docs/testing.md
 * Run: `npm run test:canvas-section-drop`
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  findDropZoneUnderPointer,
  getCanvasDropZoneMeasureRect,
  isCarouselSlideDropZone,
  resolveCanvasDropOverlayGeometry,
  resolveCanvasSlotKind,
  resolveCarouselSlideDropZoneAtPoint,
  resolveSectionDropZoneAtPoint,
  resolveCanvasDropZoneMeasureElement,
  shouldSkipCarouselSourceSlideHoverUpdate,
} from "@/components/puck/lib/canvasDropTargetLogic";

function createRootDropZoneMock(): HTMLElement {
  return {
    className: "",
    classList: { contains: () => false },
    getAttribute: (name: string) => (name === "data-puck-dropzone" ? "root:content" : null),
    hasAttribute: (name: string) => name === "data-puck-dropzone",
    closest: () => null,
    getBoundingClientRect: () => ({ left: 0, right: 800, top: 0, bottom: 600, width: 800, height: 600 }),
    contains: () => false,
    querySelectorAll: () => [],
  } as unknown as HTMLElement;
}

/** Build a minimal preview document mimicking default section + carousel layout. */
function createStarterSectionDoc(): Document {
  const doc = {
    documentElement: {
      contains: () => true,
    },
    querySelector: () => null,
    querySelectorAll: (selector: string) => {
      if (selector === ".nexus-carousel") {
        return [createCarouselMock()];
      }
      if (selector.includes("nexus-section__dropzone")) {
        return [createSectionDropZoneMock()];
      }
      if (selector === "[data-puck-dropzone]") {
        return [
          createRootDropZoneMock(),
          createSectionDropZoneMock(),
          createCarouselSlideDropZoneMock(0),
          createCarouselSlideDropZoneMock(1),
        ];
      }
      return [];
    },
    elementsFromPoint: () => [],
    elementFromPoint: () => null,
  };

  return doc as unknown as Document;
}

function createSectionDropZoneMock(): HTMLElement {
  const innerRect = { left: 120, right: 520, top: 80, bottom: 260, width: 400, height: 180 };
  const glassRect = { left: 80, right: 560, top: 60, bottom: 280, width: 480, height: 220 };

  const dropZone = {
    className: "nexus-section__dropzone DropZone--hasChildren",
    classList: { contains: (c: string) => c === "nexus-section__dropzone" },
    getAttribute: (name: string) =>
      name === "data-puck-dropzone" ? "section-1:content" : null,
    hasAttribute: (name: string) => name === "data-puck-dropzone",
    closest: (selector: string) => {
      if (selector === ".glass-panel") {
        return {
          getBoundingClientRect: () => glassRect,
        };
      }
      if (selector === "[data-puck-component]") {
        return { getBoundingClientRect: () => glassRect };
      }
      return null;
    },
    getBoundingClientRect: () => innerRect,
    contains: () => false,
    querySelectorAll: () => [],
  };

  return dropZone as unknown as HTMLElement;
}

function createCarouselSlideDropZoneMock(index: number): HTMLElement {
  const left = index * 210;
  const slideRect = { left, right: left + 200, top: 300, bottom: 500, width: 200, height: 200 };

  return {
    className: "nexus-carousel__dropzone DropZone--hasChildren",
    classList: { contains: (c: string) => c === "nexus-carousel__dropzone" },
    getAttribute: (name: string) =>
      name === "data-puck-dropzone" ? `carousel-1:slides[${index}].content` : null,
    hasAttribute: (name: string) => name === "data-puck-dropzone",
    closest: (selector: string) => {
      if (selector === ".nexus-carousel__slide") {
        return { getBoundingClientRect: () => slideRect };
      }
      return null;
    },
    getBoundingClientRect: () => ({ ...slideRect, bottom: 520, height: 220 }),
    contains: () => false,
    querySelector: () => null,
    querySelectorAll: () => [],
  } as unknown as HTMLElement;
}

function createCarouselMock(): HTMLElement {
  const carouselRect = { left: 0, right: 420, top: 280, bottom: 520, width: 420, height: 240 };

  return {
    getBoundingClientRect: () => carouselRect,
    querySelectorAll: (selector: string) => {
      if (selector === ".nexus-carousel__slide") {
        return [0, 1].map((index) => {
          const left = index * 210;
          const slideRect = {
            left,
            right: left + 200,
            top: 300,
            bottom: 500,
            width: 200,
            height: 200,
          };

          return {
            getBoundingClientRect: () => slideRect,
            querySelector: () => createCarouselSlideDropZoneMock(index),
          };
        });
      }
      return [];
    },
  } as unknown as HTMLElement;
}

describe("resolveCanvasDropZoneMeasureElement — section island shell", () => {
  it("expands section slots to the glass panel for hit-testing", () => {
    const dropZone = createSectionDropZoneMock();
    const measure = resolveCanvasDropZoneMeasureElement(dropZone);
    const rect = measure.getBoundingClientRect();

    assert.equal(rect.width, 480);
    assert.equal(rect.left, 80);
  });
});

describe("resolveSectionDropZoneAtPoint", () => {
  it("resolves section when pointer is on glass padding outside inner slot", () => {
    const doc = createStarterSectionDoc();
    const zone = resolveSectionDropZoneAtPoint(doc, 90, 100);

    assert.ok(zone);
    assert.equal(zone?.getAttribute("data-puck-dropzone"), "section-1:content");
  });

  it("does not resolve section when pointer is outside the island shell", () => {
    const doc = createStarterSectionDoc();
    assert.equal(resolveSectionDropZoneAtPoint(doc, 10, 10), null);
  });
});

describe("findDropZoneUnderPointer — section vs root", () => {
  it("prefers section over page root when pointer is on the island shell", () => {
    const doc = createStarterSectionDoc();
    const zone = findDropZoneUnderPointer(doc, 90, 100);

    assert.equal(zone?.getAttribute("data-puck-dropzone"), "section-1:content");
  });
});

describe("resolveCarouselSlideDropZoneAtPoint — gutter nearest slide", () => {
  it("resolves nearest slide when pointer is in the inter-slide gap", () => {
    const doc = createStarterSectionDoc();
    const zone = resolveCarouselSlideDropZoneAtPoint(doc, 206, 400);

    assert.ok(zone);
    assert.equal(zone?.getAttribute("data-puck-dropzone"), "carousel-1:slides[1].content");
  });

  it("resolves nearest slide when pointer is on carousel chrome below slide cards", () => {
    const doc = createStarterSectionDoc();
    const zone = resolveCarouselSlideDropZoneAtPoint(doc, 100, 515);

    assert.ok(zone);
    assert.equal(zone?.getAttribute("data-puck-dropzone"), "carousel-1:slides[0].content");
  });

  it("returns null when pointer is outside every carousel", () => {
    const doc = createStarterSectionDoc();
    assert.equal(resolveCarouselSlideDropZoneAtPoint(doc, 10, 10), null);
  });

  it("prefers a slide that contains the pointer over nearest-slide fallback", () => {
    const doc = createStarterSectionDoc();
    const zone = resolveCarouselSlideDropZoneAtPoint(doc, 150, 380);

    assert.equal(zone?.getAttribute("data-puck-dropzone"), "carousel-1:slides[0].content");
  });
});

describe("findDropZoneUnderPointer — carousel slide vs wrapper", () => {
  it("prefers geometry slide 2 over same-carousel non-slide merged zone", () => {
    const slide1 = createCarouselSlideDropZoneMock(0);
    const slide2 = createCarouselSlideDropZoneMock(1);

    const carouselWrapper = {
      className: "nexus-carousel DropZone--isDestination",
      classList: { contains: () => false },
      getAttribute: (name: string) =>
        name === "data-puck-dropzone" ? "carousel-1:content" : null,
      hasAttribute: (name: string) => name === "data-puck-dropzone",
      closest: () => null,
      getBoundingClientRect: () => ({ left: 0, right: 420, top: 280, bottom: 520, width: 420, height: 240 }),
      contains: (el: unknown) => el === slide1,
      querySelectorAll: () => [],
    };

    const carousel = {
      getBoundingClientRect: () => ({ left: 0, right: 420, top: 280, bottom: 520, width: 420, height: 240 }),
      querySelectorAll: (selector: string) => {
        if (selector === ".nexus-carousel__slide") {
          return [0, 1].map((index) => {
            const left = index * 210;
            return {
              getBoundingClientRect: () => ({
                left,
                right: left + 200,
                top: 300,
                bottom: 500,
                width: 200,
                height: 200,
              }),
              querySelector: () => (index === 0 ? slide1 : slide2),
            };
          });
        }
        return [];
      },
    };

    const doc = {
      documentElement: { contains: () => true },
      querySelector: () => null,
      querySelectorAll: (selector: string) => {
        if (selector === ".nexus-carousel") {
          return [carousel];
        }
        if (selector === "[data-puck-dropzone]") {
          return [carouselWrapper, slide1, slide2];
        }
        return [];
      },
      elementsFromPoint: () => [carouselWrapper],
      elementFromPoint: () => carouselWrapper,
    } as unknown as Document;

    const zone = findDropZoneUnderPointer(doc, 320, 380);
    assert.equal(zone?.getAttribute("data-puck-dropzone"), "carousel-1:slides[1].content");
  });
});

describe("resolveCanvasDropOverlayGeometry — section visibility", () => {
  it("shows container outline for occupied section slots", () => {
    const geometry = resolveCanvasDropOverlayGeometry({
      zoneRect: { top: 60, left: 80, width: 480, height: 220, bottom: 280, right: 560 },
      draggedHeightPx: 180,
      isEmpty: false,
      occupiedChildrenHeightPx: 140,
      isRootZone: false,
      slotKind: "section",
    });

    assert.equal(geometry.showContainerOutline, true);
  });
});

describe("shouldSkipCarouselSourceSlideHoverUpdate", () => {
  it("skips hover on drag-start carousel slide", () => {
    assert.equal(
      shouldSkipCarouselSourceSlideHoverUpdate({
        dragStartZone: "carousel-1:slides[0].content",
        zoneCompound: "carousel-1:slides[0].content",
        dropZoneClassName: "nexus-carousel__dropzone",
        phase: "hover",
      }),
      true,
    );
  });

  it("does not skip neighbor slide hover", () => {
    assert.equal(
      shouldSkipCarouselSourceSlideHoverUpdate({
        dragStartZone: "carousel-1:slides[0].content",
        zoneCompound: "carousel-1:slides[1].content",
        dropZoneClassName: "nexus-carousel__dropzone",
        phase: "hover",
      }),
      false,
    );
  });
});

describe("resolveCanvasSlotKind", () => {
  it("classifies section drop zones", () => {
    assert.equal(resolveCanvasSlotKind("nexus-section__dropzone"), "section");
  });
});

describe("isCarouselSlideDropZone", () => {
  it("detects carousel slide markers", () => {
    const el = createCarouselSlideDropZoneMock(0);
    assert.equal(isCarouselSlideDropZone(el), true);
  });
});
