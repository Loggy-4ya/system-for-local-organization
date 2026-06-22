/**
 * @fileoverview Automatic grid cell labels derived from array index.
 *
 * @module src/components/puck/lib/gridItemLabels
 */

/** Minimal grid cell record stored on {@link NexusGrid} props. */
export interface GridItemRecord {
  label?: string;
  spanCol?: string;
  spanRow?: string;
  content?: unknown[];
  [key: string]: unknown;
}

import { formatGridItemLabel } from "./arrayItemLabels";

export { formatGridItemLabel } from "./arrayItemLabels";

/**
 * Assign `Cell N` only when a cell has no label yet (preserves user renames).
 *
 * @param items - Raw items array from Puck props.
 * @returns Items with fallback labels where missing.
 */
export function ensureGridItemLabels<T extends GridItemRecord>(items: T[] | undefined): T[] {
  if (!Array.isArray(items)) return [];

  return items.map((item, index) => {
    const trimmed = typeof item.label === "string" ? item.label.trim() : "";
    return {
      ...item,
      label: trimmed || formatGridItemLabel(index),
    };
  });
}
