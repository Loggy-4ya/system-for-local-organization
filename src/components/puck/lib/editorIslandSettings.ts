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
  editorIslandSettingsRef.islandDefaultComponents =
    list.length > 0 ? list : [...DEFAULT_ISLAND_COMPONENTS];
}

/**
 * Admin island list with fallback when the API returns an empty array.
 *
 * @returns Non-empty component type keys for island-on-insert rules.
 */
export function resolveEffectiveIslandComponents(): string[] {
  return editorIslandSettingsRef.islandDefaultComponents.length > 0
    ? editorIslandSettingsRef.islandDefaultComponents
    : [...DEFAULT_ISLAND_COMPONENTS];
}
