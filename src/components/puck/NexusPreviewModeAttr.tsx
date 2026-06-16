"use client";

/**
 * @fileoverview Mirrors Puck `previewMode` on `<html>` for editor chrome CSS hooks.
 *
 * @module src/components/puck/NexusPreviewModeAttr
 */

import { useEffect } from "react";
import { useNexusPuck } from "@/components/puck/lib/useNexusPuck";

/** `<html>` attribute carrying the active Puck preview mode. */
export const NEXUS_PUCK_PREVIEW_MODE_ATTR = "data-nexus-puck-preview-mode";

/**
 * Sync Puck preview mode to the document root for layout overrides.
 *
 * @returns null
 */
export function NexusPreviewModeAttr() {
  const previewMode = useNexusPuck((state) => state.appState.ui.previewMode ?? "edit");

  useEffect(() => {
    if (typeof document === "undefined") return;

    document.documentElement.setAttribute(NEXUS_PUCK_PREVIEW_MODE_ATTR, previewMode);

    return () => {
      document.documentElement.removeAttribute(NEXUS_PUCK_PREVIEW_MODE_ATTR);
    };
  }, [previewMode]);

  return null;
}

export default NexusPreviewModeAttr;
