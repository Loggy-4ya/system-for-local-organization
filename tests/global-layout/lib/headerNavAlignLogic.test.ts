/**
 * @fileoverview Unit tests for header nav alignment zone helpers.
 *
 * Run: npm run test:global-layout-align
 * Registry: .ai/docs/testing.md
 *
 * @module tests/global-layout/lib/headerNavAlignLogic.test
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { HeaderCategory } from "@shared/constants/globalLayout";
import {
  DENSE_HEADER_NAV_CATEGORY_COUNT,
  formatHeaderNavAlignLabel,
  groupHeaderCategoriesByAlign,
  headerNavGapCssValue,
  resolveCategoryAlign,
  shouldUseDenseHeaderNav,
} from "@/components/global-layout/lib/headerNavAlignLogic";

const categories: HeaderCategory[] = [
  { id: "explore", label: "Explore", items: [] },
  { id: "manage", label: "Manage", align: "end", items: [] },
  { id: "centered", label: "Center", align: "center", items: [] },
];

describe("resolveCategoryAlign", () => {
  it("inherits layout default when category align is unset", () => {
    assert.equal(resolveCategoryAlign(categories[0]!, "start"), "start");
  });

  it("uses category override when set", () => {
    assert.equal(resolveCategoryAlign(categories[1]!, "start"), "end");
    assert.equal(resolveCategoryAlign(categories[2]!, "start"), "center");
  });
});

describe("groupHeaderCategoriesByAlign", () => {
  it("partitions categories into left, center, and right zones", () => {
    const grouped = groupHeaderCategoriesByAlign(categories, "start");

    assert.deepEqual(
      grouped.start.map((category) => category.id),
      ["explore"],
    );
    assert.deepEqual(
      grouped.center.map((category) => category.id),
      ["centered"],
    );
    assert.deepEqual(
      grouped.end.map((category) => category.id),
      ["manage"],
    );
  });

  it("places all categories in one zone when layout default is center", () => {
    const grouped = groupHeaderCategoriesByAlign(
      [{ id: "a", items: [] }, { id: "b", items: [] }],
      "center",
    );

    assert.deepEqual(
      grouped.center.map((category) => category.id),
      ["a", "b"],
    );
    assert.equal(grouped.start.length, 0);
    assert.equal(grouped.end.length, 0);
  });
});

describe("formatHeaderNavAlignLabel", () => {
  it("maps alignment tokens to display labels", () => {
    assert.equal(formatHeaderNavAlignLabel("start"), "Left");
    assert.equal(formatHeaderNavAlignLabel("center"), "Center");
    assert.equal(formatHeaderNavAlignLabel("end"), "Right");
  });
});

describe("shouldUseDenseHeaderNav", () => {
  it("returns false below the dense category threshold", () => {
    const few = Array.from({ length: DENSE_HEADER_NAV_CATEGORY_COUNT - 1 }, (_, index) => ({
      id: `cat-${index}`,
      items: [],
    }));

    assert.equal(shouldUseDenseHeaderNav(few), false);
  });

  it("returns true at or above the dense category threshold", () => {
    const many = Array.from({ length: DENSE_HEADER_NAV_CATEGORY_COUNT }, (_, index) => ({
      id: `cat-${index}`,
      items: [],
    }));

    assert.equal(shouldUseDenseHeaderNav(many), true);
  });
});

describe("headerNavGapCssValue", () => {
  it("maps gap tokens to CSS lengths", () => {
    assert.equal(headerNavGapCssValue("sm"), "0.5rem");
    assert.equal(headerNavGapCssValue("md"), "1rem");
    assert.equal(headerNavGapCssValue("lg"), "1.5rem");
    assert.equal(headerNavGapCssValue("xl"), "2.25rem");
    assert.equal(headerNavGapCssValue("2xl"), "3rem");
    assert.equal(headerNavGapCssValue(undefined), "1rem");
  });
});
