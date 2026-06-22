/**
 * Run: npm run test:list-pagination
 * Registry: .ai/docs/testing.md
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildPaginationItems,
  clampListPageSize,
  clampPageIndex,
  computePageRowRange,
  computeTotalPages,
  pageToSkip,
} from "@shared/lib/listPaginationLogic";

describe("listPaginationLogic", () => {
  it("clampListPageSize respects max cap", () => {
    assert.equal(clampListPageSize(undefined, 10), 10);
    assert.equal(clampListPageSize(100, 10), 50);
    assert.equal(clampListPageSize(0, 10), 1);
  });

  it("computeTotalPages returns at least one page", () => {
    assert.equal(computeTotalPages(0, 10), 1);
    assert.equal(computeTotalPages(21, 10), 3);
  });

  it("pageToSkip maps page index to offset", () => {
    assert.equal(pageToSkip(1, 10), 0);
    assert.equal(pageToSkip(3, 10), 20);
  });

  it("computePageRowRange labels inclusive bounds", () => {
    assert.deepEqual(computePageRowRange(2, 10, 25), { from: 11, to: 20 });
    assert.deepEqual(computePageRowRange(3, 10, 25), { from: 21, to: 25 });
    assert.deepEqual(computePageRowRange(1, 10, 0), { from: 0, to: 0 });
  });

  it("buildPaginationItems collapses long page lists", () => {
    assert.deepEqual(buildPaginationItems(1, 5), [1, 2, 3, 4, 5]);
    assert.deepEqual(buildPaginationItems(5, 10), [
      1,
      "ellipsis-start",
      4,
      5,
      6,
      "ellipsis-end",
      10,
    ]);
  });

  it("clampPageIndex stays within bounds", () => {
    assert.equal(clampPageIndex(0, 5), 1);
    assert.equal(clampPageIndex(99, 5), 5);
  });
});
