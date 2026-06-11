/**
 * @fileoverview Mutable ref for admin-configured island-on-insert component types.
 *
 * Shared between the Puck editor client, Page Manager defaults panel, and
 * `withBlockShell` resolveData hooks.
 *
 * @module src/components/puck/lib/editorIslandSettings
 */

import { DEFAULT_ISLAND_COMPONENTS } from "@shared/constants/editorSettings";

/** Live island default component list (updated from `/api/editor-settings`). */
export const editorIslandSettingsRef = {
  islandDefaultComponents: [...DEFAULT_ISLAND_COMPONENTS] as string[],
};

/**
 * Replace the in-memory island default component list.
 *
 * @param list - Puck component registry keys that auto-enable island on insert.
 */
export function setEditorIslandDefaultComponents(list: string[]): void {
  editorIslandSettingsRef.islandDefaultComponents = list;
}
