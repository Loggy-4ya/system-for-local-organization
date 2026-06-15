/**
 * @fileoverview Automatic list item labels derived from array index.
 *
 * @module src/components/puck/lib/listItemLabels
 */

/** Minimal list item shape stored on NexusList props. */
export interface ListItemRecord {
  label?: string;
  text?: string;
  id?: string;
  [key: string]: unknown;
}

/**
 * Format the default sidebar/canvas label for a list item at the given index.
 *
 * @param index - Zero-based item index.
 * @returns Human-readable label such as "Item 1".
 */
export function formatListItemLabel(index: number): string {
  return `Item ${index + 1}`;
}

/**
 * Assign `Item N` only when a list item has no label yet (preserves user renames).
 *
 * Legacy rows that only stored `text` keep that value for canvas output; the sidebar
 * summary uses the generated label instead of mirroring body copy.
 *
 * @param items - Raw item array from Puck props.
 * @returns Items with fallback labels where missing.
 */
export function ensureListItemLabels<T extends ListItemRecord>(
  items: T[] | undefined,
): T[] {
  if (!Array.isArray(items)) return [];

  return items.map((item, index) => {
    const trimmed = typeof item.label === "string" ? item.label.trim() : "";
    return {
      ...item,
      label: trimmed || formatListItemLabel(index),
    };
  });
}
