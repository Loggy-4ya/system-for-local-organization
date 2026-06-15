"use client";

/**
 * @fileoverview Detect Puck editor compact layout (bottom rail + full-screen canvas).
 *
 * @module src/components/puck/usePuckMobileEditorChrome
 */

import { useEffect, useState } from "react";

/**
 * Viewport width at which Nexus switches to compact editor chrome
 * (bottom plugin rail, full-screen canvas, viewport FAB).
 */
export const PUCK_COMPACT_EDITOR_MAX_WIDTH = 900;

/**
 * Upper bound of the tight-desktop band (901–960px) with minimal sidebars for canvas space.
 */
export const PUCK_TIGHT_DESKTOP_MAX_WIDTH = 960;

/**
 * Upper bound of the narrow-desktop band where sidebars shrink and the canvas is clamped.
 */
export const PUCK_NARROW_DESKTOP_MAX_WIDTH = 1023;

/**
 * @deprecated Use {@link PUCK_COMPACT_EDITOR_MAX_WIDTH}.
 */
export const PUCK_MOBILE_EDITOR_MAX_WIDTH = PUCK_COMPACT_EDITOR_MAX_WIDTH;

/**
 * Whether the editor shell should use compact chrome (bottom rail, full-screen canvas).
 *
 * @returns True when viewport width is at most {@link PUCK_COMPACT_EDITOR_MAX_WIDTH}.
 */
export function usePuckMobileEditorChrome(): boolean {
  const [isCompact, setIsCompact] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(`(max-width: ${PUCK_COMPACT_EDITOR_MAX_WIDTH}px)`).matches;
  });

  useEffect(() => {
    const media = window.matchMedia(`(max-width: ${PUCK_COMPACT_EDITOR_MAX_WIDTH}px)`);

    const update = () => setIsCompact(media.matches);
    update();
    media.addEventListener("change", update);

    return () => media.removeEventListener("change", update);
  }, []);

  return isCompact;
}

/**
 * Whether header toolbar chips should drop text labels (icon-only).
 *
 * Matches the narrow-desktop + compact breakpoints used in `puck-editor.css`.
 *
 * @returns True when viewport width is at most {@link PUCK_NARROW_DESKTOP_MAX_WIDTH}.
 */
export function useIconOnlyEditorHeader(): boolean {
  const [iconOnly, setIconOnly] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(`(max-width: ${PUCK_NARROW_DESKTOP_MAX_WIDTH}px)`).matches;
  });

  useEffect(() => {
    const media = window.matchMedia(`(max-width: ${PUCK_NARROW_DESKTOP_MAX_WIDTH}px)`);

    const update = () => setIconOnly(media.matches);
    update();
    media.addEventListener("change", update);

    return () => media.removeEventListener("change", update);
  }, []);

  return iconOnly;
}

export default usePuckMobileEditorChrome;
