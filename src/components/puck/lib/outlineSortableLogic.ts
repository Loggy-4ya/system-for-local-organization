/**
 * @fileoverview Pure helpers for outline sibling reorder indices.
 *
 * Tests: `tests/puck/lib/outlineSortableLogic.test.ts` — `npm run test:outline-sortable`
 *
 * @module src/components/puck/lib/outlineSortableLogic
 */

/** Drop position relative to a sibling row. */
export type OutlineDropPosition = "before" | "after";

/** Horizontal drag intent for outline nest / outdent gestures. */
export type OutlineDropIntent = "reorder" | "nest" | "outdent";

/** Pointer X offset required before a nest gesture activates. */
export const OUTLINE_NEST_OFFSET_PX = 24;

/** Pointer X offset required before an outdent gesture activates. */
export const OUTLINE_OUTDENT_OFFSET_PX = -24;

/** Puck root area id used in zone compound keys. */
const ROOT_AREA_ID = "root";

/**
 * Escape a zone compound key for safe use inside CSS attribute selectors.
 *
 * @param value - Raw zone compound key.
 * @returns Escaped selector token.
 */
function escapeOutlineSelectorValue(value: string): string {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
    return CSS.escape(value);
  }

  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

/**
 * Compute the destination index for a sibling reorder.
 *
 * @param sourceIndex - Dragged row index.
 * @param targetIndex - Row index under the pointer.
 * @param position - Whether to insert before or after the target row.
 * @returns Final destination index for Puck `reorder`.
 */
export function resolveOutlineDestinationIndex(
  sourceIndex: number,
  targetIndex: number,
  position: OutlineDropPosition,
): number {
  let destinationIndex = targetIndex;

  if (position === "after") {
    destinationIndex += 1;
  }
  if (sourceIndex < destinationIndex) {
    destinationIndex -= 1;
  }

  return destinationIndex;
}

/**
 * Build a Puck `reorder` move payload when the drag is valid.
 *
 * @param sourceIndex - Dragged sibling index.
 * @param targetIndex - Hovered sibling index.
 * @param position - Insertion side relative to the hovered row.
 * @returns Move payload, or null when the indices do not change.
 */
export function buildOutlineReorderMove(
  sourceIndex: number,
  targetIndex: number,
  position: OutlineDropPosition,
): { source: number; target: number } | null {
  const destinationIndex = resolveOutlineDestinationIndex(sourceIndex, targetIndex, position);

  if (sourceIndex === destinationIndex) {
    return null;
  }

  return { source: sourceIndex, target: destinationIndex };
}

/** Active outline drag source. */
export interface OutlineDragSource {
  /** Puck block id. */
  itemId: string;
  /** Source zone compound key. */
  sourceZone: string;
  /** Source index within the zone. */
  sourceIndex: number;
}

/** Outline drop target within or across zones. */
export interface OutlineDropTarget {
  /** Destination zone compound key. */
  destinationZone: string;
  /** Destination index within the zone. */
  destinationIndex: number;
  /** Resolved gesture intent for outline affordances. */
  intent?: OutlineDropIntent;
  /** Outdent insertion side relative to the escaped container row. */
  outdentPosition?: OutlineDropPosition;
}

/**
 * Resolve a drop on a sibling row into a Puck move/reorder target.
 *
 * @param source - Active drag source.
 * @param targetZone - Zone compound of the hovered row.
 * @param targetIndex - Sibling index of the hovered row.
 * @param position - Insert before/after the hovered row.
 * @returns Drop target, or null when the operation is a no-op.
 */
export function resolveOutlineRowDropTarget(
  source: OutlineDragSource,
  targetZone: string,
  targetIndex: number,
  position: OutlineDropPosition,
): OutlineDropTarget | null {
  if (source.sourceZone === targetZone) {
    const reorder = buildOutlineReorderMove(source.sourceIndex, targetIndex, position);
    if (!reorder) {
      return null;
    }

    return {
      destinationZone: targetZone,
      destinationIndex: reorder.target,
    };
  }

  let destinationIndex = targetIndex;
  if (position === "after") {
    destinationIndex += 1;
  }

  if (source.sourceZone === targetZone && source.sourceIndex === destinationIndex) {
    return null;
  }

  return {
    destinationZone: targetZone,
    destinationIndex,
  };
}

/**
 * Resolve a drop on a zone chrome target (title / empty list / insertion slot).
 *
 * @param source - Active drag source.
 * @param destinationZone - Target zone compound key.
 * @param destinationIndex - Index within the target zone.
 * @returns Drop target, or null when the operation is a no-op.
 */
export function resolveOutlineZoneDropTarget(
  source: OutlineDragSource,
  destinationZone: string,
  destinationIndex: number,
): OutlineDropTarget | null {
  if (source.sourceZone === destinationZone && source.sourceIndex === destinationIndex) {
    return null;
  }

  return {
    destinationZone,
    destinationIndex,
  };
}

/**
 * Resolve the container component id that owns a zone compound key.
 *
 * @param zoneCompound - Puck zone compound key.
 * @returns Container component id.
 */
export function getOutlineZoneContainerId(zoneCompound: string): string {
  return zoneCompound.split(":")[0] ?? "";
}

/**
 * Whether a zone compound belongs to the page root area.
 *
 * @param zoneCompound - Puck zone compound key.
 * @returns True when the zone is rooted at `root`.
 */
export function isOutlineRootZone(zoneCompound: string): boolean {
  return getOutlineZoneContainerId(zoneCompound) === ROOT_AREA_ID;
}

/**
 * Pick whether an outdent should land before or after the container row.
 *
 * Uses whichever vertical edge of the container group is closer to the pointer.
 *
 * @param containerRect - Bounding box for the container row or expanded item group.
 * @param clientY - Pointer Y coordinate.
 * @returns Insertion side relative to the container row.
 */
export function resolveOutlineOutdentPosition(
  containerRect: Pick<DOMRect, "top" | "bottom">,
  clientY: number,
): OutlineDropPosition {
  const distanceToTop = Math.abs(clientY - containerRect.top);
  const distanceToBottom = Math.abs(clientY - containerRect.bottom);
  return distanceToTop <= distanceToBottom ? "before" : "after";
}

/**
 * Resolve an outdent drop that moves a nested block to the parent zone.
 *
 * @param source - Active drag source.
 * @param parentZone - Zone compound that contains the immediate container row.
 * @param containerIndex - Index of the container row inside the parent zone.
 * @param position - Whether to insert before or after the container row.
 * @returns Outdent drop target, or null when the move is a no-op.
 */
export function resolveOutlineOutdentDropTarget(
  source: OutlineDragSource,
  parentZone: string,
  containerIndex: number,
  position: OutlineDropPosition = "after",
): OutlineDropTarget | null {
  if (isOutlineRootZone(source.sourceZone)) {
    return null;
  }

  let destinationIndex = position === "before" ? containerIndex : containerIndex + 1;

  if (source.sourceZone === parentZone && source.sourceIndex < destinationIndex) {
    destinationIndex -= 1;
  }

  if (source.sourceZone === parentZone && source.sourceIndex === destinationIndex) {
    return null;
  }

  return {
    destinationZone: parentZone,
    destinationIndex,
    intent: "outdent",
    outdentPosition: position,
  };
}

/**
 * Resolve a nest drop that moves a block into a container's primary slot zone.
 *
 * @param source - Active drag source.
 * @param nestZone - Destination child zone compound key.
 * @param destinationIndex - Insertion index inside the child zone.
 * @returns Nest drop target, or null when the move is a no-op.
 */
export function resolveOutlineNestDropTarget(
  source: OutlineDragSource,
  nestZone: string,
  destinationIndex: number,
): OutlineDropTarget | null {
  if (source.sourceZone === nestZone && source.sourceIndex === destinationIndex) {
    return null;
  }

  return {
    destinationZone: nestZone,
    destinationIndex,
    intent: "nest",
  };
}

/**
 * Whether nesting the drag source into the hovered row would move a parent into its descendant.
 *
 * @param sourceItemId - Dragged block id.
 * @param targetRowZone - Zone compound of the hovered row.
 * @param documentRoot - DOM root used to walk container ancestry.
 * @returns True when the nest operation must be blocked.
 */
export function isOutlineNestIntoDescendant(
  sourceItemId: string,
  targetRowZone: string,
  documentRoot: Document | HTMLElement,
): boolean {
  let containerId = getOutlineZoneContainerId(targetRowZone);

  while (containerId && containerId !== ROOT_AREA_ID) {
    if (containerId === sourceItemId) {
      return true;
    }

    const containerRow = documentRoot.querySelector(
      `[data-outline-item-id="${containerId}"]`,
    );

    if (!(containerRow instanceof HTMLElement)) {
      break;
    }

    const parentZone = containerRow.dataset.outlineZone;
    if (!parentZone) {
      break;
    }

    containerId = getOutlineZoneContainerId(parentZone);
  }

  return false;
}

/**
 * Read the append index for a zone from its bottom drop pad marker.
 *
 * @param nestZone - Destination zone compound key.
 * @param documentRoot - DOM root used to query drop markers.
 * @returns Append index, defaulting to zero when the zone is empty.
 */
export function readOutlineZoneAppendIndex(
  nestZone: string,
  documentRoot: Document | HTMLElement,
): number {
  const escapedZone = escapeOutlineSelectorValue(nestZone);
  const bottomPad = documentRoot.querySelector(
    `.nexus-outline-zone__bottom-pad[data-outline-drop-zone="${escapedZone}"]`,
  );

  if (bottomPad instanceof HTMLElement) {
    const destinationIndex = Number(bottomPad.dataset.outlineDropIndex ?? "0");
    if (!Number.isNaN(destinationIndex)) {
      return destinationIndex;
    }
  }

  const emptyZone = documentRoot.querySelector(
    `.nexus-outline-zone__empty[data-outline-drop-zone="${escapedZone}"]`,
  );

  if (emptyZone instanceof HTMLElement) {
    return 0;
  }

  return 0;
}

/**
 * Resolve a horizontal outdent gesture from the dragged item's container row.
 *
 * @param source - Active drag source.
 * @param documentRoot - DOM root used to locate the container row.
 * @param clientY - Pointer Y coordinate used for before/after edge proximity.
 * @returns Outdent drop target, or null when unavailable.
 */
export function resolveOutlineOutdentDropFromDom(
  source: OutlineDragSource,
  documentRoot: Document | HTMLElement,
  clientY: number,
): OutlineDropTarget | null {
  if (isOutlineRootZone(source.sourceZone)) {
    return null;
  }

  const containerId = getOutlineZoneContainerId(source.sourceZone);
  const containerRow = documentRoot.querySelector(`[data-outline-item-id="${containerId}"]`);

  if (!(containerRow instanceof HTMLElement)) {
    return null;
  }

  const parentZone = containerRow.dataset.outlineZone;
  const containerIndex = Number(containerRow.dataset.outlineIndex);

  if (!parentZone || Number.isNaN(containerIndex)) {
    return null;
  }

  const itemGroup = containerRow.closest(".nexus-outline-zone__item-group");
  const proximityRect =
    itemGroup instanceof HTMLElement ? itemGroup.getBoundingClientRect() : containerRow.getBoundingClientRect();
  const position = resolveOutlineOutdentPosition(proximityRect, clientY);

  return resolveOutlineOutdentDropTarget(source, parentZone, containerIndex, position);
}

/**
 * Resolve a horizontal nest gesture from the row under the pointer.
 *
 * @param source - Active drag source.
 * @param element - Element under the pointer.
 * @param documentRoot - DOM root used to read zone append indices.
 * @returns Nest drop target, or null when unavailable.
 */
export function resolveOutlineNestDropFromDom(
  source: OutlineDragSource,
  element: HTMLElement,
  documentRoot: Document | HTMLElement,
): OutlineDropTarget | null {
  const row = element.closest(".nexus-outline-layer__inner[data-outline-nest-zone]");

  if (!(row instanceof HTMLElement)) {
    return null;
  }

  const nestZone = row.dataset.outlineNestZone;
  const containerId = row.dataset.outlineItemId;
  const targetRowZone = row.dataset.outlineZone;

  if (!nestZone || !containerId || !targetRowZone || containerId === source.itemId) {
    return null;
  }

  if (isOutlineNestIntoDescendant(source.itemId, targetRowZone, documentRoot)) {
    return null;
  }

  const destinationIndex = readOutlineZoneAppendIndex(nestZone, documentRoot);
  return resolveOutlineNestDropTarget(source, nestZone, destinationIndex);
}

/**
 * Resolve the default pointer drop target without horizontal gestures.
 *
 * @param source - Active drag source.
 * @param element - Element under the pointer.
 * @param clientY - Pointer Y coordinate.
 * @returns Drop target, or null when nothing valid is under the pointer.
 */
export function resolveOutlineDropFromElement(
  source: OutlineDragSource,
  element: HTMLElement,
  clientY: number,
): OutlineDropTarget | null {
  const slot = element.closest("[data-outline-drop-zone][data-outline-drop-index]");
  if (slot instanceof HTMLElement) {
    const destinationZone = slot.dataset.outlineDropZone;
    const destinationIndex = Number(slot.dataset.outlineDropIndex);
    if (destinationZone && !Number.isNaN(destinationIndex)) {
      return resolveOutlineZoneDropTarget(source, destinationZone, destinationIndex);
    }
  }

  const zoneTitle = element.closest(".nexus-outline-zone__title[data-outline-drop-zone]");
  if (zoneTitle instanceof HTMLElement) {
    const destinationZone = zoneTitle.dataset.outlineDropZone;
    const destinationIndex = Number(zoneTitle.dataset.outlineDropIndex ?? "0");
    if (destinationZone && !Number.isNaN(destinationIndex)) {
      return resolveOutlineZoneDropTarget(source, destinationZone, destinationIndex);
    }
  }

  const emptyZone = element.closest(".nexus-outline-zone__empty[data-outline-drop-zone]");
  if (emptyZone instanceof HTMLElement) {
    const destinationZone = emptyZone.dataset.outlineDropZone;
    const destinationIndex = Number(emptyZone.dataset.outlineDropIndex ?? "0");
    if (destinationZone && !Number.isNaN(destinationIndex)) {
      return resolveOutlineZoneDropTarget(source, destinationZone, destinationIndex);
    }
  }

  const bottomPad = element.closest(".nexus-outline-zone__bottom-pad[data-outline-drop-zone]");
  if (bottomPad instanceof HTMLElement) {
    const destinationZone = bottomPad.dataset.outlineDropZone;
    const destinationIndex = Number(bottomPad.dataset.outlineDropIndex ?? "0");
    if (destinationZone && !Number.isNaN(destinationIndex)) {
      return resolveOutlineZoneDropTarget(source, destinationZone, destinationIndex);
    }
  }

  const row = element.closest("[data-outline-zone][data-outline-index].nexus-outline-layer__inner");
  if (row instanceof HTMLElement) {
    const targetZone = row.dataset.outlineZone;
    const targetIndex = Number(row.dataset.outlineIndex);
    if (
      targetZone &&
      !Number.isNaN(targetIndex) &&
      source.itemId !== row.closest("[data-puck-layer-tree-id]")?.getAttribute("data-puck-layer-tree-id")
    ) {
      const rect = row.getBoundingClientRect();
      const position: OutlineDropPosition =
        clientY < rect.top + rect.height / 2 ? "before" : "after";
      return resolveOutlineRowDropTarget(source, targetZone, targetIndex, position);
    }
  }

  return null;
}

/**
 * Resolve a drop target from the element under the pointer.
 *
 * Horizontal offset enables nest (swipe right) and outdent (swipe left) gestures.
 *
 * @param source - Active drag source.
 * @param clientX - Pointer X coordinate.
 * @param clientY - Pointer Y coordinate.
 * @param offsetX - Horizontal pointer delta from drag start.
 * @returns Drop target, or null when nothing valid is under the pointer.
 */
export function resolveOutlineDropFromPointer(
  source: OutlineDragSource,
  clientX: number,
  clientY: number,
  offsetX = 0,
): OutlineDropTarget | null {
  if (typeof document === "undefined") {
    return null;
  }

  if (offsetX <= OUTLINE_OUTDENT_OFFSET_PX) {
    const outdent = resolveOutlineOutdentDropFromDom(source, document, clientY);
    if (outdent) {
      return outdent;
    }
  }

  const element = document.elementFromPoint(clientX, clientY);
  if (!(element instanceof HTMLElement)) {
    return null;
  }

  if (offsetX >= OUTLINE_NEST_OFFSET_PX) {
    const nest = resolveOutlineNestDropFromDom(source, element, document);
    if (nest) {
      return nest;
    }
  }

  return resolveOutlineDropFromElement(source, element, clientY);
}
