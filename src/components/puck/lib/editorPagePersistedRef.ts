/**
 * @fileoverview Whether the open Puck editor route maps to a MongoDB Page document.
 *
 * New pages opened from Page Manager have no document until the first publish.
 * Page Settings uses this store to show or hide the delete control.
 *
 * @module src/components/puck/lib/editorPagePersistedRef
 */

let isPersisted = false;
const listeners = new Set<() => void>();

/**
 * Notify `useSyncExternalStore` subscribers of a persisted-state change.
 */
function notifyListeners(): void {
  listeners.forEach((listener) => listener());
}

/**
 * Read whether the current editor page exists in MongoDB.
 *
 * @returns True when a Page document was loaded for this route.
 */
export function getEditorPagePersisted(): boolean {
  return isPersisted;
}

/**
 * Subscribe to persisted-state changes for `useSyncExternalStore`.
 *
 * @param onStoreChange - Invalidation callback.
 * @returns Unsubscribe function.
 */
export function subscribeEditorPagePersisted(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}

/**
 * Update whether the current editor route maps to a persisted Page document.
 *
 * @param next - True when MongoDB returned a Page document for this path.
 */
export function setEditorPagePersisted(next: boolean): void {
  if (isPersisted === next) return;
  isPersisted = next;
  notifyListeners();
}

/** @deprecated Use {@link getEditorPagePersisted} — kept for legacy ref reads. */
export const editorPagePersistedRef = {
  get isPersisted() {
    return isPersisted;
  },
};
