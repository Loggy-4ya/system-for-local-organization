/**
 * @fileoverview Persists strip-editor active indices across Puck canvas remounts.
 *
 * Puck re-mounts block render trees when sidebar fields change; module-level
 * storage keeps the user's selected tab/slide without resetting to defaults.
 *
 * @module src/components/puck/lib/stripEditorState
 */

/** Active strip index keyed by Puck component id. */
const activeIndexByComponentId = new Map<string, number>();

/**
 * Read the stored active index for a strip editor block.
 *
 * @param componentId - Puck component id from render props.
 * @param fallback - Default when no stored value exists.
 * @returns Active strip index.
 */
export function getStripActiveIndex(componentId: string, fallback: number): number {
  return activeIndexByComponentId.get(componentId) ?? fallback;
}

/**
 * Persist the active strip index for a strip editor block.
 *
 * @param componentId - Puck component id from render props.
 * @param index - Selected tab or slide index.
 */
export function setStripActiveIndex(componentId: string, index: number): void {
  activeIndexByComponentId.set(componentId, index);
}
