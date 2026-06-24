/**
 * @fileoverview Default Puck editor settings constants (client-safe).
 *
 * @module shared/constants/editorSettings
 */

/**
 * Component types that default to island mode when inserted on the root canvas.
 * Persisted in the `puck-editor` singleton (`POST /api/editor-settings`).
 */
export const DEFAULT_ISLAND_COMPONENTS: string[] = [
  "NexusSection",
  "NexusHeading",
  "NexusText",
  "NexusList",
  "NexusSpacer",
  "NexusQuote",
  "NexusInput",
];

/** Fixed document key for the singleton editor settings record. */
export const EDITOR_SETTINGS_ID = "puck-editor";

/**
 * Minimum idle time after the last Puck edit before background draft autosave may POST.
 * Prevents hammering the API while typing or dragging blocks.
 */
export const PUCK_DRAFT_AUTOSAVE_QUIET_MS = 2_500;

/**
 * Interval between background draft autosave evaluations while the editor is open.
 * Actual saves still require {@link PUCK_DRAFT_AUTOSAVE_QUIET_MS} of idle time and a dirty document.
 */
export const PUCK_DRAFT_AUTOSAVE_INTERVAL_MS = 12_000;

/**
 * TTL for caching `GET /api/pages/paths` during background autosave only.
 * Manual **Save draft** always fetches a fresh reserved-path list.
 */
export const PUCK_RESERVED_PATHS_CACHE_MS = 60_000;
