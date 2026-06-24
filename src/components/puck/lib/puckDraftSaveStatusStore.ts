/**
 * @fileoverview External store for Puck draft save status (manual + background autosave).
 *
 * @module src/components/puck/lib/puckDraftSaveStatusStore
 */

import type { PuckDraftSaveStatus } from "@shared/lib/puckDraftAutosaveLogic";

let status: PuckDraftSaveStatus = "saved";
const listeners = new Set<() => void>();

/**
 * Read the current draft save status snapshot.
 *
 * @returns Latest status value.
 */
export function getPuckDraftSaveStatus(): PuckDraftSaveStatus {
  return status;
}

/**
 * Publish a new draft save status to header subscribers.
 *
 * @param next - Next status value.
 */
export function setPuckDraftSaveStatus(next: PuckDraftSaveStatus): void {
  if (status === next) return;
  status = next;
  listeners.forEach((listener) => listener());
}

/**
 * Subscribe to draft save status updates (for `useSyncExternalStore`).
 *
 * @param listener - React external-store listener.
 * @returns Unsubscribe function.
 */
export function subscribePuckDraftSaveStatus(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Reset status when leaving the editor route.
 */
export function resetPuckDraftSaveStatus(): void {
  setPuckDraftSaveStatus("saved");
}
