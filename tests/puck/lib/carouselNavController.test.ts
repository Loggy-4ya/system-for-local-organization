/**
 * @fileoverview Unit tests for carousel nav controller state machine.
 *
 * Module under test: src/components/puck/lib/carouselNavController.ts
 * Registry: .ai/docs/testing.md
 * Run: `npm run test:carousel-nav`
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { CarouselEngineApi } from "@/components/puck/lib/carouselEngine";
import {
  computeDotNavTarget,
  computeNextNavTarget,
  computePrevNavTarget,
  resolveCarouselNavMode,
  resolveCurrentNavPosition,
  syncNavPositionFromSnap,
} from "@/components/puck/lib/carouselNavController";
import { resolveCarouselPagePlan } from "@/components/puck/lib/carouselPagination";

const VIEWPORT_WIDTH = 1200;

describe("resolveCarouselNavMode", () => {
  it("uses native step-1 navigation when paginating", () => {
    assert.equal(
      resolveCarouselNavMode(true, "1", "2", VIEWPORT_WIDTH),
      "nativeStep1",
    );
    assert.equal(
      resolveCarouselNavMode(true, "2", "2", VIEWPORT_WIDTH),
      "pagePlan",
    );
  });
});

describe("step 1 — 7 slides / spv 2", () => {
  const plan = resolveCarouselPagePlan(7, "2", "1", VIEWPORT_WIDTH);

  it("maps snap 6 to last pagination page without jumping to snap 0", () => {
    const position = syncNavPositionFromSnap(6, plan, "standard");
    assert.equal(position.pageIndex, 5);

    const atSnap5 = { pageIndex: 5, pageCycle: "standard" as const };
    const next = computeNextNavTarget(atSnap5, plan);
    assert.equal(next.leadingSnap, 0);
    assert.equal(next.pageIndex, 0);
    assert.notEqual(next.leadingSnap, 6);
  });

  it("resolves current position from engine snap", () => {
    const stored = { pageIndex: 0, pageCycle: "standard" as const };
    const fromSnap6 = resolveCurrentNavPosition(6, stored, plan);
    assert.equal(fromSnap6.pageIndex, 5);
  });
});

describe("dual-cycle — 7 slides / spv 3 / step 2", () => {
  const plan = resolveCarouselPagePlan(7, "3", "2", VIEWPORT_WIDTH);

  it("wraps standard last page into remainder cycle at slide 7", () => {
    const next = computeNextNavTarget(
      { pageIndex: 2, pageCycle: "standard" },
      plan,
    );
    assert.equal(next.pageCycle, "remainder");
    assert.equal(next.leadingSnap, 6);
    assert.equal(next.pageIndex, 0);
  });

  it("does not treat snap 5 or 6 as remainder while still in standard cycle", () => {
    for (const snap of [5, 6]) {
      const position = syncNavPositionFromSnap(snap, plan, "standard");
      assert.equal(position.pageIndex, 2);
      assert.equal(position.pageCycle, "standard");

      const next = computeNextNavTarget(position, plan);
      assert.equal(next.pageCycle, "remainder");
      assert.equal(next.leadingSnap, 6);
    }
  });

  it("continues remainder from 7-1-2 into 2-3-4, not back to 1-2-3", () => {
    const next = computeNextNavTarget(
      { pageIndex: 0, pageCycle: "remainder" },
      plan,
    );
    assert.equal(next.pageCycle, "remainder");
    assert.equal(next.pageIndex, 1);
    assert.equal(next.leadingSnap, 1);
  });
});

describe("dual-cycle — 7 slides / spv 2 / step 2", () => {
  const plan = resolveCarouselPagePlan(7, "2", "2", VIEWPORT_WIDTH);

  it("wraps standard last page into remainder cycle", () => {
    const next = computeNextNavTarget(
      { pageIndex: 2, pageCycle: "standard" },
      plan,
    );
    assert.equal(next.pageCycle, "remainder");
    assert.equal(next.leadingSnap, 6);
    assert.equal(next.pageIndex, 0);
  });

  it("wraps remainder last page back to standard", () => {
    const next = computeNextNavTarget(
      { pageIndex: 3, pageCycle: "remainder" },
      plan,
    );
    assert.equal(next.pageCycle, "standard");
    assert.equal(next.leadingSnap, 0);
  });

  it("steps backward from standard page 0 into remainder tail", () => {
    const prev = computePrevNavTarget(
      { pageIndex: 0, pageCycle: "standard" },
      plan,
    );
    assert.equal(prev.pageCycle, "remainder");
    assert.equal(prev.pageIndex, 3);
    assert.equal(prev.leadingSnap, 5);
  });

  it("does not treat snap 5 as remainder when still in standard cycle", () => {
    const position = syncNavPositionFromSnap(5, plan, "standard");
    assert.equal(position.pageIndex, 2);
    assert.equal(position.pageCycle, "standard");

    const next = computeNextNavTarget(position, plan);
    assert.equal(next.pageCycle, "remainder");
    assert.equal(next.leadingSnap, 6);
  });
});

describe("mock engine navigation sequence", () => {
  it("native step 1 calls scrollNext instead of scrollTo wrap", () => {
    const calls: string[] = [];
    const engine: CarouselEngineApi = {
      selectedScrollSnap: () => 5,
      scrollNext: () => {
        calls.push("scrollNext");
      },
      scrollPrev: () => {
        calls.push("scrollPrev");
      },
      scrollTo: () => {
        calls.push("scrollTo");
      },
    };

    const mode = resolveCarouselNavMode(true, "1", "2", VIEWPORT_WIDTH);
    assert.equal(mode, "nativeStep1");

    if (mode === "nativeStep1") {
      engine.scrollNext();
    } else {
      const plan = resolveCarouselPagePlan(7, "2", "1", VIEWPORT_WIDTH);
      const target = computeNextNavTarget(
        { pageIndex: 5, pageCycle: "standard" },
        plan,
      );
      engine.scrollTo(target.leadingSnap);
    }

    assert.deepEqual(calls, ["scrollNext"]);
  });

  it("page plan step 2 uses scrollTo with leading snap", () => {
    const calls: Array<{ snap: number; direction?: number }> = [];
    const engine: CarouselEngineApi = {
      selectedScrollSnap: () => 4,
      scrollNext: () => {
        calls.push({ snap: -1 });
      },
      scrollPrev: () => {
        calls.push({ snap: -2 });
      },
      scrollTo: (snap, _jump, direction) => {
        calls.push({ snap, direction });
      },
    };

    const plan = resolveCarouselPagePlan(7, "2", "2", VIEWPORT_WIDTH);
    const position = resolveCurrentNavPosition(
      engine.selectedScrollSnap(),
      { pageIndex: 2, pageCycle: "standard" },
      plan,
    );
    const target = computeNextNavTarget(position, plan);
    engine.scrollTo(target.leadingSnap, false, -1);

    assert.equal(target.pageCycle, "remainder");
    assert.equal(target.leadingSnap, 6);
    assert.deepEqual(calls, [{ snap: 6, direction: -1 }]);
  });
});

describe("dot navigation within active cycle", () => {
  it("clamps dot index to cycle page count", () => {
    const plan = resolveCarouselPagePlan(7, "2", "2", VIEWPORT_WIDTH);
    const target = computeDotNavTarget(99, "remainder", plan);
    assert.equal(target.pageIndex, 3);
    assert.equal(target.leadingSnap, 5);
    assert.equal(target.action, "dot");
  });
});

describe("no pagination — 2 slides / spv 2", () => {
  it("does not paginate", () => {
    const plan = resolveCarouselPagePlan(2, "2", "1", VIEWPORT_WIDTH);
    assert.equal(plan.canPaginate, false);
    assert.equal(resolveCarouselNavMode(true, "1", "2", VIEWPORT_WIDTH), "nativeStep1");
  });
});
