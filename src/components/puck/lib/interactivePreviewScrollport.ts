/**
 * @fileoverview Interactive preview scrollport — controls inset and scroll reset.
 *
 * Desktop viewport preset controls float over the top of the canvas shell. Interactive
 * preview locks `#preview-frame` to the visible shell height; without a controls inset on
 * `#puck-canvas-root` (absolute) and scroll reset, page content can render under the FAB
 * or retain edit-mode shell scroll offset.
 *
 * Tests: `tests/puck/lib/interactivePreviewScrollport.test.ts` — `npm run test:interactive-preview-scrollport`
 *
 * @module src/components/puck/lib/interactivePreviewScrollport
 */

import {
  PUCK_CANVAS_SHELL_SELECTOR,
  PUCK_MOBILE_CANVAS_SHELL_SELECTOR,
} from "@/components/puck/lib/puckCanvasSelectors";

/** CSS custom property written on `<html>` for interactive canvas top inset. */
export const NEXUS_PUCK_CANVAS_CONTROLS_INSET_VAR = "--nexus-puck-canvas-controls-inset";

/** Fallback top inset when viewport controls are not yet mounted (collapsed desktop FAB). */
export const INTERACTIVE_CANVAS_CONTROLS_INSET_FALLBACK_PX = 52;

/** Desktop editor layout media query — matches `puck-editor.css` ≥901px rules. */
const DESKTOP_EDITOR_MQ = "(min-width: 901px)";

/**
 * Whether the current window uses the desktop Puck editor layout.
 *
 * @returns True when the desktop editor media query matches.
 */
export function matchesDesktopEditorLayoutViewport(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }

  return window.matchMedia(DESKTOP_EDITOR_MQ).matches;
}

/**
 * Measure the desktop viewport-controls strip height inside the canvas shell.
 *
 * @param doc - Editor document.
 * @returns Controls block height in px, or {@link INTERACTIVE_CANVAS_CONTROLS_INSET_FALLBACK_PX}.
 */
export function resolveDesktopCanvasControlsInsetPx(
  doc: Document | null | undefined = typeof document !== "undefined" ? document : null,
): number {
  if (!doc) {
    return INTERACTIVE_CANVAS_CONTROLS_INSET_FALLBACK_PX;
  }

  const controls = doc.querySelector(
    '.Puck [class*="PuckCanvas-controls"]:not([class*="PuckCanvas--fullScreen"])',
  ) as HTMLElement | null;
  const height = controls?.getBoundingClientRect().height ?? 0;

  if (height > 0 && Number.isFinite(height)) {
    return Math.ceil(height);
  }

  return INTERACTIVE_CANVAS_CONTROLS_INSET_FALLBACK_PX;
}

/**
 * Resolve the desktop canvas inner client height used for interactive viewport lock math.
 *
 * Prefers `.PuckCanvas-inner` over the outer shell so height matches the preview host.
 *
 * @param doc - Editor document.
 * @returns Inner client height in px, or null when unavailable.
 */
export function resolveInteractivePreviewInnerContentHeightPx(
  doc: Document | null | undefined = typeof document !== "undefined" ? document : null,
): number | null {
  if (!doc) {
    return null;
  }

  const inner = doc.querySelector(
    '.Puck [class*="PuckCanvas-inner"]',
  ) as HTMLElement | null;
  const height = inner?.clientHeight ?? 0;

  return height > 0 && Number.isFinite(height) ? height : null;
}

/**
 * Resolve the shell viewport height available to the preview iframe in interactive mode.
 *
 * @param shellClientHeightPx - Canvas shell or inner client height in px.
 * @param controlsInsetPx - Top overlay inset reserved for viewport controls.
 * @returns Available viewport height in px, or null when unavailable.
 */
export function resolveInteractivePreviewShellViewportPx(
  shellClientHeightPx: number | null | undefined,
  controlsInsetPx: number = 0,
): number | null {
  if (
    shellClientHeightPx === null ||
    shellClientHeightPx === undefined ||
    shellClientHeightPx <= 0 ||
    !Number.isFinite(shellClientHeightPx)
  ) {
    return null;
  }

  const inset = Math.max(0, Math.ceil(controlsInsetPx));
  return Math.max(0, shellClientHeightPx - inset);
}

/**
 * Sync the interactive controls inset CSS variable on `<html>`.
 *
 * @param previewMode - Active Puck preview mode.
 * @param doc - Editor document.
 */
export function syncInteractiveCanvasControlsInsetVar(
  previewMode: "edit" | "interactive",
  doc: Document | null | undefined = typeof document !== "undefined" ? document : null,
): void {
  if (!doc?.documentElement) {
    return;
  }

  if (previewMode !== "interactive" || !matchesDesktopEditorLayoutViewport()) {
    doc.documentElement.style.removeProperty(NEXUS_PUCK_CANVAS_CONTROLS_INSET_VAR);
    return;
  }

  doc.documentElement.style.setProperty(
    NEXUS_PUCK_CANVAS_CONTROLS_INSET_VAR,
    `${resolveDesktopCanvasControlsInsetPx(doc)}px`,
  );
}

/**
 * Reset shell and iframe scroll offsets when entering interactive preview.
 *
 * Edit mode scroll on the canvas shell must not carry over — it shifts the locked iframe
 * viewport and clips the page top under viewport controls.
 *
 * @param doc - Editor document.
 */
export function resetInteractivePreviewScrollports(
  doc: Document | null | undefined = typeof document !== "undefined" ? document : null,
): void {
  if (!doc) {
    return;
  }

  const shell =
    (doc.querySelector(PUCK_CANVAS_SHELL_SELECTOR) as HTMLElement | null) ??
    (doc.querySelector(PUCK_MOBILE_CANVAS_SHELL_SELECTOR) as HTMLElement | null);

  if (shell) {
    shell.scrollTop = 0;
    shell.scrollLeft = 0;
  }

  const iframe = doc.getElementById("preview-frame") as HTMLIFrameElement | null;
  iframe?.contentWindow?.scrollTo(0, 0);
}

/**
 * Bootstrap editor canvas scrollport state after mount and when the shell gains height.
 *
 * Runs immediately, on the next two animation frames, and when the canvas shell resizes so
 * interactive viewport lock and scroll reset do not race first paint.
 *
 * @param onBootstrap - Callback that syncs inset, scroll, and preview height.
 * @param doc - Editor document.
 * @returns Teardown function.
 */
export function installEditorCanvasScrollportBootstrap(
  onBootstrap: () => void,
  doc: Document | null | undefined = typeof document !== "undefined" ? document : null,
): () => void {
  if (!doc) {
    return () => {};
  }

  const run = () => onBootstrap();
  run();

  let raf2Id = 0;
  const raf1Id = requestAnimationFrame(() => {
    run();
    raf2Id = requestAnimationFrame(run);
  });

  let shellObserver: ResizeObserver | null = null;
  const shell =
    (doc.querySelector(PUCK_CANVAS_SHELL_SELECTOR) as HTMLElement | null) ??
    (doc.querySelector(PUCK_MOBILE_CANVAS_SHELL_SELECTOR) as HTMLElement | null);

  if (shell && typeof ResizeObserver !== "undefined") {
    let lastHeightPx = 0;
    shellObserver = new ResizeObserver(() => {
      const heightPx = shell.clientHeight;
      if (heightPx > 0 && Math.abs(heightPx - lastHeightPx) > 1) {
        lastHeightPx = heightPx;
        run();
      }
    });
    shellObserver.observe(shell);
  }

  return () => {
    cancelAnimationFrame(raf1Id);
    if (raf2Id) {
      cancelAnimationFrame(raf2Id);
    }
    shellObserver?.disconnect();
  };
}
