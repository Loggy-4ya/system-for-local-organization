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

import {
  PUCK_CANVAS_INNER_SELECTOR,
  PUCK_CANVAS_SHELL_SELECTOR,
  PUCK_MOBILE_CANVAS_SHELL_SELECTOR,
} from "@/components/puck/lib/puckCanvasSelectors";
import {
  resolveLetterboxVisualHeightPx,
  shouldExpandLetterboxScrollport,
} from "@/components/puck/lib/letterboxScrollportLogic";
import {
  isPuckInteractivePreviewMode,
  resolvePuckPreviewModeFromAppStore,
} from "@/components/puck/lib/puckPreviewMode";
import { resolvePuckAppStore, type PuckZoomConfig } from "@/components/puck/lib/sanitizePuckZoomConfig";

/** Puck preview root id — receives zoom transform. */
const PUCK_CANVAS_ROOT_ID = "puck-canvas-root";

/**
 * Whether letterbox canvas-inner expansion should be skipped (interactive preview).
 *
 * Prefers Puck app store over the html attribute so mode toggles apply in the same frame.
 *
 * @returns True when preview mode is interactive.
 */
function isInteractivePreviewScrollportMode(): boolean {
  const appStore = resolvePuckAppStore();
  if (appStore) {
    return resolvePuckPreviewModeFromAppStore(appStore) === "interactive";
  }

  return isPuckInteractivePreviewMode();
}

/** Whether the inner scrollport is expanded beyond the shell viewport. */
let letterboxScrollportExpanded = false;

/**
 * Reset letterbox expansion state — for tests and guard teardown.
 */
export function resetLetterboxScrollportState(): void {
  letterboxScrollportExpanded = false;
}

/**
 * Resolve the desktop canvas shell scroll container.
 *
 * @returns Canvas shell element or null when unavailable.
 */
export function resolveCanvasShellScroller(): HTMLElement | null {
  if (typeof document === "undefined") return null;
  return (
    (document.querySelector(PUCK_CANVAS_SHELL_SELECTOR) as HTMLElement | null) ??
    (document.querySelector(PUCK_MOBILE_CANVAS_SHELL_SELECTOR) as HTMLElement | null)
  );
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
 * Keep horizontal scroll origin aligned when the scaled preview fits the inner frame.
 *
 * Puck centers `#puck-canvas-root` with flex, but `overflow-x: auto` on the inner host
 * can retain a stale `scrollLeft` after mount — clipping the page start on editor entry.
 *
 * @param inner - `.PuckCanvas-inner` element.
 */
export function syncCanvasInnerHorizontalScrollOrigin(inner: HTMLElement | null | undefined): void {
  if (!inner) {
    return;
  }

  const maxScrollLeft = inner.scrollWidth - inner.clientWidth;
  if (maxScrollLeft <= 1) {
    inner.scrollLeft = 0;
  }
}

/**
 * Expand `.PuckCanvas-inner` when a letterboxed, scaled preview exceeds the shell viewport.
 *
 * @param config - Optional sanitized zoom config for height fallback math.
 */
export function syncDesktopLetterboxCanvasScrollport(config?: PuckZoomConfig): void {
  if (typeof document === "undefined") {
    return;
  }

  const inner = document.querySelector(PUCK_CANVAS_INNER_SELECTOR) as HTMLElement | null;
  if (!inner) {
    return;
  }

  if (isInteractivePreviewScrollportMode()) {
    inner.style.removeProperty("height");
    inner.style.removeProperty("min-height");
    letterboxScrollportExpanded = false;
    syncCanvasInnerHorizontalScrollOrigin(inner);
    return;
  }

  const root = document.getElementById(PUCK_CANVAS_ROOT_ID);
  if (!root) {
    return;
  }

  const measuredRootHeight = root.getBoundingClientRect().height;
  const visualHeight = resolveLetterboxVisualHeightPx(config, measuredRootHeight);

  if (visualHeight === null || visualHeight <= 0) {
    inner.style.removeProperty("height");
    inner.style.removeProperty("min-height");
    letterboxScrollportExpanded = false;
    syncCanvasInnerHorizontalScrollOrigin(inner);
    return;
  }

  const shell = resolveCanvasShellScroller();
  const shellViewportHeight = shell?.clientHeight ?? 0;
  const needsExpandedScrollport = shouldExpandLetterboxScrollport(
    visualHeight,
    shellViewportHeight,
    letterboxScrollportExpanded,
  );

  letterboxScrollportExpanded = needsExpandedScrollport;

  if (needsExpandedScrollport) {
    const heightPx = `${Math.ceil(visualHeight)}px`;
    inner.style.setProperty("height", heightPx, "important");
    inner.style.setProperty("min-height", heightPx, "important");
    syncCanvasInnerHorizontalScrollOrigin(inner);
    return;
  }

  inner.style.removeProperty("height");
  inner.style.removeProperty("min-height");
  syncCanvasInnerHorizontalScrollOrigin(inner);
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
