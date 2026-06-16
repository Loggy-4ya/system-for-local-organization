/**
 * Run: npm run test:carousel-edit-swipe
 * Registry: .ai/docs/testing.md — carousel edit swipe logic
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  resolveCarouselEditEmblaDragEnabled,
  resolveCarouselEditPointerSwipeEnabled,
  resolveCarouselEditSwipeDirection,
  shouldAllowCarouselEditEmblaDrag,
  shouldAllowCarouselEditPointerFlick,
  shouldRejectCarouselEditSwipeTarget,
} from "../../../src/components/puck/lib/carouselEditSwipeLogic";

describe("resolveCarouselEditEmblaDragEnabled", () => {
  it("enables Embla drag for edit when slides overflow the viewport", () => {
    assert.equal(resolveCarouselEditEmblaDragEnabled(true, 3, false), true);
    assert.equal(resolveCarouselEditEmblaDragEnabled(true, 3, true), false);
    assert.equal(resolveCarouselEditEmblaDragEnabled(true, 1, false), false);
    assert.equal(resolveCarouselEditEmblaDragEnabled(false, 3, false), false);
  });
});

describe("resolveCarouselEditPointerSwipeEnabled", () => {
  it("enables pointer flick listeners for any multi-slide edit layout", () => {
    assert.equal(resolveCarouselEditPointerSwipeEnabled(true, 3), true);
    assert.equal(resolveCarouselEditPointerSwipeEnabled(true, 1), false);
    assert.equal(resolveCarouselEditPointerSwipeEnabled(false, 3), false);
  });
});

describe("resolveCarouselEditSwipeDirection", () => {
  it("returns next for leftward horizontal swipe", () => {
    assert.equal(resolveCarouselEditSwipeDirection(-60, 4), "next");
  });

  it("returns prev for rightward horizontal swipe", () => {
    assert.equal(resolveCarouselEditSwipeDirection(72, 8), "prev");
  });

  it("rejects short or mostly vertical movement", () => {
    assert.equal(resolveCarouselEditSwipeDirection(-20, 2), null);
    assert.equal(resolveCarouselEditSwipeDirection(-80, 90), null);
  });
});

describe("shouldRejectCarouselEditSwipeTarget", () => {
  it("rejects non-element targets", () => {
    assert.equal(shouldRejectCarouselEditSwipeTarget(null), true);
  });
});

describe("shouldAllowCarouselEditEmblaDrag", () => {
  it("blocks during canvas drag", () => {
    assert.equal(shouldAllowCarouselEditEmblaDrag(null, null, true), false);
    assert.equal(shouldAllowCarouselEditEmblaDrag(null, null, false), false);
  });
});

describe("shouldAllowCarouselEditPointerFlick", () => {
  it("blocks during canvas drag", () => {
    assert.equal(shouldAllowCarouselEditPointerFlick(null, null, true), false);
  });
});
