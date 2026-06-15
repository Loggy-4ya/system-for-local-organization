/**
 * @fileoverview Pure canvas drag commit resolution for carousel reparent scenarios.
 *
 * Models the post-drop decision in {@link NexusCanvasDragCoordinator} so screencast
 * regressions (cross-slide move/revert, drag in/out of carousel slides) can be tested
 * without a browser.
 *
 * Tests: `tests/puck/lib/canvasDragCarouselScenarios.test.ts` — `npm run test:canvas-carousel-drag`
 *
 * @module src/components/puck/lib/canvasDragCommitPlan
 */

import {
  shouldAcceptCanvasReleaseTargetUpdate,
  type CanvasReleaseTargetDragStart,
  type CanvasReleaseTargetRef,
} from "@/components/puck/lib/canvasDropTargetLogic";
import {
  buildCanvasReparentCommit,
  shouldForceCanvasReparentCommit,
  shouldOverridePuckDrop,
  type CanvasDragSource,
  type CanvasDropTarget,
  type CanvasReparentCommit,
} from "@/components/puck/lib/canvasReparentLogic";

/** Puck selector after native drag end. */
export interface CanvasDragActualSelector {
  /** Zone compound key where Puck landed the block. */
  zone: string;
  /** Index within that zone. */
  index: number;
}

/** Input for simulating release-target tracking across pointer events. */
export interface CanvasReleaseTargetStep {
  /** Resolved zone compound from hit-testing. */
  destinationZone: string;
  /** Resolved insertion index. */
  destinationIndex: number;
  /** Whether this step is pointer-move hover or pointer-up release. */
  phase: "hover" | "release";
}

/** Result of simulating release-target tracking. */
export interface CanvasReleaseTargetSimulation {
  /** Final intended drop target used for commit. */
  intended: CanvasReleaseTargetRef;
  /** Per-step accept/reject decisions (for debugging tests). */
  accepted: boolean[];
}

/**
 * Apply one hit-test result to the tracked release target.
 *
 * @param previous - Current release target ref.
 * @param next - Newly resolved target from hit-testing.
 * @param dragStart - Source zone at drag start.
 * @param phase - Hover vs release phase.
 * @returns Updated release target (unchanged when the guard rejects).
 */
export function resolveCanvasReleaseTargetRef(
  previous: CanvasReleaseTargetRef | null,
  next: CanvasReleaseTargetRef,
  dragStart: CanvasReleaseTargetDragStart | null,
  phase: "hover" | "release",
): CanvasReleaseTargetRef {
  if (shouldAcceptCanvasReleaseTargetUpdate(previous, next, dragStart, phase)) {
    return next;
  }

  return previous ?? next;
}

/**
 * Simulate pointer-move / pointer-up sequences against the release-target guard.
 *
 * @param dragStart - Source zone at drag start.
 * @param steps - Ordered hit-test results.
 * @returns Final intended target and per-step accept flags.
 */
export function simulateCanvasReleaseTargetTracking(
  dragStart: CanvasReleaseTargetDragStart,
  steps: readonly CanvasReleaseTargetStep[],
): CanvasReleaseTargetSimulation {
  let current: CanvasReleaseTargetRef | null = null;
  const accepted: boolean[] = [];

  for (const step of steps) {
    const next: CanvasReleaseTargetRef = {
      destinationZone: step.destinationZone,
      destinationIndex: step.destinationIndex,
    };
    const before = current?.destinationZone ?? null;
    const nextRef = resolveCanvasReleaseTargetRef(current, next, dragStart, step.phase);
    accepted.push(nextRef.destinationZone === next.destinationZone);
    current = nextRef;

    if (step.phase === "release" && before !== null && nextRef.destinationZone === before) {
      /** Release rejected — intended stays at previous hover target. */
    }
  }

  if (!current) {
    throw new Error("simulateCanvasReleaseTargetTracking requires at least one step");
  }

  return { intended: current, accepted };
}

/**
 * Resolve whether the canvas coordinator should dispatch a corrective move/reorder.
 *
 * @param dragStart - Source captured at drag start (immutable).
 * @param intended - Final intended drop target after release tracking.
 * @param actualAfterPuck - Selector read from Puck after native drag end.
 * @returns Commit payload when a corrective dispatch is required, otherwise null.
 */
export function resolveCanvasDragCommitPlan(
  dragStart: CanvasDragSource,
  intended: CanvasDropTarget,
  actualAfterPuck: CanvasDragActualSelector,
): CanvasReparentCommit | null {
  const currentSource: CanvasDragSource = {
    itemId: dragStart.itemId,
    sourceZone: actualAfterPuck.zone,
    sourceIndex: actualAfterPuck.index,
  };

  const commit = buildCanvasReparentCommit(
    currentSource,
    intended.destinationZone,
    intended.destinationIndex,
  );

  if (!commit) {
    return null;
  }

  /**
   * Puck already reparented cross-zone but release tracking snapped back to drag start.
   * Never undo a successful native drop (screencast: outline shows neighbor, then reverts ~320ms).
   */
  if (
    intended.destinationZone === dragStart.sourceZone &&
    actualAfterPuck.zone !== dragStart.sourceZone
  ) {
    return null;
  }

  const needsOverride =
    shouldOverridePuckDrop(intended, actualAfterPuck) ||
    shouldForceCanvasReparentCommit(dragStart, intended, actualAfterPuck);

  return needsOverride ? commit : null;
}
