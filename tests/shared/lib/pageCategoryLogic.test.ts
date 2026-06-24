/**
 * @fileoverview Unit tests for page category label normalization.
 *
 * Module under test: shared/lib/pageCategoryLogic.ts
 * Registry: .ai/docs/testing.md
 * Run: `npm run test:page-category`
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canAddPageCategory,
  filterPageCategorySuggestions,
  MAX_PAGE_CATEGORIES,
  normalizePageCategoryLabel,
  normalizePageCategoryList,
  pageCategoryBadgeClassName,
  resolvePageCategoryAccentIndex,
  shouldOfferCreatePageCategory,
} from "@shared/lib/pageCategoryLogic";
import { PAGE_CATEGORY_ACCENT_COUNT } from "@shared/constants/pageCategoryAccent";

describe("normalizePageCategoryLabel", () => {
  it("trims and collapses whitespace", () => {
    assert.equal(normalizePageCategoryLabel("  News   Hub  "), "News Hub");
  });

  it("rejects empty and forbidden characters", () => {
    assert.equal(normalizePageCategoryLabel("   "), null);
    assert.equal(normalizePageCategoryLabel("bad/tag"), null);
    assert.equal(normalizePageCategoryLabel("<script>"), null);
  });
});

describe("normalizePageCategoryList", () => {
  it("dedupes case-insensitively and preserves first casing", () => {
    assert.deepEqual(normalizePageCategoryList(["News", "news", "Sport"]), ["News", "Sport"]);
  });

  it("caps at MAX_PAGE_CATEGORIES", () => {
    const many = Array.from({ length: MAX_PAGE_CATEGORIES + 3 }, (_, i) => `Tag ${i}`);
    assert.equal(normalizePageCategoryList(many).length, MAX_PAGE_CATEGORIES);
  });
});

describe("filterPageCategorySuggestions", () => {
  it("filters by query and excludes selected labels", () => {
    const result = filterPageCategorySuggestions("sp", ["Sport", "News", "Spirit"], ["News"]);
    assert.deepEqual(result, ["Spirit", "Sport"]);
  });
});

describe("shouldOfferCreatePageCategory", () => {
  it("offers create for valid new labels", () => {
    assert.equal(shouldOfferCreatePageCategory("Events", ["News"], []), true);
  });

  it("does not offer create when already selected or invalid", () => {
    assert.equal(shouldOfferCreatePageCategory("News", ["News"], ["News"]), false);
    assert.equal(shouldOfferCreatePageCategory("   ", ["News"], []), false);
  });
});

describe("canAddPageCategory", () => {
  it("blocks duplicates and over-limit selections", () => {
    assert.equal(canAddPageCategory(["News"], "news"), false);
    assert.equal(canAddPageCategory(Array(MAX_PAGE_CATEGORIES).fill("A"), "B"), false);
    assert.equal(canAddPageCategory(["News"], "Sport"), true);
  });
});

describe("resolvePageCategoryAccentIndex", () => {
  it("maps the same label to a stable palette index", () => {
    const first = resolvePageCategoryAccentIndex("Events");
    const second = resolvePageCategoryAccentIndex("events");
    assert.equal(first, second);
    assert.ok(first >= 0 && first < PAGE_CATEGORY_ACCENT_COUNT);
  });

  it("includes the palette modifier in badge class names", () => {
    const classes = pageCategoryBadgeClassName("Sport");
    assert.match(classes, /^badge badge-page-category badge-page-category--\d+$/);
  });
});
