/**
 * @fileoverview Pure helpers for Page Manager catalog drag preview + settle indices.
 *
 * Tests: `tests/shared/lib/pageManagerCatalogDragMotionLogic.test.ts` — `npm run test:page-manager-catalog-drag-motion-logic`
 *
 * @module shared/lib/pageManagerCatalogDragMotionLogic
 */

import type { PageManagerDropPosition } from "@shared/lib/pageManagerCatalogLogic";

/** One grid slot step during an in-section drag preview. */
export type PageManagerCatalogPreviewShift = -1 | 1;

/**
 * Compute the final page index after an in-section reorder.
 *
 * @param fromIndex - Dragged card index.
 * @param overIndex - Hovered card index.
 * @param position - Insert before or after the hovered card.
 * @returns Destination index in the section page list.
 */
export function resolveManagerCatalogDestinationIndex(
  fromIndex: number,
  overIndex: number,
  position: PageManagerDropPosition,
): number {
  let destinationIndex = overIndex;

  if (position === "after") {
    destinationIndex += 1;
  }
  if (fromIndex < destinationIndex) {
    destinationIndex -= 1;
  }

  return destinationIndex;
}

/**
 * Resolve which sibling cards should visually shift one slot during drag preview.
 *
 * The dragged card itself is excluded — it is represented by the floating ghost.
 *
 * @param pageCount - Cards in the section.
 * @param sourceIndex - Dragged card index.
 * @param overIndex - Hovered card index.
 * @param position - Insert before or after the hovered card.
 * @returns Map of page index → direction (-1 toward lower indices, +1 toward higher).
 */
export function resolveManagerCatalogPreviewShiftOffsets(
  pageCount: number,
  sourceIndex: number,
  overIndex: number,
  position: PageManagerDropPosition,
): ReadonlyMap<number, PageManagerCatalogPreviewShift> {
  if (pageCount <= 1) {
    return new Map();
  }

  const destinationIndex = resolveManagerCatalogDestinationIndex(sourceIndex, overIndex, position);
  if (sourceIndex === destinationIndex) {
    return new Map();
  }

  const shifts = new Map<number, PageManagerCatalogPreviewShift>();

  if (sourceIndex < destinationIndex) {
    for (let index = sourceIndex + 1; index <= destinationIndex; index += 1) {
      shifts.set(index, -1);
    }
    return shifts;
  }

  for (let index = destinationIndex; index < sourceIndex; index += 1) {
    shifts.set(index, 1);
  }

  return shifts;
}
