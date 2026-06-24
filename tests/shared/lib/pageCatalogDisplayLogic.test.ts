/**
 * @fileoverview Unit tests for page catalog carousel and pagination helpers.
 *
 * Module under test: shared/lib/pageCatalogDisplayLogic.ts
 *
 * Run: `npm run test:page-catalog-display-logic`
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  clampPageCatalogCarouselPage,
  paginateCatalogPages,
  resolvePageCatalogCarouselPageCount,
  resolvePageCatalogGridPageCount,
  resolvePageCatalogVisibleCardCount,
  shouldUsePageCatalogCarousel,
} from "../../../shared/lib/pageCatalogDisplayLogic";

describe("shouldUsePageCatalogCarousel", () => {
  it("enables carousel at the configured minimum", () => {
    assert.equal(shouldUsePageCatalogCarousel(3), false);
    assert.equal(shouldUsePageCatalogCarousel(4), true);
  });
});

describe("resolvePageCatalogVisibleCardCount", () => {
  it("returns responsive visible counts", () => {
    assert.equal(resolvePageCatalogVisibleCardCount(400), 1);
    assert.equal(resolvePageCatalogVisibleCardCount(720), 2);
    assert.equal(resolvePageCatalogVisibleCardCount(1280), 3);
  });
});

describe("paginateCatalogPages", () => {
  it("slices grid pages with a fixed page size", () => {
    const pages = ["a", "b", "c", "d", "e", "f", "g"];
    assert.deepEqual(paginateCatalogPages(pages, 1, 3), ["a", "b", "c"]);
    assert.deepEqual(paginateCatalogPages(pages, 3, 3), ["g"]);
  });
});

describe("resolvePageCatalogGridPageCount", () => {
  it("computes grid pagination totals", () => {
    assert.equal(resolvePageCatalogGridPageCount(6, 6), 1);
    assert.equal(resolvePageCatalogGridPageCount(7, 6), 2);
  });
});

describe("resolvePageCatalogCarouselPageCount", () => {
  it("computes carousel dot counts from visible windows", () => {
    assert.equal(resolvePageCatalogCarouselPageCount(3, 3), 1);
    assert.equal(resolvePageCatalogCarouselPageCount(7, 3), 3);
  });
});

describe("clampPageCatalogCarouselPage", () => {
  it("clamps active carousel page indices", () => {
    assert.equal(clampPageCatalogCarouselPage(-1, 3), 0);
    assert.equal(clampPageCatalogCarouselPage(9, 3), 2);
  });
});
