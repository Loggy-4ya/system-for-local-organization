/**
 * @fileoverview Keep the mobile preview iframe + grid filled while the plugin panel height eases.
 *
 * @module src/components/puck/lib/mobilePanelPreviewSync
 */

import { PUCK_CANVAS_INNER_SELECTOR } from "@/components/puck/lib/puckCanvasSelectors";

/** Puck preview root inside the canvas — receives zoom `height` / `transform`. */
const PUCK_CANVAS_ROOT_ID = "puck-canvas-root";

/** Puck preview iframe id. */
const PREVIEW_FRAME_ID = "preview-frame";

/** Inline overrides applied during panel height sync — cleared on settle. */
const PREVIEW_HEIGHT_OVERRIDE_PROPS = ["height", "min-height"] as const;

/** Set on `.PuckCanvas-inner` when {@link syncMobilePreviewViewportToShell} owns height. */
const INNER_HEIGHT_OVERRIDE_ATTR = "data-nexus-mobile-inner-height-override";

/** Set on `#puck-canvas-root` when {@link syncMobilePreviewViewportToShell} owns height. */
const ROOT_HEIGHT_OVERRIDE_ATTR = "data-nexus-mobile-root-height-override";

/** Set on `#preview-frame` when {@link syncMobilePreviewViewportToShell} owns height. */
const IFRAME_HEIGHT_OVERRIDE_ATTR = "data-nexus-mobile-iframe-height-override";

/**
 * Resolve the editor canvas shell that grows/shrinks with the plugin panel row.
 *
 * @returns Full-screen canvas element or null.
 */
function resolveMobileCanvasShell(): HTMLElement | null {
  if (typeof document === "undefined") return null;
  return document.querySelector('.Puck [class*="PuckCanvas--fullScreen"]') as HTMLElement | null;
}

/**
 * Stretch preview chrome (inner, root, iframe) to the live editor shell height.
 *
 * Used sparingly — the shell scrollport grid fills via CSS `inset: 0` during panel
 * animations; per-frame height sync causes expensive canvas resize work.
 *
 * @returns Applied shell height in px, or undefined when unavailable.
 */
export function syncMobilePreviewViewportToShell(): number | undefined {
  if (typeof document === "undefined") return undefined;

  const shell = resolveMobileCanvasShell();
  const shellHeight = shell?.clientHeight ?? 0;
  if (shellHeight <= 0) return undefined;

  const heightPx = `${Math.ceil(shellHeight)}px`;

  const inner = document.querySelector(PUCK_CANVAS_INNER_SELECTOR) as HTMLElement | null;
  if (inner) {
    inner.setAttribute(INNER_HEIGHT_OVERRIDE_ATTR, "");
    inner.style.setProperty("height", heightPx, "important");
  }

  const root = document.getElementById(PUCK_CANVAS_ROOT_ID);
  if (root) {
    root.setAttribute(ROOT_HEIGHT_OVERRIDE_ATTR, "");
    root.style.setProperty("min-height", heightPx, "important");
    root.style.setProperty("height", heightPx, "important");
  }

  const iframe = document.getElementById(PREVIEW_FRAME_ID) as HTMLIFrameElement | null;
  if (iframe) {
    iframe.setAttribute(IFRAME_HEIGHT_OVERRIDE_ATTR, "");
    iframe.style.setProperty("height", "100%", "important");
    iframe.style.setProperty("min-height", heightPx, "important");
  }

  const previewDoc = iframe?.contentDocument;
  if (previewDoc) {
    previewDoc.documentElement.style.setProperty("height", "100%");
    previewDoc.documentElement.style.setProperty("min-height", heightPx);
    previewDoc.body.style.setProperty("min-height", heightPx);
    previewDoc.body.style.setProperty("height", "100%");
  }

  return shellHeight;
}

/**
 * Remove preview height overrides after panel layout settles.
 */
export function clearMobilePreviewViewportOverrides(): void {
  if (typeof document === "undefined") return;

  const inner = document.querySelector(PUCK_CANVAS_INNER_SELECTOR) as HTMLElement | null;
  if (inner?.hasAttribute(INNER_HEIGHT_OVERRIDE_ATTR)) {
    inner.removeAttribute(INNER_HEIGHT_OVERRIDE_ATTR);
    for (const prop of PREVIEW_HEIGHT_OVERRIDE_PROPS) {
      inner.style.removeProperty(prop);
    }
  }

  const root = document.getElementById(PUCK_CANVAS_ROOT_ID);
  if (root?.hasAttribute(ROOT_HEIGHT_OVERRIDE_ATTR)) {
    root.removeAttribute(ROOT_HEIGHT_OVERRIDE_ATTR);
    for (const prop of PREVIEW_HEIGHT_OVERRIDE_PROPS) {
      root.style.removeProperty(prop);
    }
  }

  const iframe = document.getElementById(PREVIEW_FRAME_ID) as HTMLIFrameElement | null;
  if (iframe?.hasAttribute(IFRAME_HEIGHT_OVERRIDE_ATTR)) {
    iframe.removeAttribute(IFRAME_HEIGHT_OVERRIDE_ATTR);
    for (const prop of PREVIEW_HEIGHT_OVERRIDE_PROPS) {
      iframe.style.removeProperty(prop);
    }
  }

  const previewDoc = iframe?.contentDocument;
  if (previewDoc) {
    for (const prop of PREVIEW_HEIGHT_OVERRIDE_PROPS) {
      previewDoc.documentElement.style.removeProperty(prop);
      previewDoc.body.style.removeProperty(prop);
    }
    previewDoc.documentElement.style.removeProperty("height");
    previewDoc.body.style.removeProperty("height");
  }
}

/**
 * Whether the parent Puck editor is easing or settling mobile panel height.
 *
 * Used inside the preview iframe (InfiniteGrid) to repaint every frame instead of debouncing.
 *
 * @param parentDocument - Parent document hosting the Puck shell.
 * @returns True during panel open, close, or post-close settle.
 */
export function isParentMobilePreviewHeightSyncActive(
  parentDocument: Document | null | undefined,
): boolean {
  if (!parentDocument) return false;

  const root = parentDocument.documentElement;
  return (
    root.hasAttribute("data-nexus-panel-opening") ||
    root.hasAttribute("data-nexus-panel-closing") ||
    root.hasAttribute("data-nexus-panel-close-settling")
  );
}
