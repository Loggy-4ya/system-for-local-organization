/**
 * @fileoverview Pure helpers for canvas drag reparenting during Edit mode.
 *
 * Resolves destination zones/indices and builds Puck `move` / `reorder` commits when
 * native dnd-kit collision picks a sibling instead of a nested slot container.
 *
 * Tests: `npm run test:canvas-reparent` — `tests/puck/lib/canvasReparentLogic.test.ts`
 *
 * @module src/components/puck/lib/canvasReparentLogic
 */

import { isCanvasRootDropZone } from "@/components/puck/lib/canvasDropTargetLogic";

/** Active canvas drag source block. */
export interface CanvasDragSource {
  /** Puck block id (`props.id`). */
  itemId: string;
  /** Source zone compound key. */
  sourceZone: string;
  /** Source index within the source zone. */
  sourceIndex: number;
}

/** Resolved canvas drop target zone and insertion index. */
export interface CanvasDropTarget {
  /** Destination zone compound key. */
  destinationZone: string;
  /** Destination index within the destination zone. */
  destinationIndex: number;
}

/** Puck dispatch payload produced by the canvas reparent coordinator. */
export interface CanvasReparentCommit extends CanvasDragSource, CanvasDropTarget {
  /** Whether to dispatch `move` (cross-zone) or `reorder` (same zone). */
  dispatchType: "move" | "reorder";
}

/** Minimal Puck node index entry for descendant checks. */
export interface CanvasNodeIndexEntry {
  /** Zone path segments from root to this block's parent zone. */
  path?: string[];
}

/** Measured child row inside a drop zone for index resolution. */
export interface CanvasDropZoneChildRect {
  /** Sibling index within the zone. */
  index: number;
  /** Top edge in viewport px. */
  top: number;
  /** Bottom edge in viewport px. */
  bottom: number;
  /** Rendered height in px. */
  height: number;
}

/** Input for pure destination-index resolution (DOM-free in tests). */
export interface CanvasDestinationIndexInput {
  /** Pointer Y in preview viewport coordinates. */
  clientY: number;
  /** Source zone compound key. */
  sourceZone: string;
  /** Source index within the source zone. */
  sourceIndex: number;
  /** Target zone compound key. */
  zoneCompound: string;
  /** When true, the zone has no committed children. */
  isEmpty: boolean;
  /** Committed child geometry ordered by sibling index. */
  childRects: readonly CanvasDropZoneChildRect[];
  /** Top edge of the Puck append hitbox, or null when unavailable. */
  hitboxTop: number | null;
}

/**
 * Resolve the container component id that owns a zone compound key.
 *
 * @param zoneCompound - Puck zone compound key.
 * @returns Container component id.
 */
export function getCanvasZoneContainerId(zoneCompound: string): string {
  return zoneCompound.split(":")[0] ?? "";
}

/**
 * Whether nesting into the destination zone would move a block into its own subtree.
 *
 * @param sourceId - Dragged block id.
 * @param destZone - Destination zone compound key.
 * @param nodesIndex - Puck `indexes.nodes` map.
 * @returns True when the reparent must be blocked.
 */
export function isCanvasNestIntoDescendant(
  sourceId: string,
  destZone: string,
  nodesIndex: Record<string, CanvasNodeIndexEntry>,
): boolean {
  const containerId = getCanvasZoneContainerId(destZone);
  if (!containerId || containerId === "root") {
    return false;
  }

  if (containerId === sourceId) {
    return true;
  }

  const containerNode = nodesIndex[containerId];
  if (!containerNode?.path?.length) {
    return false;
  }

  return containerNode.path.some(
    (segment) => getCanvasZoneContainerId(segment) === sourceId,
  );
}

/**
 * Resolve the insertion index within a drop zone from pointer geometry.
 *
 * @param input - Pointer position and measured zone children.
 * @returns Destination sibling index.
 */
export function resolveCanvasDestinationIndex(input: CanvasDestinationIndexInput): number {
  const {
    clientY,
    sourceZone,
    sourceIndex,
    zoneCompound,
    isEmpty,
    childRects,
    hitboxTop,
  } = input;

  if (isEmpty || childRects.length === 0) {
    return 0;
  }

  if (hitboxTop !== null && clientY >= hitboxTop) {
    let destinationIndex = childRects.length;
    if (sourceZone === zoneCompound && sourceIndex < destinationIndex) {
      destinationIndex -= 1;
    }
    return destinationIndex;
  }

  for (const child of childRects) {
    const mid = child.top + child.height / 2;
    if (clientY < mid) {
      let destinationIndex = child.index;
      if (sourceZone === zoneCompound && sourceIndex < destinationIndex) {
        destinationIndex -= 1;
      }
      return destinationIndex;
    }
  }

  let destinationIndex = childRects.length;
  if (sourceZone === zoneCompound && sourceIndex < destinationIndex) {
    destinationIndex -= 1;
  }

  return destinationIndex;
}

/**
 * Build a Puck move/reorder commit when the drag is valid.
 *
 * @param source - Active drag source.
 * @param destinationZone - Target zone compound key.
 * @param destinationIndex - Insertion index within the target zone (already adjusted for same-zone removal).
 * @returns Commit payload, or null when the operation is a no-op.
 */
export function buildCanvasReparentCommit(
  source: CanvasDragSource,
  destinationZone: string,
  destinationIndex: number,
): CanvasReparentCommit | null {
  if (source.sourceZone === destinationZone) {
    if (source.sourceIndex === destinationIndex) {
      return null;
    }

    return {
      ...source,
      destinationZone,
      destinationIndex,
      dispatchType: "reorder",
    };
  }

  return {
    ...source,
    destinationZone,
    destinationIndex,
    dispatchType: "move",
  };
}

/**
 * Whether the canvas coordinator should override Puck's native drop result.
 *
 * @param intended - Last resolved hover target from pointer hit-testing.
 * @param actual - Selector after Puck drag end (`getSelectorForId`).
 * @returns True when a corrective dispatch is needed.
 */
export function shouldOverridePuckDrop(
  intended: CanvasDropTarget | null,
  actual: { zone: string; index: number } | null | undefined,
): boolean {
  if (!intended) {
    return false;
  }

  if (!actual) {
    return true;
  }

  return (
    intended.destinationZone !== actual.zone ||
    intended.destinationIndex !== actual.index
  );
}

/**
 * Whether a reparent commit should run even when Puck landed on the intended zone
 * but the drag started elsewhere (user hovered a nested slot — force nest).
 *
 * @param dragStartSource - Source captured at drag start (immutable).
 * @param intended - Sticky hover target at release.
 * @param actual - Selector after Puck drag end.
 * @returns True when a cross-zone move must be committed.
 */
export function shouldForceCanvasReparentCommit(
  dragStartSource: CanvasDragSource | null,
  intended: CanvasDropTarget | null,
  actual: { zone: string; index: number } | null | undefined,
): boolean {
  if (!dragStartSource || !intended) {
    return false;
  }

  if (dragStartSource.sourceZone === intended.destinationZone) {
    return false;
  }

  if (!actual) {
    return true;
  }

  const intendedNested = !isCanvasRootDropZone(intended.destinationZone);
  const actualRoot = isCanvasRootDropZone(actual.zone);

  if (intendedNested && actualRoot) {
    return true;
  }

  return (
    actual.zone !== intended.destinationZone ||
    actual.index !== intended.destinationIndex
  );
}

/**
 * Measure committed child rows inside a drop zone for index resolution.
 *
 * @param dropZone - Puck drop-zone root element.
 * @returns Ordered child rectangles excluding the active drag ghost.
 */
export function measureCanvasDropZoneChildRects(dropZone: Element): CanvasDropZoneChildRect[] {
  const children = dropZone.querySelectorAll<HTMLElement>(
    ":scope > [data-puck-component]:not([data-dnd-dragging]):not([data-puck-dragging])",
  );

  const rects: CanvasDropZoneChildRect[] = [];

  children.forEach((child, index) => {
    const rect = child.getBoundingClientRect();
    if (rect.height <= 0) {
      return;
    }

    rects.push({
      index,
      top: rect.top,
      bottom: rect.bottom,
      height: rect.height,
    });
  });

  return rects;
}

/**
 * Read the append hitbox top edge for a drop zone when Puck renders one.
 *
 * @param dropZone - Puck drop-zone root element.
 * @returns Hitbox top in viewport px, or null when absent.
 */
export function readCanvasDropZoneHitboxTop(dropZone: Element): number | null {
  const hitbox = dropZone.querySelector('[class*="DropZone-hitbox"]');
  if (!(hitbox instanceof HTMLElement)) {
    return null;
  }

  const rect = hitbox.getBoundingClientRect();
  return rect.height > 0 ? rect.top : null;
}
