/**
 * @fileoverview Unit tests for carousel pagination and navigation math.
 *
 * Module under test: src/components/puck/lib/carouselPagination.ts
 * Registry: .ai/docs/testing.md
 * Run: `npm run test:carousel-pagination`
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  resolveCarouselPagePlan,
  resolveCarouselPaginationContext,
  resolveNextNavigationStep,
  resolveNextPageFromPlan,
  resolveNavPositionFromSnap,
  resolvePageIndexFromPlan,
  resolvePrevNavigationStep,
  resolvePrevPageFromPlan,
  resolveScrollDirectionForNavAction,
  resolveStandardPageWindows,
  resolveUsesNativeEmblaNav,
  resolveVisibleSlideCountAtWidth,
} from "@/components/puck/lib/carouselPagination";

const VIEWPORT_WIDTH = 1200;

describe("resolveVisibleSlideCountAtWidth — auto responsive tiers", () => {
  it("shows 1 slide below tablet breakpoint", () => {
    assert.equal(resolveVisibleSlideCountAtWidth("auto", 500), 1);
  });

  it("shows 2 slides at tablet breakpoint (640px)", () => {
    assert.equal(resolveVisibleSlideCountAtWidth("auto", 640), 2);
  });

  it("shows 2 slides for iPad-width container with gutters (~720px)", () => {
    assert.equal(resolveVisibleSlideCountAtWidth("auto", 720), 2);
  });

  it("shows 3 slides at desktop breakpoint (1024px)", () => {
    assert.equal(resolveVisibleSlideCountAtWidth("auto", 1024), 3);
  });
});

describe("carousel page plan — 7 slides / spv 3 / step 2", () => {
  const count = 7;
  const spv = "3" as const;
  const step = "2" as const;

  it("uses three standard pages with overlapping windows", () => {
    const plan = resolveCarouselPagePlan(count, spv, step, VIEWPORT_WIDTH);
    assert.equal(plan.pageCount, 3);
    assert.equal(plan.hasDualCycle, true);
    assert.equal(plan.canPaginate, true);
    assert.deepEqual(
      plan.standardPages.map((page) => page.visibleIndices),
      [
        [0, 1, 2],
        [2, 3, 4],
        [4, 5, 6],
      ],
    );
    assert.deepEqual(
      resolveStandardPageWindows(count, spv, step, VIEWPORT_WIDTH, true),
      plan.standardPages.map((page) => page.visibleIndices),
    );
  });

  it("alternates into remainder cycle because slide 7 is not a standard leading snap", () => {
    const plan = resolveCarouselPagePlan(count, spv, step, VIEWPORT_WIDTH);
    assert.deepEqual(
      plan.remainderPages?.map((page) => page.visibleIndices),
      [
        [6, 0, 1],
        [1, 2, 3],
        [3, 4, 5],
        [5, 6, 0],
      ],
    );

    const nextFromFirstRemainder = resolveNextPageFromPlan(0, plan, "remainder");
    assert.equal(nextFromFirstRemainder.pageIndex, 1);
    assert.equal(nextFromFirstRemainder.leadingSnap, 1);
    assert.equal(nextFromFirstRemainder.cycle, "remainder");

    const next = resolveNextPageFromPlan(2, plan, "standard");
    assert.equal(next.pageIndex, 0);
    assert.equal(next.leadingSnap, 6);
    assert.equal(next.cycle, "remainder");
  });

  it("wraps next/prev within the standard page table", () => {
    const plan = resolveCarouselPagePlan(count, spv, step, VIEWPORT_WIDTH);
    const next = resolveNextPageFromPlan(1, plan, "standard");
    assert.equal(next.pageIndex, 2);
    assert.equal(next.leadingSnap, 4);
    assert.equal(next.cycle, "standard");

    const prev = resolvePrevPageFromPlan(2, plan, "standard");
    assert.equal(prev.pageIndex, 1);
    assert.equal(prev.leadingSnap, 2);
    assert.equal(prev.cycle, "standard");

    const legacyNext = resolveNextNavigationStep(2, count, spv, step, VIEWPORT_WIDTH);
    assert.equal(legacyNext.pageIndex, 0);
    assert.equal(legacyNext.leadingStart, 6);

    const legacyPrev = resolvePrevNavigationStep(2, count, spv, step, VIEWPORT_WIDTH);
    assert.equal(legacyPrev.pageIndex, 1);
    assert.equal(legacyPrev.leadingStart, 2);
  });

  it("maps snaps to page indices", () => {
    const plan = resolveCarouselPagePlan(count, spv, step, VIEWPORT_WIDTH);
    assert.equal(resolvePageIndexFromPlan(0, plan), 0);
    assert.equal(resolvePageIndexFromPlan(3, plan), 1);
    assert.equal(resolvePageIndexFromPlan(4, plan), 2);
  });

  it("keeps snap 5 and 6 on the standard last page before remainder wrap", () => {
    const plan = resolveCarouselPagePlan(count, spv, step, VIEWPORT_WIDTH);

    for (const snap of [5, 6]) {
      const position = resolveNavPositionFromSnap(snap, plan, "standard");
      assert.equal(position.pageIndex, 2);
      assert.equal(position.cycle, "standard");

      const next = resolveNextPageFromPlan(position.pageIndex, plan, position.cycle);
      assert.equal(next.cycle, "remainder");
      assert.equal(next.leadingSnap, 6);
    }
  });
});

describe("carousel page plan — 7 slides / spv 2 / step 2", () => {
  const count = 7;
  const spv = "2" as const;
  const step = "2" as const;

  it("alternates standard and remainder cycles", () => {
    const plan = resolveCarouselPagePlan(count, spv, step, VIEWPORT_WIDTH);
    assert.equal(plan.hasDualCycle, true);
    assert.equal(plan.pageCount, 3);
    assert.equal(plan.canPaginate, true);
    assert.deepEqual(
      plan.standardPages.map((page) => page.visibleIndices),
      [
        [0, 1],
        [2, 3],
        [4, 5],
      ],
    );
    assert.deepEqual(
      plan.remainderPages?.map((page) => page.visibleIndices),
      [
        [6, 0],
        [1, 2],
        [3, 4],
        [5, 6],
      ],
    );

    const ctx = resolveCarouselPaginationContext(count, spv, step, VIEWPORT_WIDTH);
    assert.equal(ctx.pageCount, 3);
    assert.deepEqual(ctx.standardStarts, [0, 2, 4]);
  });

  it("wraps from standard last page into remainder cycle", () => {
    const plan = resolveCarouselPagePlan(count, spv, step, VIEWPORT_WIDTH);
    const next = resolveNextPageFromPlan(2, plan, "standard");
    assert.equal(next.pageIndex, 0);
    assert.equal(next.leadingSnap, 6);
    assert.equal(next.cycle, "remainder");
  });

  it("wraps from remainder last page back to standard", () => {
    const plan = resolveCarouselPagePlan(count, spv, step, VIEWPORT_WIDTH);
    const next = resolveNextPageFromPlan(3, plan, "remainder");
    assert.equal(next.pageIndex, 0);
    assert.equal(next.leadingSnap, 0);
    assert.equal(next.cycle, "standard");
  });

  it("maps remainder leading snap to page 0", () => {
    const plan = resolveCarouselPagePlan(count, spv, step, VIEWPORT_WIDTH);
    const position = resolveNavPositionFromSnap(6, plan, "remainder");
    assert.equal(position.pageIndex, 0);
    assert.equal(position.cycle, "remainder");
  });

  it("keeps snap 5 on the standard last page, not remainder leading snap", () => {
    const plan = resolveCarouselPagePlan(count, spv, step, VIEWPORT_WIDTH);
    const position = resolveNavPositionFromSnap(5, plan, "standard");
    assert.equal(position.pageIndex, 2);
    assert.equal(position.cycle, "standard");

    const next = resolveNextPageFromPlan(position.pageIndex, plan, position.cycle);
    assert.equal(next.cycle, "remainder");
    assert.equal(next.leadingSnap, 6);
  });
});

describe("carousel page plan — 2 slides / spv 2 / step 1", () => {
  it("does not paginate when all slides fit", () => {
    const plan = resolveCarouselPagePlan(2, "2", "1", VIEWPORT_WIDTH);
    assert.equal(plan.pageCount, 1);
    assert.equal(plan.canPaginate, false);
    assert.deepEqual(plan.pages[0]?.visibleIndices, [0, 1]);
  });
});

describe("resolveUsesNativeEmblaNav", () => {
  it("uses native Embla scroll for step 1 only", () => {
    assert.equal(resolveUsesNativeEmblaNav("1", "2", VIEWPORT_WIDTH), true);
    assert.equal(resolveUsesNativeEmblaNav("2", "2", VIEWPORT_WIDTH), false);
    assert.equal(resolveUsesNativeEmblaNav("page", "2", VIEWPORT_WIDTH), false);
  });
});

describe("resolveScrollDirectionForNavAction", () => {
  it("forces loop direction for arrows and shortest path for dots", () => {
    assert.equal(
      resolveScrollDirectionForNavAction(4, 0, 7, true, "next"),
      -1,
    );
    assert.equal(
      resolveScrollDirectionForNavAction(0, 6, 7, true, "prev"),
      1,
    );
    assert.equal(
      resolveScrollDirectionForNavAction(2, 0, 7, true, "dot"),
      1,
    );
  });
});
