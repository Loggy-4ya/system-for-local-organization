/**
 * @fileoverview Puck canvas preview mode helpers (`edit` vs `interactive`).
 *
 * @module src/components/puck/lib/puckPreviewMode
 */

import type { PuckInternalAppStore } from "@/components/puck/lib/sanitizePuckZoomConfig";

/** `<html>` attribute mirrored from Puck `ui.previewMode` by {@link NexusPreviewModeAttr}. */
export const NEXUS_PUCK_PREVIEW_MODE_ATTR = "data-nexus-puck-preview-mode";

/** Active Puck canvas preview mode. */
export type PuckPreviewMode = "edit" | "interactive";

/**
 * Read preview mode from the editor document root attribute.
 *
 * @param doc - Document to inspect; defaults to the current document.
 * @returns `"interactive"` when the attribute is set; otherwise `"edit"`.
 */
export function resolvePuckPreviewModeFromDocument(
  doc?: Document | null,
): PuckPreviewMode {
  const target =
    doc ?? (typeof document !== "undefined" ? document : undefined);

  if (!target?.documentElement?.getAttribute) {
    return "edit";
  }

  return target.documentElement.getAttribute(NEXUS_PUCK_PREVIEW_MODE_ATTR) === "interactive"
    ? "interactive"
    : "edit";
}

/**
 * Read preview mode from Puck's internal app store.
 *
 * @param appStore - Puck internal app store from {@link resolvePuckAppStore}.
 * @returns Active preview mode, defaulting to `"edit"`.
 */
export function resolvePuckPreviewModeFromAppStore(
  appStore: PuckInternalAppStore,
): PuckPreviewMode {
  const state = appStore.getState() as {
    state?: { ui?: { previewMode?: string } };
  };

  return state.state?.ui?.previewMode === "interactive" ? "interactive" : "edit";
}

/**
 * Whether the editor canvas is in interactive preview (non-edit) mode.
 *
 * @param doc - Document to inspect; defaults to the current document.
 * @returns True when preview mode is interactive.
 */
export function isPuckInteractivePreviewMode(doc?: Document | null): boolean {
  return resolvePuckPreviewModeFromDocument(doc) === "interactive";
}
