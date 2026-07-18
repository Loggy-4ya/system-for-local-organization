"use client";

/**
 * @fileoverview Syncs site theme and Nexus design tokens into the Puck preview iframe.
 *
 * Puck 0.20 renders the editable canvas inside an isolated iframe that does not
 * inherit `data-theme` or `globals.css` from the parent document. This override
 * injects semantic CSS variables and sets `data-theme` so block text remains
 * readable against light or dark backgrounds.
 *
 * @module src/components/puck/PuckIframeTheme
 */

import { useTheme } from "@teispace/next-themes";
import { useEffect, useLayoutEffect } from "react";
import {
  injectPuckAutoFrameStylesheetRejectionGuardScript,
} from "@/components/puck/PuckAutoFrameStylesheetRejectionGuard";
import {
  injectSafePointerCaptureScript,
  installSafePointerCapture,
} from "@/lib/safePointerCapture";
import {
  canvasShellNeedsVerticalScroll,
  chainWheelDeltaToCanvasShell,
} from "@/components/puck/lib/canvasLetterboxScrollport";
import { usePuckPreviewMode } from "@/components/puck/lib/useNexusPuck";
import {
  resetInteractivePreviewScrollports,
  resolveDesktopCanvasControlsInsetPx,
  syncInteractivePreviewIframeDocumentViewport,
} from "@/components/puck/lib/interactivePreviewScrollport";
import { syncLayoutInfiniteGridCursorFromPreviewIframe } from "@/components/background/infiniteGridCursorSync";

/** DOM id used for the injected token `<style>` element inside the preview iframe. */
const TOKEN_STYLE_ID = "nexus-puck-preview-tokens";

/** DOM id for carousel edit slide backgrounds re-synced on theme switch. */
const CAROUSEL_EDIT_BG_STYLE_ID = "nexus-puck-preview-carousel-edit-bg";

/**
 * Carousel edit slide backgrounds — re-injected after theme / host CSS clone so
 * `color-mix` recomputes with fresh `--color-bg-panel` (iframe token lag on toggle).
 */
const CAROUSEL_EDIT_BACKGROUND_IFRAME_CSS = `
.nexus-carousel--edit.nexus-carousel--multi-slide .nexus-carousel__slide {
  background: color-mix(in srgb, var(--color-bg-panel) 75%, transparent) !important;
}
.nexus-carousel--edit.nexus-carousel--single-frame {
  background: color-mix(in srgb, var(--color-bg-panel) 75%, transparent) !important;
}
`;

/** DOM id for the last-resort transparent override inside the preview iframe. */
const FORCE_TRANSPARENT_STYLE_ID = "nexus-puck-preview-force-transparent";

/** Last-resort iframe transparency — appended after CopyHostStyles clones host CSS. */
const FORCE_TRANSPARENT_IFRAME_CSS = `
html[data-nexus-puck-preview-document],
html[data-nexus-puck-preview-document] body,
html, body, #frame-root, [data-puck-entry], [data-puck-dropzone],
[class*="DropZone"], [class*="DropZone-item"], [class*="DropZone-dropZone"],
[data-puck-component], [data-puck-component] > *,
.global-layout-page-content-slot,
.global-layout-page-content-slot > div,
.nexus-page-stack,
.nexus-page-stack main {
  background: transparent !important;
  background-color: transparent !important;
  background-image: none !important;
}
`;

/** DOM id used for preview document scroll/overflow rules inside the iframe. */
const DOCUMENT_STYLE_ID = "nexus-puck-preview-document";

import {
  isPreviewIframeDocumentReady,
} from "@/components/puck/lib/previewIframeDocumentReady";

/**
 * Inject transparent canvas CSS into the preview iframe (stylesheet only).
 *
 * Re-appends the override `<style>` on theme changes so it stays after CopyHostStyles.
 *
 * @param iframeDoc - Preview iframe document.
 */
export function ensurePreviewDocumentTransparencyStyles(iframeDoc: Document): void {
  if (!isPreviewIframeDocumentReady(iframeDoc)) {
    return;
  }

  const { head } = iframeDoc;
  let forceStyle = iframeDoc.getElementById(FORCE_TRANSPARENT_STYLE_ID) as HTMLStyleElement | null;

  if (!forceStyle) {
    forceStyle = iframeDoc.createElement("style");
    forceStyle.id = FORCE_TRANSPARENT_STYLE_ID;
    head.appendChild(forceStyle);
  }

  forceStyle.textContent = FORCE_TRANSPARENT_IFRAME_CSS;

  if (head.lastElementChild !== forceStyle) {
    head.appendChild(forceStyle);
  }

  syncCarouselEditSlideBackground(iframeDoc);
}

/**
 * Re-append carousel edit slide `color-mix` after theme toggle or host stylesheet clone.
 *
 * @param iframeDoc - Preview iframe document.
 */
function syncCarouselEditSlideBackground(iframeDoc: Document): void {
  if (!isPreviewIframeDocumentReady(iframeDoc)) {
    return;
  }

  const { head } = iframeDoc;
  let carouselStyle = iframeDoc.getElementById(CAROUSEL_EDIT_BG_STYLE_ID) as HTMLStyleElement | null;
  if (!carouselStyle) {
    carouselStyle = iframeDoc.createElement("style");
    carouselStyle.id = CAROUSEL_EDIT_BG_STYLE_ID;
    head.appendChild(carouselStyle);
  }

  carouselStyle.textContent = CAROUSEL_EDIT_BACKGROUND_IFRAME_CSS;

  if (head.lastElementChild !== carouselStyle) {
    head.appendChild(carouselStyle);
  }
}

/**
 * Preview iframe document overflow rules.
 *
 * Edit mode keeps the document content-sized so Puck `rootHeight` tracks blocks —
 * the outer canvas shell owns vertical scroll (iframe/body do not scroll). Interactive
 * preview locks the iframe viewport and scrolls tall page content inside the document.
 *
 * @param previewMode - Active Puck preview mode.
 * @returns Injected stylesheet text.
 */
function buildPreviewDocumentCss(previewMode: "edit" | "interactive"): string {
  const sharedTransparentRules = `
#frame-root,
[data-puck-entry],
[data-puck-dropzone],
[class*="DropZone"],
[class*="DropZone-item"],
[class*="DropZone-dropZone"],
[data-puck-component],
[data-puck-component] > *,
.global-layout-page-content-slot,
.global-layout-page-content-slot > div,
.nexus-page-stack,
.nexus-page-stack main {
  background: transparent !important;
  background-color: transparent !important;
  background-image: none !important;
}

[class*="DraggableComponent-overlay"]:not(:hover) {
  background: transparent !important;
}
`;

  if (previewMode === "edit") {
    return `
html[data-nexus-puck-preview-document],
html,
body {
  margin: 0;
  min-height: auto;
  height: auto;
  overflow-x: hidden;
  overflow-y: hidden;
  background: transparent !important;
  background-color: transparent !important;
}

#frame-root,
[data-puck-entry] {
  background: transparent !important;
  background-color: transparent !important;
  position: relative;
  z-index: 1;
}

/*
 * Puck edit mode — block wrappers stay transparent so global nexus-bg shows through.
 */
${sharedTransparentRules}
`;
  }

  return `
html {
  margin: 0;
  height: 100%;
  overflow-x: hidden;
  overflow-y: auto;
  scrollbar-gutter: auto;
  scrollbar-width: thin;
  scrollbar-color: color-mix(in srgb, var(--color-text-secondary) 44%, transparent) transparent;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
  background: transparent !important;
  background-color: transparent !important;
}

html::-webkit-scrollbar {
  width: 8px;
}

html::-webkit-scrollbar-track {
  background: transparent;
}

html::-webkit-scrollbar-thumb {
  background: color-mix(in srgb, var(--color-text-secondary) 44%, transparent);
  border-radius: 999px;
}

html::-webkit-scrollbar-thumb:hover {
  background: color-mix(in srgb, var(--color-text-secondary) 58%, transparent);
}

body {
  margin: 0;
  min-height: 100%;
  overflow: visible;
  box-sizing: border-box;
  background: transparent !important;
  background-color: transparent !important;
}

#frame-root {
  min-height: 100%;
  height: auto !important;
  overflow: visible !important;
}

.global-layout-page-content-slot {
  box-sizing: border-box;
  padding-top: var(--nexus-preview-controls-inset, 0px);
}

${sharedTransparentRules}
`;
}

/**
 * Mirror host viewport-controls inset into the iframe for first-line content clearance.
 *
 * @param iframeDoc - Preview iframe document.
 */
function syncInteractivePreviewContentControlsInset(iframeDoc: Document): void {
  const parentDoc = iframeDoc.defaultView?.parent?.document ?? null;
  if (!parentDoc?.documentElement) {
    iframeDoc.documentElement.style.removeProperty("--nexus-preview-controls-inset");
    return;
  }

  const insetPx = resolveDesktopCanvasControlsInsetPx(parentDoc);
  iframeDoc.documentElement.style.setProperty("--nexus-preview-controls-inset", `${insetPx}px`);
}

/**
 * Apply inline document scroll constraints that must win over copied host stylesheets.
 *
 * @param iframeDoc - Preview iframe document.
 * @param previewMode - Active Puck preview mode.
 */
function applyPreviewDocumentScrollStyles(
  iframeDoc: Document,
  previewMode: "edit" | "interactive",
): void {
  const { documentElement, body } = iframeDoc;
  if (!body) {
    return;
  }

  if (previewMode === "interactive") {
    documentElement.style.height = "100%";
    documentElement.style.overflowX = "hidden";
    documentElement.style.overflowY = "auto";
    body.style.minHeight = "100%";
    body.style.removeProperty("height");
    body.style.overflow = "visible";
    syncInteractivePreviewIframeDocumentViewport(iframeDoc);
    syncInteractivePreviewContentControlsInset(iframeDoc);
    return;
  }

  documentElement.style.removeProperty("height");
  documentElement.style.removeProperty("overflow");
  documentElement.style.removeProperty("overflow-x");
  documentElement.style.removeProperty("overflow-y");
  body.style.removeProperty("min-height");
  body.style.removeProperty("height");
  body.style.removeProperty("overflow");
  body.style.removeProperty("overflow-x");
  body.style.removeProperty("overflow-y");
}

/**
 * Minimal Nexus semantic tokens required by Puck block inline styles.
 * Kept in sync with `src/app/globals.css` dark/light overrides.
 */
const PREVIEW_TOKEN_CSS = `
:root {
  --color-bg-surface: #0f1729;
  --color-bg-elevated: #1e2945;
  --color-bg-panel: #18213a;
  --color-bg-cell: #121a29;
  --color-text-primary: #f1f5f9;
  --color-text-secondary: #94a3b8;
  --color-border-default: rgba(71, 85, 105, 0.45);
  --color-warning: #fbbf24;
  --color-danger: #f87171;
  --color-success: #34d399;
  --accent-blue-soft: #93c5fd;
  --accent-blue-medium: #60a5fa;
  --accent-blue-strong: #3b82f6;
  --accent-red-soft: #fca5a5;
  --accent-red-medium: #f87171;
  --accent-red-strong: #ef4444;
  --accent-yellow-soft: #fde68a;
  --accent-yellow-medium: #fbbf24;
  --accent-yellow-strong: #f59e0b;
  --accent-green-soft: #6ee7b7;
  --accent-green-medium: #34d399;
  --accent-green-strong: #10b981;
  --accent-purple-soft: #c4b5fd;
  --accent-purple-medium: #a78bfa;
  --accent-purple-strong: #8b5cf6;
  --color-accent-user: var(--accent-blue-medium);
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;
  --spacing-2xl: 48px;
  --content-width-xs: 640px;
  --content-width-sm: 800px;
  --content-width-md: 1024px;
  --content-width-lg: 1200px;
  --content-width-xl: 1400px;
  --content-width-full: 100%;
  --font-sans: var(--font-inter, "Inter", system-ui, sans-serif);
  --font-serif: var(--font-serif-face, "Source Serif 4", Georgia, serif);
  --font-mono: var(--font-mono-face, "JetBrains Mono", ui-monospace, monospace);
}
[data-theme="light"] {
  --color-bg-surface: #f8fafc;
  --color-bg-elevated: #ffffff;
  --color-bg-panel: #f1f5f9;
  --color-bg-cell: #e2e8f0;
  --color-text-primary: #0f172a;
  --color-text-secondary: #475569;
  --color-border-default: rgba(148, 163, 184, 0.45);
}
`;

/**
 * Inject or refresh all Nexus preview iframe styles after Puck CopyHostStyles clones CSS.
 *
 * CopyHostStyles replaces `iframeDoc.head` asynchronously; styles must be re-appended afterward.
 *
 * @param iframeDoc - Preview iframe document.
 * @param previewMode - Active Puck preview mode.
 * @param theme - Resolved site theme (`light` | `dark`).
 */
export function syncPreviewIframeDocumentStyles(
  iframeDoc: Document,
  previewMode: "edit" | "interactive",
  theme: "light" | "dark",
): void {
  if (!isPreviewIframeDocumentReady(iframeDoc)) {
    return;
  }

  iframeDoc.documentElement.setAttribute("data-theme", theme);
  iframeDoc.documentElement.setAttribute("data-nexus-puck-preview-document", "true");

  const { head } = iframeDoc;

  let styleEl = iframeDoc.getElementById(TOKEN_STYLE_ID) as HTMLStyleElement | null;
  if (!styleEl) {
    styleEl = iframeDoc.createElement("style");
    styleEl.id = TOKEN_STYLE_ID;
    head.appendChild(styleEl);
  }
  styleEl.textContent = PREVIEW_TOKEN_CSS;

  let docStyleEl = iframeDoc.getElementById(DOCUMENT_STYLE_ID) as HTMLStyleElement | null;
  if (!docStyleEl) {
    docStyleEl = iframeDoc.createElement("style");
    docStyleEl.id = DOCUMENT_STYLE_ID;
    head.appendChild(docStyleEl);
  }
  docStyleEl.textContent = buildPreviewDocumentCss(previewMode);

  ensurePreviewDocumentTransparencyStyles(iframeDoc);
  applyPreviewDocumentScrollStyles(iframeDoc, previewMode);

  if (iframeDoc.body) {
    iframeDoc.body.style.color = "var(--color-text-primary)";
    iframeDoc.body.style.fontFamily = "var(--font-sans)";
    iframeDoc.body.style.margin = "0";
  }
}

/** Delayed re-sync schedule (ms) — beats Puck CopyHostStyles head wipe without observers. */
const COPY_HOST_STYLES_RESYNC_DELAYS_MS = [0, 16, 50, 120, 250, 500, 900] as const;

/** Props for the Puck `iframe` override wrapper. */
export interface PuckIframeThemeProps {
  /** Default iframe children rendered by Puck. */
  children: React.ReactNode;
  /** Reference to the preview iframe's `document`, when available. */
  document?: Document;
}

/**
 * Puck `iframe` override — applies theme attribute and token stylesheet.
 *
 * @param props - See `PuckIframeThemeProps`.
 * @returns Fragment wrapping Puck's default iframe children.
 */
export function PuckIframeTheme({ children, document: iframeDoc }: PuckIframeThemeProps) {
  const { resolvedTheme } = useTheme();
  const theme = resolvedTheme === "light" ? "light" : "dark";
  const previewMode = usePuckPreviewMode();

  /** Sync theme, tokens, and transparency before paint; re-sync after CopyHostStyles head wipe. */
  useLayoutEffect(() => {
    if (!iframeDoc?.documentElement) return;

    injectPuckAutoFrameStylesheetRejectionGuardScript(iframeDoc);
    injectSafePointerCaptureScript(iframeDoc);
    installSafePointerCapture(iframeDoc.defaultView);
    syncPreviewIframeDocumentStyles(iframeDoc, previewMode, theme);
  }, [iframeDoc, previewMode, theme]);

  useEffect(() => {
    if (!iframeDoc?.documentElement) return;

    const timeoutIds = COPY_HOST_STYLES_RESYNC_DELAYS_MS.map((delayMs) =>
      window.setTimeout(() => {
        syncPreviewIframeDocumentStyles(iframeDoc, previewMode, theme);
      }, delayMs),
    );

    resetInteractivePreviewScrollports(iframeDoc.defaultView?.parent?.document ?? null);
    iframeDoc.defaultView?.scrollTo(0, 0);

    const iframeWindow = iframeDoc.defaultView;
    if (!iframeWindow) {
      return () => {
        timeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId));
      };
    }

    const onWheel = (event: WheelEvent) => {
      if (previewMode === "interactive") {
        return;
      }

      if (!canvasShellNeedsVerticalScroll()) return;

      const chained = chainWheelDeltaToCanvasShell(
        iframeWindow,
        iframeDoc,
        event.deltaY,
        event.deltaX,
      );
      if (chained) {
        event.preventDefault();
      }
    };

    iframeDoc.addEventListener("wheel", onWheel, { capture: true, passive: false });

    const onPointerMove = (event: PointerEvent) => {
      syncLayoutInfiniteGridCursorFromPreviewIframe(event, iframeDoc);
    };
    iframeDoc.addEventListener("pointermove", onPointerMove, { passive: true });

    let frameResizeObserver: ResizeObserver | null = null;
    if (previewMode === "interactive") {
      const frame = iframeDoc.defaultView?.frameElement;
      if (frame && typeof ResizeObserver !== "undefined") {
        const syncViewport = () => {
          syncInteractivePreviewIframeDocumentViewport(iframeDoc);
          syncInteractivePreviewContentControlsInset(iframeDoc);
        };
        frameResizeObserver = new ResizeObserver(syncViewport);
        frameResizeObserver.observe(frame);
        syncViewport();
      }
    }

    return () => {
      timeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId));
      iframeDoc.removeEventListener("wheel", onWheel, { capture: true });
      iframeDoc.removeEventListener("pointermove", onPointerMove);
      frameResizeObserver?.disconnect();
    };
  }, [iframeDoc, previewMode, theme]);

  return <>{children}</>;
}

export default PuckIframeTheme;
