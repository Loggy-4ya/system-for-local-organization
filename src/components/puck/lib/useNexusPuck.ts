/**
 * @fileoverview Typed selective Puck store subscriptions for Nexus editor components.
 *
 * Prefer {@link useNexusPuck} with a selector over bare `usePuck()` to avoid
 * re-rendering on every document mutation.
 *
 * @module src/components/puck/lib/useNexusPuck
 */

import { createUsePuck } from "@measured/puck";

/** Typed Puck selector hook for Nexus blocks and chrome. */
export const useNexusPuck = createUsePuck();

/**
 * Subscribe to canvas preview mode only (`edit` | `interactive`).
 *
 * @returns Current Puck preview mode.
 */
export function usePuckPreviewMode(): "edit" | "interactive" {
  return useNexusPuck((state) => state.appState.ui.previewMode ?? "edit");
}
