"use client";

/**
 * @fileoverview Mirrors compact / narrow Puck editor viewport flags on `<html>`.
 *
 * - {@link NEXUS_COMPACT_EDITOR_ATTR} — compact chrome (bottom rail, ≤900px width).
 * - {@link NEXUS_NARROW_EDITOR_ATTR} — same width band; layout-fix hooks on {@code <html>}.
 *
 * @module src/components/puck/NexusCompactEditorAttr
 */

import { useEffect } from "react";
import {
  matchesCompactEditorViewport,
  usePuckMobileEditorChrome,
} from "@/components/puck/usePuckMobileEditorChrome";

/** `<html>` attribute set while compact editor chrome is active. */
export const NEXUS_COMPACT_EDITOR_ATTR = "data-nexus-compact-editor";

/** `<html>` attribute set while the editor viewport is narrow (≤900px). */
export const NEXUS_NARROW_EDITOR_ATTR = "data-nexus-narrow-editor";

/**
 * Whether the viewport should use narrow editor layout fixes.
 *
 * @returns True when {@link matchesCompactEditorViewport} matches.
 */
export function matchesNarrowEditorViewport(): boolean {
  return matchesCompactEditorViewport();
}

/**
 * Silent Puck child — toggles compact/narrow editor attributes on the document root.
 *
 * @returns null
 */
export function NexusCompactEditorAttr() {
  const isCompactEditor = usePuckMobileEditorChrome();

  useEffect(() => {
    document.documentElement.toggleAttribute(NEXUS_COMPACT_EDITOR_ATTR, isCompactEditor);
    document.documentElement.toggleAttribute(NEXUS_NARROW_EDITOR_ATTR, isCompactEditor);

    return () => {
      document.documentElement.removeAttribute(NEXUS_COMPACT_EDITOR_ATTR);
      document.documentElement.removeAttribute(NEXUS_NARROW_EDITOR_ATTR);
    };
  }, [isCompactEditor]);

  return null;
}

export default NexusCompactEditorAttr;
