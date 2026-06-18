/**
 * @fileoverview Pure helpers for reordering {@link NexusGrid} `items` array entries.
 *
 * Tests: `npm run test:grid-item-array-reorder` — `tests/puck/lib/gridItemArrayReorder.test.ts`
 *
 * @module src/components/puck/lib/gridItemArrayReorder
 */

/** Minimal grid cell record for reorder math. */
export interface GridItemArrayEntry {
  /** Optional sidebar label. */
  label?: string;
  /** Column span. */
  spanCol?: string;
  /** Row span. */
  spanRow?: string;
  /** Nested Puck slot content. */
  content?: unknown[];
  [key: string]: unknown;
}

/**
 * Move one array entry to a new index (stable for equal indices).
 *
 * @param items - Current grid cell array.
 * @param fromIndex - Source index.
 * @param toIndex - Destination index after removal adjustment.
 * @returns New array with the entry moved.
 */
export function reorderGridItemArray<T extends GridItemArrayEntry>(
  items: readonly T[],
  fromIndex: number,
  toIndex: number,
): T[] {
  if (items.length === 0) {
    return [];
  }

  const from = Math.trunc(fromIndex);
  const to = Math.trunc(toIndex);

  if (from < 0 || from >= items.length || to < 0 || to >= items.length || from === to) {
    return [...items];
  }

  const next = [...items];
  const [moved] = next.splice(from, 1);
  if (!moved) {
    return [...items];
  }

  next.splice(to, 0, moved);
  return next;
}

/**
 * Resolve a destination index when dropping a cell onto another cell shell.
 *
 * @param fromIndex - Drag source cell index.
 * @param overIndex - Cell index under the pointer on drop.
 * @param itemCount - Total cell count.
 * @returns Destination index for {@link reorderGridItemArray}.
 */
export function resolveGridCellDropIndex(
  fromIndex: number,
  overIndex: number,
  itemCount: number,
): number {
  if (itemCount <= 1) {
    return fromIndex;
  }

  const from = Math.max(0, Math.min(Math.trunc(fromIndex), itemCount - 1));
  const over = Math.max(0, Math.min(Math.trunc(overIndex), itemCount - 1));

  if (from === over) {
    return from;
  }

  return over;
}
