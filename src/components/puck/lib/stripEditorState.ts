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

/** Listeners notified when a strip editor's active index changes. */
const activeIndexListeners = new Map<string, Set<(index: number) => void>>();

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
  activeIndexListeners.get(componentId)?.forEach((listener) => listener(index));
}

/**
 * Subscribe to strip active index changes for a Puck block.
 *
 * @param componentId - Puck component id from render props.
 * @param listener - Called immediately with the stored index, then on each update.
 * @returns Unsubscribe function.
 */
export function subscribeStripActiveIndex(
  componentId: string,
  listener: (index: number) => void,
): () => void {
  if (!activeIndexListeners.has(componentId)) {
    activeIndexListeners.set(componentId, new Set());
  }

  const listeners = activeIndexListeners.get(componentId)!;
  listeners.add(listener);

  const current = activeIndexByComponentId.get(componentId);
  if (current !== undefined) {
    listener(current);
  }

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      activeIndexListeners.delete(componentId);
    }
  };
}
