/**
 * @fileoverview Select a Puck canvas component by its block id.
 *
 * @module src/components/puck/lib/selectPuckComponentById
 */

/** Minimal Puck store surface used for programmatic selection. */
export interface PuckSelectionStore {
  /** Resolve zone/index selector for a block id. */
  getSelectorForId: (id: string) => { zone: string; index: number } | null | undefined;
  /** Puck UI dispatcher. */
  dispatch: (action: {
    type: "setUi";
    ui: { itemSelector: { zone: string; index: number } | null };
  }) => void;
}

/**
 * Select a block on the Puck canvas so its sidebar fields open.
 *
 * @param store - Puck store from `useGetPuck()`.
 * @param componentId - Target block id (`props.id`).
 * @returns Whether a selector was found and dispatched.
 */
export function selectPuckComponentById(
  store: PuckSelectionStore,
  componentId: string | undefined,
): boolean {
  if (!componentId) return false;

  const selector = store.getSelectorForId(componentId);
  if (!selector) return false;

  store.dispatch({
    type: "setUi",
    ui: { itemSelector: selector },
  });

  return true;
}
