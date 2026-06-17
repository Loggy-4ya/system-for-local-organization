/**
 * @fileoverview Desktop Puck canvas scrollport — full-shell grid, shell-owned scroll.
 *
 * On desktop (≥901px), the global layout `InfiniteGrid` (`#nexus-bg`) fills the viewport;
 * Puck canvas chrome stays transparent so the grid shows through letterbox gutters.
 *
 * Tests: `tests/puck/lib/desktopEditorScrollport.test.ts` — `npm run test:desktop-editor-scrollport`
 *
 * @module src/components/puck/lib/desktopEditorScrollport
 */

"use client";

import { PUCK_DESKTOP_EDITOR_MQ } from "@/components/puck/usePuckMobileEditorChrome";

/**
 * Whether the given window uses the desktop Puck editor layout (side-by-side panels).
 *
 * @param target - Window to query; defaults to the current window.
 * @returns True when {@link PUCK_DESKTOP_EDITOR_MQ} matches.
 */
export function matchesDesktopEditorLayout(target: Window = window): boolean {
  if (typeof target.matchMedia !== "function") return false;
  return target.matchMedia(PUCK_DESKTOP_EDITOR_MQ).matches;
}

/**
 * Whether the given document hosts the Puck editor shell.
 *
 * @param doc - Document to inspect.
 * @returns True when a `.Puck` root is mounted.
 */
export function isPuckEditorDocument(doc: Document): boolean {
  return doc.querySelector(".Puck") !== null;
}

/**
 * Whether the editor should paint site-default grid on the canvas shell (not in iframe).
 *
 * Uses the parent document when called from the Puck preview iframe.
 *
 * @param target - Window to start from; defaults to the current window.
 * @returns True on Puck editor routes where the shell scrollport grid owns the background.
 */
export function usesDesktopScrollportGrid(target: Window = window): boolean {
  if (typeof target === "undefined") return false;

  try {
    const parent = target.parent;
    if (parent && parent !== target) {
      return matchesDesktopEditorLayout(parent);
    }
  } catch {
    /* cross-origin parent — fall through */
  }

  return matchesDesktopEditorLayout(target);
}

/**
 * Required `puck-editor.css` fragments for desktop fixed-viewport centering (≥901px).
 *
 * Puck `#puck-canvas-root` is `position: absolute` with `left: auto`; horizontal centering
 * depends on `PuckCanvas-inner` `justify-content: center` (flex static position).
 */
export const DESKTOP_FIXED_VIEWPORT_CENTERING_CSS_CONTRACT = {
  canvasInnerCenter: "justify-content: center !important",
  fullWidthStretch: "[data-nexus-viewport-full-width]",
  fullWidthInnerStretch: "justify-content: stretch !important",
  canvasShellTransparent: "background: transparent !important",
  layoutInnerTransparent: "PuckLayout-inner",
} as const;

/**
 * Validate desktop fixed-viewport centering rules exist in `puck-editor.css`.
 *
 * @param cssText - Full puck-editor stylesheet text.
 * @returns Missing contract keys (empty when satisfied).
 */
export function findMissingDesktopFixedViewportCenteringCss(cssText: string): string[] {
  const missing: string[] = [];

  for (const [key, fragment] of Object.entries(DESKTOP_FIXED_VIEWPORT_CENTERING_CSS_CONTRACT)) {
    if (!cssText.includes(fragment)) {
      missing.push(key);
    }
  }

  return missing;
}
