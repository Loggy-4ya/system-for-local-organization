/**
 * @fileoverview Unit tests for compact scrollport grid backdrop sizing.
 *
 * Run: `npm run test:mobile-scrollport-grid-freeze`
 * Registry: `.ai/docs/testing.md`
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isNarrowEditorViewportWidth,
  resolveMobileScrollportBackdropMetrics,
  usesMobileScrollportGridBackdropMount,
} from "@/components/puck/lib/mobileScrollportGridFreeze";
import { PUCK_COMPACT_EDITOR_MAX_WIDTH } from "@/components/puck/usePuckMobileEditorChrome";

describe("resolveMobileScrollportBackdropMetrics", () => {
  it("fills the layout inner column (CSS backdrop uses inset 0)", () => {
    const result = resolveMobileScrollportBackdropMetrics(390, 720, 52);

    assert.equal(result.width, 390);
    assert.equal(result.height, 720);
    assert.equal(result.top, 0);
  });

  it("offsets top when the canvas shell sits below the header (legacy metric helper)", () => {
    const result = resolveMobileScrollportBackdropMetrics(390, 720, 52, 58);

    assert.equal(result.width, 390);
    assert.equal(result.height, 720);
    assert.equal(result.top, 58);
  });

  it("clamps to at least 1px when inner height is minimal", () => {
    const result = resolveMobileScrollportBackdropMetrics(400, 52, 52);

    assert.equal(result.width, 400);
    assert.equal(result.height, 52);
  });

  it("uses full inner width on narrow phones", () => {
    const result = resolveMobileScrollportBackdropMetrics(320, 600, 48);

    assert.equal(result.width, 320);
    assert.equal(result.height, 600);
  });
});

describe("isNarrowEditorViewportWidth", () => {
  it("is true at the narrow editor breakpoint width", () => {
    assert.equal(isNarrowEditorViewportWidth(PUCK_COMPACT_EDITOR_MAX_WIDTH), true);
  });

  it("is false above the narrow editor breakpoint", () => {
    assert.equal(isNarrowEditorViewportWidth(PUCK_COMPACT_EDITOR_MAX_WIDTH + 1), false);
  });
});

describe("usesMobileScrollportGridBackdropMount", () => {
  it("is false without a document", () => {
    const originalDocument = globalThis.document;

    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: undefined,
    });

    try {
      assert.equal(usesMobileScrollportGridBackdropMount(), false);
    } finally {
      Object.defineProperty(globalThis, "document", {
        configurable: true,
        value: originalDocument,
      });
    }
  });
});
