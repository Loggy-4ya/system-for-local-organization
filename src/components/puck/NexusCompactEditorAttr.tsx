"use client";

/**
 * @fileoverview Mirrors compact / narrow Puck editor viewport flags on `<html>`.
 *
 * - {@link NEXUS_COMPACT_EDITOR_ATTR} — touch-primary compact chrome (bottom rail).
 * - {@link NEXUS_NARROW_EDITOR_ATTR} — width ≤900px layout fixes (DevTools, landscape).
 *
 * @module src/components/puck/NexusCompactEditorAttr
 */

import { useEffect } from "react";
import {
  PUCK_COMPACT_EDITOR_MQ,
  PUCK_COMPACT_EDITOR_MAX_WIDTH,
  usePuckMobileEditorChrome,
} from "@/components/puck/usePuckMobileEditorChrome";

/** `<html>` attribute set while compact editor chrome is active. */
export const NEXUS_COMPACT_EDITOR_ATTR = "data-nexus-compact-editor";

/** `<html>` attribute set while the editor viewport is narrow (≤900px). */
export const NEXUS_NARROW_EDITOR_ATTR = "data-nexus-narrow-editor";

/**
 * Whether the viewport should use narrow editor layout fixes.
 *
 * @returns True when `window.innerWidth` is at most {@link PUCK_COMPACT_EDITOR_MAX_WIDTH}.
 */
export function matchesNarrowEditorViewport(): boolean {
  if (typeof window === "undefined") return false;
  return window.innerWidth <= PUCK_COMPACT_EDITOR_MAX_WIDTH;
}

/**
 * Silent Puck child — toggles compact/narrow editor attributes on the document root.
 *
 * @returns null
 */
export function NexusCompactEditorAttr() {
  const isCompactEditor = usePuckMobileEditorChrome();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const syncAttrs = () => {
      document.documentElement.toggleAttribute(NEXUS_COMPACT_EDITOR_ATTR, isCompactEditor);
      document.documentElement.toggleAttribute(
        NEXUS_NARROW_EDITOR_ATTR,
        window.innerWidth <= PUCK_COMPACT_EDITOR_MAX_WIDTH,
      );
    };

    syncAttrs();

    const compactMedia = window.matchMedia(PUCK_COMPACT_EDITOR_MQ);
    compactMedia.addEventListener("change", syncAttrs);
    window.addEventListener("resize", syncAttrs);

    return () => {
      compactMedia.removeEventListener("change", syncAttrs);
      window.removeEventListener("resize", syncAttrs);
      document.documentElement.removeAttribute(NEXUS_COMPACT_EDITOR_ATTR);
      document.documentElement.removeAttribute(NEXUS_NARROW_EDITOR_ATTR);
    };
  }, [isCompactEditor]);

  return null;
}

export default NexusCompactEditorAttr;
