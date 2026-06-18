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
  injectSafePointerCaptureScript,
  installSafePointerCapture,
} from "@/lib/safePointerCapture";
import {
  canvasShellNeedsVerticalScroll,
  chainWheelDeltaToCanvasShell,
} from "@/components/puck/lib/canvasLetterboxScrollport";
import { usePuckPreviewMode } from "@/components/puck/lib/useNexusPuck";

/** DOM id used for the injected token `<style>` element inside the preview iframe. */
const TOKEN_STYLE_ID = "nexus-puck-preview-tokens";

/** DOM id used for preview document scroll/overflow rules inside the iframe. */
const DOCUMENT_STYLE_ID = "nexus-puck-preview-document";

/**
 * Preview iframe document overflow rules.
 *
 * Edit mode keeps the document content-sized so Puck `rootHeight` tracks blocks —
 * the outer canvas shell owns scroll. Interactive preview fills the iframe for faithful UX.
 *
 * @param previewMode - Active Puck preview mode.
 * @returns Injected stylesheet text.
 */
function buildPreviewDocumentCss(previewMode: "edit" | "interactive"): string {
  const contentSized = previewMode === "edit";

  return `
html,
body {
  margin: 0;
  min-height: ${contentSized ? "auto" : "100%"};
  height: ${contentSized ? "auto" : "100%"};
  overflow-x: hidden;
  overflow-y: ${contentSized ? "visible" : "auto"};
  background: transparent !important;
  background-color: transparent !important;
}

/*
 * Puck edit mode — keep drop-zone / component wrappers transparent (shell bleed-through).
 * When compositing fails, edit uses an iframe-contained grid instead; these rules still
 * prevent opaque Puck defaults in both paths.
 */
#frame-root,
[data-puck-entry],
[data-puck-dropzone],
[class*="DropZone"],
[class*="DropZone-item"],
[data-puck-component],
.global-layout-page-content-slot,
.global-layout-page-content-slot > div {
  background: transparent !important;
  background-color: transparent !important;
}

[class*="DraggableComponent-overlay"]:not(:hover) {
  background: transparent !important;
}
`;
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

  /** Sync `data-theme` before paint so iframe-contained grids read the active theme. */
  useLayoutEffect(() => {
    if (!iframeDoc?.documentElement) return;

    injectSafePointerCaptureScript(iframeDoc);
    installSafePointerCapture(iframeDoc.defaultView);

    iframeDoc.documentElement.setAttribute("data-theme", theme);
    iframeDoc.documentElement.style.background = "transparent";
    if (iframeDoc.body) {
      iframeDoc.body.style.background = "transparent";
    }

    try {
      const frame = iframeDoc.defaultView?.frameElement as HTMLIFrameElement | null;
      if (frame) {
        frame.style.backgroundColor = "transparent";
      }
    } catch {
      /* cross-origin parent */
    }
  }, [iframeDoc, theme]);

  useEffect(() => {
    if (!iframeDoc?.documentElement) return;

    let styleEl = iframeDoc.getElementById(TOKEN_STYLE_ID) as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = iframeDoc.createElement("style");
      styleEl.id = TOKEN_STYLE_ID;
      styleEl.textContent = PREVIEW_TOKEN_CSS;
      iframeDoc.head.appendChild(styleEl);
    }

    let docStyleEl = iframeDoc.getElementById(DOCUMENT_STYLE_ID) as HTMLStyleElement | null;
    if (!docStyleEl) {
      docStyleEl = iframeDoc.createElement("style");
      docStyleEl.id = DOCUMENT_STYLE_ID;
      iframeDoc.head.appendChild(docStyleEl);
    }
    docStyleEl.textContent = buildPreviewDocumentCss(previewMode);

    if (iframeDoc.body) {
      iframeDoc.body.style.color = "var(--color-text-primary)";
      iframeDoc.body.style.fontFamily = "var(--font-sans)";
      iframeDoc.body.style.margin = "0";
      iframeDoc.body.style.background = "transparent";
    }

    const iframeWindow = iframeDoc.defaultView;
    if (!iframeWindow) return;

    const onWheel = (event: WheelEvent) => {
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

    return () => {
      iframeDoc.removeEventListener("wheel", onWheel, { capture: true });
    };
  }, [iframeDoc, previewMode, theme]);

  return <>{children}</>;
}

export default PuckIframeTheme;
