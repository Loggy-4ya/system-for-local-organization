/**
 * @fileoverview Default Puck editor settings constants (client-safe).
 *
 * @module shared/constants/editorSettings
 */

/**
 * Component types that default to island mode when inserted on the root canvas.
 * Admins can override this list via the Page Manager Editor Defaults tab.
 */
export const DEFAULT_ISLAND_COMPONENTS: string[] = [
  "NexusHeading",
  "NexusText",
  "NexusList",
  "NexusButton",
  "NexusDivider",
  "NexusQuote",
  "NexusInput",
  "NexusAvatar",
  "NexusStatCard",
];

/** Fixed document key for the singleton editor settings record. */
export const EDITOR_SETTINGS_ID = "puck-editor";
