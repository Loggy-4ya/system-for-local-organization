/**
 * @fileoverview Helpers for Puck sidebar array field UI state (`ui.arrayState`).
 *
 * @module src/components/puck/lib/puckArrayFieldState
 */

/** Minimal Puck array item metadata stored in `ui.arrayState`. */
export interface PuckArrayStateItem {
  _arrayId?: string;
  _originalIndex?: number;
}

/** Puck array field open/expand state. */
export interface PuckArrayFieldState {
  items: PuckArrayStateItem[];
  openId: string;
}

/**
 * Build the Puck array field id used in `ui.arrayState` keys.
 *
 * @param componentId - Selected Puck block id.
 * @param fieldName - Array field name (e.g. `slides`, `tabs`).
 * @returns Array state key.
 */
export function resolvePuckArrayFieldId(componentId: string, fieldName: string): string {
  return `${componentId}_array_${fieldName}`;
}

/**
 * Resolve the currently expanded array item index from Puck array UI state.
 *
 * @param arrayState - Puck `ui.arrayState` entry for the array field.
 * @returns Zero-based slide/tab index or null when nothing is expanded.
 */
export function resolveArrayOpenIndex(arrayState: PuckArrayFieldState | undefined): number | null {
  const openId = arrayState?.openId;
  if (!openId || !arrayState?.items?.length) return null;

  const index = arrayState.items.findIndex((item) => item._arrayId === openId);
  return index >= 0 ? index : null;
}
