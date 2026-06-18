/**
 * @fileoverview Desktop letterbox scrollport — expand inner height and chain wheel to shell.
 *
 * When a fixed device preset is scaled up inside a wide canvas, the transformed preview
 * can extend beyond the shell viewport. The shell owns vertical scroll; the iframe cannot
 * reach clipped transform overflow on its own.
 *
 * Tests: `tests/puck/lib/canvasLetterboxScrollport.test.ts` — `npm run test:canvas-letterbox-scrollport`
 *
 * @module src/components/puck/lib/canvasLetterboxScrollport
 */

import { matchesDesktopEditorLayout } from "@/components/puck/lib/desktopEditorScrollport";
import {
  PUCK_CANVAS_INNER_SELECTOR,
  PUCK_CANVAS_SHELL_SELECTOR,
} from "@/components/puck/lib/puckCanvasSelectors";
import {
  resolvePuckScaledRootHeightPx,
  type PuckZoomConfig,
} from "@/components/puck/lib/sanitizePuckZoomConfig";

/** Puck preview root id — receives zoom transform. */
const PUCK_CANVAS_ROOT_ID = "puck-canvas-root";

/**
 * Resolve the desktop canvas shell scroll container.
 *
 * @returns Canvas shell element or null when unavailable.
 */
export function resolveCanvasShellScroller(): HTMLElement | null {
  if (typeof document === "undefined") return null;
  return document.querySelector(PUCK_CANVAS_SHELL_SELECTOR) as HTMLElement | null;
}

/**
 * Whether the desktop canvas shell currently has vertical overflow to scroll.
 *
 * @returns True when shell `scrollHeight` exceeds `clientHeight`.
 */
export function canvasShellNeedsVerticalScroll(): boolean {
  const shell = resolveCanvasShellScroller();
  if (!shell) return false;
  return shell.scrollHeight > shell.clientHeight + 1;
}

/**
 * Expand `.PuckCanvas-inner` when a letterboxed, scaled preview exceeds the shell viewport.
 *
 * @param config - Optional sanitized zoom config for height fallback math.
 */
export function syncDesktopLetterboxCanvasScrollport(config?: PuckZoomConfig): void {
  if (typeof document === "undefined" || !matchesDesktopEditorLayout()) {
    return;
  }

  const inner = document.querySelector(PUCK_CANVAS_INNER_SELECTOR) as HTMLElement | null;
  const root = document.getElementById(PUCK_CANVAS_ROOT_ID);
  if (!inner || !root) {
    return;
  }

  const measured = root.getBoundingClientRect().height;
  const fallback = config !== undefined ? resolvePuckScaledRootHeightPx(config) : null;
  const visualHeight = measured > 0 && Number.isFinite(measured) ? measured : fallback;

  if (visualHeight === null || visualHeight <= 0) {
    inner.style.removeProperty("height");
    inner.style.removeProperty("min-height");
    return;
  }

  const shell = resolveCanvasShellScroller();
  const shellViewportHeight = shell?.clientHeight ?? 0;
  const needsExpandedScrollport =
    shellViewportHeight > 0 && visualHeight > shellViewportHeight + 1;

  if (needsExpandedScrollport) {
    const heightPx = `${Math.ceil(visualHeight)}px`;
    inner.style.setProperty("height", heightPx, "important");
    inner.style.setProperty("min-height", heightPx, "important");
    return;
  }

  inner.style.removeProperty("height");
  inner.style.removeProperty("min-height");
}

/**
 * Chain wheel delta through the preview iframe, then the canvas shell when needed.
 *
 * @param iframeWindow - Preview iframe `contentWindow`.
 * @param iframeDocument - Preview iframe document.
 * @param deltaY - Vertical wheel delta.
 * @param deltaX - Horizontal wheel delta.
 * @returns True when the shell participated in scrolling.
 */
export function chainWheelDeltaToCanvasShell(
  iframeWindow: Window,
  iframeDocument: Document,
  deltaY: number,
  deltaX: number,
): boolean {
  const shell = resolveCanvasShellScroller();
  if (!shell || shell.scrollHeight <= shell.clientHeight + 1) {
    return false;
  }

  let remainingY = deltaY;
  const scrollY = iframeWindow.scrollY;
  const maxScrollY = Math.max(
    0,
    iframeDocument.documentElement.scrollHeight - iframeWindow.innerHeight,
  );

  if (remainingY > 0) {
    const iframeRoom = maxScrollY - scrollY;
    if (iframeRoom > 0) {
      const step = Math.min(remainingY, iframeRoom);
      iframeWindow.scrollBy({ top: step, behavior: "auto" });
      remainingY -= step;
    }
  } else if (remainingY < 0) {
    const iframeRoom = scrollY;
    if (iframeRoom > 0) {
      const step = Math.max(remainingY, -iframeRoom);
      iframeWindow.scrollBy({ top: step, behavior: "auto" });
      remainingY -= step;
    }
  }

  if (remainingY !== 0) {
    shell.scrollBy({ top: remainingY, left: deltaX, behavior: "auto" });
  } else if (deltaX !== 0) {
    shell.scrollBy({ left: deltaX, behavior: "auto" });
  }

  return true;
}
