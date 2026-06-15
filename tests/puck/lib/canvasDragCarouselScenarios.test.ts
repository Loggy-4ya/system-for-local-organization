/**
 * @fileoverview Screencast-driven scenario tests for carousel canvas drag reparenting.
 *
 * Scenarios derived from screencast 2026-06-15 18-42-38:
 * - Cross-slide move must not revert when pointer-up snaps to source slide
 * - Drag out of carousel slide to section sibling must commit
 * - Drag into carousel slide from section sibling must commit
 * - Ghost snap-back on release must not undo a valid neighbor-slide hover
 *
 * Module under test: src/components/puck/lib/canvasDragCommitPlan.ts
 * Registry: .ai/docs/testing.md
 * Run: `npm run test:canvas-carousel-drag`
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  resolveCanvasDragCommitPlan,
  simulateCanvasReleaseTargetTracking,
} from "@/components/puck/lib/canvasDragCommitPlan";
import {
  resolveOutlineNestDropTarget,
  resolveOutlineRowDropTarget,
  resolveOutlineZoneDropTarget,
} from "@/components/puck/lib/outlineSortableLogic";

/** Shared carousel + section zone keys matching the screencast page tree. */
const Z = {
  section: "section-1:content",
  carouselSlide0: "carousel-1:slides[0].content",
  carouselSlide1: "carousel-1:slides[1].content",
  carouselSlide2: "carousel-1:slides[2].content",
  root: "root:content",
} as const;

const VIDEO_ID = "video-1";

describe("screencast — outline cross-slide move (frame 3→4)", () => {
  it("resolves move from slide 1 to slide 2 via zone drop target", () => {
    assert.deepEqual(
      resolveOutlineZoneDropTarget(
        { itemId: VIDEO_ID, sourceZone: Z.carouselSlide1, sourceIndex: 0 },
        Z.carouselSlide2,
        0,
      ),
      { destinationZone: Z.carouselSlide2, destinationIndex: 0 },
    );
  });

  it("resolves move from slide 1 to before slide 2 body text row", () => {
    assert.deepEqual(
      resolveOutlineRowDropTarget(
        { itemId: VIDEO_ID, sourceZone: Z.carouselSlide1, sourceIndex: 0 },
        Z.carouselSlide2,
        0,
        "before",
      ),
      { destinationZone: Z.carouselSlide2, destinationIndex: 0 },
    );
  });
});

describe("screencast — canvas cross-slide move with release snap-back (frame 3→4)", () => {
  it("keeps neighbor slide target when pointer crosses source slide on hover", () => {
    const dragStart = { sourceZone: Z.carouselSlide1 };
    const { intended, accepted } = simulateCanvasReleaseTargetTracking(dragStart, [
      { destinationZone: Z.carouselSlide2, destinationIndex: 0, phase: "hover" },
      { destinationZone: Z.carouselSlide1, destinationIndex: 0, phase: "hover" },
      { destinationZone: Z.carouselSlide2, destinationIndex: 0, phase: "hover" },
    ]);

    assert.equal(intended.destinationZone, Z.carouselSlide2);
    assert.deepEqual(accepted, [true, false, true]);
  });

  it("keeps neighbor slide target when pointer-up snaps to source slide", () => {
    const dragStart = { sourceZone: Z.carouselSlide1 };
    const { intended, accepted } = simulateCanvasReleaseTargetTracking(dragStart, [
      { destinationZone: Z.carouselSlide2, destinationIndex: 0, phase: "hover" },
      {
        destinationZone: Z.carouselSlide1,
        destinationIndex: 0,
        phase: "hover",
      },
      {
        destinationZone: Z.carouselSlide1,
        destinationIndex: 0,
        phase: "release",
      },
    ]);

    assert.equal(intended.destinationZone, Z.carouselSlide2);
    assert.deepEqual(accepted, [true, false, false]);
  });

  it("commits corrective move when Puck reverts to source after hover on slide 2", () => {
    const dragStart = {
      itemId: VIDEO_ID,
      sourceZone: Z.carouselSlide1,
      sourceIndex: 0,
    };
    const intended = { destinationZone: Z.carouselSlide2, destinationIndex: 0 };

    const plan = resolveCanvasDragCommitPlan(dragStart, intended, {
      zone: Z.carouselSlide1,
      index: 0,
    });

    assert.deepEqual(plan, {
      itemId: VIDEO_ID,
      sourceZone: Z.carouselSlide1,
      sourceIndex: 0,
      destinationZone: Z.carouselSlide2,
      destinationIndex: 0,
      dispatchType: "move",
    });
  });
});

describe("screencast — drag out of carousel to section sibling (frame 5→6)", () => {
  it("tracks section hover during pointer-move", () => {
    const dragStart = { sourceZone: Z.carouselSlide1 };
    const { intended } = simulateCanvasReleaseTargetTracking(dragStart, [
      { destinationZone: Z.section, destinationIndex: 1, phase: "hover" },
    ]);

    assert.equal(intended.destinationZone, Z.section);
  });

  it("keeps section target when pointer-up snaps back to source slide", () => {
    const dragStart = { sourceZone: Z.carouselSlide1 };
    const { intended } = simulateCanvasReleaseTargetTracking(dragStart, [
      { destinationZone: Z.section, destinationIndex: 1, phase: "hover" },
      {
        destinationZone: Z.carouselSlide1,
        destinationIndex: 0,
        phase: "release",
      },
    ]);

    assert.equal(intended.destinationZone, Z.section);
  });

  it("commits drag-out when Puck leaves video in the carousel slide", () => {
    const dragStart = {
      itemId: VIDEO_ID,
      sourceZone: Z.carouselSlide1,
      sourceIndex: 0,
    };
    const intended = { destinationZone: Z.section, destinationIndex: 1 };

    const plan = resolveCanvasDragCommitPlan(dragStart, intended, {
      zone: Z.carouselSlide1,
      index: 0,
    });

    assert.equal(plan?.destinationZone, Z.section);
    assert.equal(plan?.dispatchType, "move");
  });

  it("accepts fast drag-out when hover never left source slide but release hits section", () => {
    const dragStart = { sourceZone: Z.carouselSlide1 };
    const { intended } = simulateCanvasReleaseTargetTracking(dragStart, [
      {
        destinationZone: Z.section,
        destinationIndex: 1,
        phase: "release",
      },
    ]);

    assert.equal(intended.destinationZone, Z.section);
  });
});

describe("screencast — drag into carousel from section sibling (frame 8→9)", () => {
  it("tracks carousel slide hover during pointer-move from section", () => {
    const dragStart = { sourceZone: Z.section };
    const { intended } = simulateCanvasReleaseTargetTracking(dragStart, [
      { destinationZone: Z.carouselSlide0, destinationIndex: 0, phase: "hover" },
    ]);

    assert.equal(intended.destinationZone, Z.carouselSlide0);
  });

  it("keeps carousel slide when pointer-up snaps back to section source", () => {
    const dragStart = { sourceZone: Z.section };
    const { intended } = simulateCanvasReleaseTargetTracking(dragStart, [
      { destinationZone: Z.carouselSlide0, destinationIndex: 0, phase: "hover" },
      { destinationZone: Z.section, destinationIndex: 1, phase: "release" },
    ]);

    assert.equal(intended.destinationZone, Z.carouselSlide0);
  });

  it("commits drag-in when Puck keeps video as section sibling", () => {
    const dragStart = {
      itemId: VIDEO_ID,
      sourceZone: Z.section,
      sourceIndex: 1,
    };
    const intended = { destinationZone: Z.carouselSlide0, destinationIndex: 0 };

    const plan = resolveCanvasDragCommitPlan(dragStart, intended, {
      zone: Z.section,
      index: 1,
    });

    assert.deepEqual(plan, {
      itemId: VIDEO_ID,
      sourceZone: Z.section,
      sourceIndex: 1,
      destinationZone: Z.carouselSlide0,
      destinationIndex: 0,
      dispatchType: "move",
    });
  });

  it("resolves outline nest from section into empty slide slot", () => {
    assert.deepEqual(
      resolveOutlineNestDropTarget(
        { itemId: VIDEO_ID, sourceZone: Z.section, sourceIndex: 1 },
        Z.carouselSlide0,
        0,
      ),
      {
        destinationZone: Z.carouselSlide0,
        destinationIndex: 0,
        intent: "nest",
      },
    );
  });
});

describe("screencast — full cross-slide migration (video to next slide)", () => {
  it("commits move to slide 2 after hover path with source-slide crossing", () => {
    const dragStart = {
      itemId: VIDEO_ID,
      sourceZone: Z.carouselSlide0,
      sourceIndex: 0,
    };

    const { intended } = simulateCanvasReleaseTargetTracking(
      { sourceZone: Z.carouselSlide0 },
      [
        { destinationZone: Z.carouselSlide1, destinationIndex: 0, phase: "hover" },
        { destinationZone: Z.carouselSlide0, destinationIndex: 0, phase: "hover" },
        { destinationZone: Z.carouselSlide1, destinationIndex: 0, phase: "release" },
      ],
    );

    const plan = resolveCanvasDragCommitPlan(dragStart, intended, {
      zone: Z.carouselSlide0,
      index: 0,
    });

    assert.equal(intended.destinationZone, Z.carouselSlide1);
    assert.equal(plan?.destinationZone, Z.carouselSlide1);
  });
});

describe("screencast — drag into default section from root", () => {
  it("commits move from root into occupied starter section", () => {
    const dragStart = {
      itemId: VIDEO_ID,
      sourceZone: Z.root,
      sourceIndex: 0,
    };
    const intended = { destinationZone: Z.section, destinationIndex: 2 };

    const plan = resolveCanvasDragCommitPlan(dragStart, intended, {
      zone: Z.root,
      index: 0,
    });

    assert.equal(plan?.destinationZone, Z.section);
    assert.equal(plan?.destinationIndex, 2);
  });

  it("tracks section hover when dragging from root", () => {
    const { intended } = simulateCanvasReleaseTargetTracking(
      { sourceZone: Z.root },
      [{ destinationZone: Z.section, destinationIndex: 2, phase: "hover" }],
    );

    assert.equal(intended.destinationZone, Z.section);
  });
});

describe("screencast — no double-commit when Puck already landed correctly", () => {
  it("skips corrective dispatch when actual matches intended", () => {
    const dragStart = {
      itemId: VIDEO_ID,
      sourceZone: Z.carouselSlide1,
      sourceIndex: 0,
    };
    const intended = { destinationZone: Z.carouselSlide2, destinationIndex: 0 };

    assert.equal(
      resolveCanvasDragCommitPlan(dragStart, intended, {
        zone: Z.carouselSlide2,
        index: 0,
      }),
      null,
    );
  });

  it("does not revert when release tracking snapped to source but Puck moved to neighbor slide", () => {
    const dragStart = {
      itemId: VIDEO_ID,
      sourceZone: Z.carouselSlide0,
      sourceIndex: 0,
    };
    const intended = { destinationZone: Z.carouselSlide0, destinationIndex: 0 };

    assert.equal(
      resolveCanvasDragCommitPlan(dragStart, intended, {
        zone: Z.carouselSlide1,
        index: 0,
      }),
      null,
    );
  });
});
