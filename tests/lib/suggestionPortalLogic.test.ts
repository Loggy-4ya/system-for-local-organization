/**
 * Suggestion portal positioning and stale-popup cleanup.
 *
 * Run: `npm run test:suggestion-portal-logic`
 * Registry: `.ai/docs/testing.md`
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applySuggestionPortalPosition,
  isValidSuggestionClientRect,
  resolveSuggestionPortalRect,
  SUGGESTION_PORTAL_OFFSET_Y,
  type SuggestionClientRect,
} from "@/components/editor/lib/suggestionPortalLogic";

function rect(
  left: number,
  top: number,
  width: number,
  height: number,
): SuggestionClientRect {
  return {
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
  };
}

describe("isValidSuggestionClientRect", () => {
  it("rejects null", () => {
    assert.equal(isValidSuggestionClientRect(null), false);
  });

  it("rejects zero-size origin corner rects", () => {
    assert.equal(isValidSuggestionClientRect(rect(0, 0, 0, 0)), false);
  });

  it("accepts caret rects with real coordinates", () => {
    assert.equal(isValidSuggestionClientRect(rect(120, 48, 2, 18)), true);
  });
});

describe("resolveSuggestionPortalRect", () => {
  it("reuses the last valid rect when measurement fails", () => {
    const cached = rect(80, 40, 2, 16);
    const result = resolveSuggestionPortalRect(() => null, cached);
    assert.equal(result.positioned, true);
    assert.equal(result.rect, cached);
  });
});

describe("applySuggestionPortalPosition", () => {
  it("uses fixed positioning below the caret", () => {
    const popup = { style: {} as CSSStyleDeclaration } as HTMLElement;
    const caret = rect(10, 20, 2, 14);
    applySuggestionPortalPosition(popup, caret);
    assert.equal(popup.style.position, "fixed");
    assert.equal(popup.style.left, "10px");
    assert.equal(popup.style.top, `${20 + 14 + SUGGESTION_PORTAL_OFFSET_Y}px`);
    assert.equal(popup.style.visibility, "visible");
  });
});
