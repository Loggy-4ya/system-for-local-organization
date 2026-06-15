/**
 * @fileoverview Pure list reorder helpers for the Global Layout Editor drag-and-drop lists.
 *
 * Tests: `tests/global-layout/lib/editorSortableLogic.test.ts` — `npm run test:global-layout-sortable`
 *
 * @module src/components/global-layout/lib/editorSortableLogic
 */

import type { HeaderCategory } from "@shared/constants/globalLayout";
import { resolveOutlineDestinationIndex } from "@/components/puck/lib/outlineSortableLogic";
import type { OutlineDropPosition } from "@/components/puck/lib/outlineSortableLogic";

/** Nav item drag source within the header category tree. */
export interface HeaderNavDragSource {
  /** Category containing the dragged item. */
  categoryId: string;
  /** Index of the dragged item inside the category. */
  itemIndex: number;
}

/** Nav item drop target within the header category tree. */
export interface HeaderNavDragTarget {
  /** Destination category id. */
  categoryId: string;
  /** Hovered item index inside the destination category. */
  itemIndex: number;
  /** Insert before or after the hovered row. */
  position: OutlineDropPosition;
}

/**
 * Reorder an array by moving one index before/after another row.
 *
 * @param items - Source list (not mutated).
 * @param fromIndex - Index being dragged.
 * @param overIndex - Index currently hovered.
 * @param position - Insert before or after the hovered row.
 * @returns New list with the item moved, or the original reference when unchanged.
 */
export function reorderEditorList<T>(
  items: readonly T[],
  fromIndex: number,
  overIndex: number,
  position: OutlineDropPosition,
): T[] {
  const destinationIndex = resolveOutlineDestinationIndex(fromIndex, overIndex, position);

  if (fromIndex === destinationIndex) {
    return items as T[];
  }

  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(destinationIndex, 0, moved);
  return next;
}

/**
 * Resolve whether the pointer is in the top or bottom half of a row rect.
 *
 * @param rect - Row bounding box.
 * @param clientY - Pointer Y coordinate.
 * @returns Drop position relative to the hovered row.
 */
export function resolveEditorRowDropPosition(
  rect: Pick<DOMRect, "top" | "height">,
  clientY: number,
): OutlineDropPosition {
  return clientY < rect.top + rect.height / 2 ? "before" : "after";
}

/**
 * Whether a drop slot should render before the row at `index`.
 *
 * @param dragOverIndex - Hovered row index, or `-1` when unset.
 * @param index - Row index being rendered.
 * @param position - Active drop position.
 * @returns `true` when the slot should be visible.
 */
export function shouldShowEditorDropSlotBefore(
  dragOverIndex: number,
  index: number,
  position: OutlineDropPosition | null,
): boolean {
  return dragOverIndex === index && position === "before";
}

/**
 * Whether a drop slot should render after the final row.
 *
 * @param dragOverIndex - Hovered row index, or `-1` when unset.
 * @param index - Row index being rendered.
 * @param itemCount - Total rows in the list.
 * @param position - Active drop position.
 * @returns `true` when the trailing slot should be visible.
 */
export function shouldShowEditorDropSlotAfter(
  dragOverIndex: number,
  index: number,
  itemCount: number,
  position: OutlineDropPosition | null,
): boolean {
  return index === itemCount - 1 && dragOverIndex === index && position === "after";
}

/**
 * Move or reorder a header nav item within or across categories.
 *
 * @param categories - Current header categories (not mutated).
 * @param source - Drag source category and item index.
 * @param target - Drop target category, item index, and side.
 * @returns Updated categories, or the original reference when unchanged.
 */
export function moveHeaderNavItem(
  categories: readonly HeaderCategory[],
  source: HeaderNavDragSource,
  target: HeaderNavDragTarget,
): HeaderCategory[] {
  const sourceCategory = categories.find((category) => category.id === source.categoryId);
  const targetCategory = categories.find((category) => category.id === target.categoryId);

  if (!sourceCategory || !targetCategory) {
    return categories as HeaderCategory[];
  }

  const movedItem = sourceCategory.items[source.itemIndex];
  if (!movedItem) {
    return categories as HeaderCategory[];
  }

  if (source.categoryId === target.categoryId) {
    const reordered = reorderEditorList(
      sourceCategory.items,
      source.itemIndex,
      target.itemIndex,
      target.position,
    );

    if (reordered === sourceCategory.items) {
      return categories as HeaderCategory[];
    }

    return categories.map((category) =>
      category.id === source.categoryId ? { ...category, items: reordered } : category,
    );
  }

  const nextSourceItems = sourceCategory.items.filter((_, index) => index !== source.itemIndex);
  const insertIndex = Math.max(
    0,
    Math.min(
      target.position === "before" ? target.itemIndex : target.itemIndex + 1,
      targetCategory.items.length,
    ),
  );
  const nextTargetItems = [...targetCategory.items];
  nextTargetItems.splice(insertIndex, 0, movedItem);

  return categories.map((category) => {
    if (category.id === source.categoryId) {
      return { ...category, items: nextSourceItems };
    }

    if (category.id === target.categoryId) {
      return { ...category, items: nextTargetItems };
    }

    return category;
  });
}

export default reorderEditorList;
