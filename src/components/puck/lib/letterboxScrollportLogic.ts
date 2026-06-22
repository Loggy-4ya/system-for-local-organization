/**
 * @fileoverview Pure letterbox scrollport expand/collapse decisions for Puck canvas height sync.
 *
 * Uses zoom-config math (not clipped DOM rects) so `rootHeight` feedback loops do not
 * oscillate at the shell boundary.
 *
 * Tests: `tests/puck/lib/canvasLetterboxScrollport.test.ts` — `npm run test:canvas-letterbox-scrollport`
 *
 * @module src/components/puck/lib/letterboxScrollportLogic
 */

import {
  resolvePuckScaledRootHeightPx,
  type PuckZoomConfig,
} from "@/components/puck/lib/sanitizePuckZoomConfig";

/** Hysteresis band so expand/collapse does not snap at the shell boundary. */
export const LETTERBOX_SCROLLPORT_HYSTERESIS_PX = 8;

/**
 * Resolve the scaled preview height used for letterbox scrollport sizing.
 *
 * Prefers {@link resolvePuckScaledRootHeightPx} over DOM measurement so clipped roots
 * do not under-report height during sync.
 *
 * @param config - Sanitized Puck zoom config, when available.
 * @param measuredRootHeightPx - Optional `#puck-canvas-root` bounding height fallback.
 * @returns Visual height in px, or null when unavailable.
 */
export function resolveLetterboxVisualHeightPx(
  config?: PuckZoomConfig,
  measuredRootHeightPx?: number | null,
): number | null {
  const fromConfig = config !== undefined ? resolvePuckScaledRootHeightPx(config) : null;
  if (fromConfig !== null && fromConfig > 0) {
    return fromConfig;
  }

  if (
    measuredRootHeightPx !== null &&
    measuredRootHeightPx !== undefined &&
    measuredRootHeightPx > 0 &&
    Number.isFinite(measuredRootHeightPx)
  ) {
    return Math.ceil(measuredRootHeightPx);
  }

  return null;
}

/**
 * Whether the canvas inner scrollport should expand beyond the shell viewport.
 *
 * @param visualHeightPx - Scaled preview height in px.
 * @param shellViewportHeightPx - Canvas shell client height in px.
 * @param currentlyExpanded - Whether the inner scrollport is already expanded.
 * @returns True when inner height should track the scaled preview.
 */
export function shouldExpandLetterboxScrollport(
  visualHeightPx: number,
  shellViewportHeightPx: number,
  currentlyExpanded: boolean,
): boolean {
  if (shellViewportHeightPx <= 0 || visualHeightPx <= 0) {
    return false;
  }

  const threshold = currentlyExpanded
    ? shellViewportHeightPx - LETTERBOX_SCROLLPORT_HYSTERESIS_PX
    : shellViewportHeightPx + LETTERBOX_SCROLLPORT_HYSTERESIS_PX;

  return visualHeightPx > threshold;
}

/**
 * Count document elements that currently expose a vertical overflow scrollport.
 *
 * Used by Playwright specs to guard against duplicate editor scrollbars.
 *
 * @param root - Subtree root (typically `document`).
 * @returns Number of elements with vertical overflow scroll capability.
 */
export function countVerticalOverflowScrollports(root: ParentNode): number {
  if (typeof Element === "undefined" || !(root instanceof ParentNode)) {
    return 0;
  }

  const elements =
    root instanceof Document
      ? Array.from(root.querySelectorAll("html, body, .Puck, .Puck *"))
      : Array.from((root as Element).querySelectorAll("*"));

  let count = 0;

  for (const element of elements) {
    if (!(element instanceof HTMLElement)) continue;

    const style = element.style;
    const computed =
      typeof window !== "undefined" && typeof window.getComputedStyle === "function"
        ? window.getComputedStyle(element)
        : null;
    const overflowY = computed?.overflowY ?? style.overflowY;
    if (overflowY !== "auto" && overflowY !== "scroll") continue;
    if (element.scrollHeight <= element.clientHeight + 1) continue;
    count += 1;
  }

  return count;
}
