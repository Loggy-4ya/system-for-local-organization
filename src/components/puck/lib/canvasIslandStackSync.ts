/**
 * @fileoverview Compact editor — sync canvas toolbar islands above the plugin panel.
 *
 * Measures the visible plugin panel top edge against the canvas shell bottom and writes
 * `--nexus-canvas-island-stack-bottom` so history + viewport FABs track panel height/position.
 *
 * Tests: `tests/puck/lib/canvasIslandStackSync.test.ts` — `npm run test:canvas-island-stack`
 *
 * @module src/components/puck/lib/canvasIslandStackSync
 */

import { PUCK_MOBILE_CANVAS_SHELL_SELECTOR } from "@/components/puck/lib/puckCanvasSelectors";
import { usesMobileScrollportGridViewport } from "@/components/puck/lib/mobileScrollportGridFreeze";

/** CSS var — distance from canvas bottom to docked island bottom (px). */
export const NEXUS_CANVAS_ISLAND_STACK_BOTTOM_VAR = "--nexus-canvas-island-stack-bottom";

/** Visible compact plugin panel sidebar. */
export const PUCK_COMPACT_PLUGIN_PANEL_SELECTOR =
  '.Puck [class*="Sidebar--left"][class*="Sidebar--isVisible"]';

/** Puck layout root when the left plugin panel tab is active. */
export const PUCK_COMPACT_PANEL_OPEN_SELECTOR = '[class*="PuckLayout--leftSideBarVisible"]';

/** `<html>` attrs that ease panel height via CSS (use smooth stack calc, not measured px). */
export const CANVAS_ISLAND_SMOOTH_STACK_ATTRS = [
  "data-nexus-panel-opening",
  "data-nexus-panel-closing",
  "data-nexus-panel-close-settling",
  "data-nexus-panel-expanding",
  "data-nexus-panel-collapsing",
] as const;

/**
 * Whether toolbar islands should use measured px instead of the smooth height calc.
 *
 * Always false — islands track `--nexus-canvas-island-stack-smooth` (derived from the easing
 * `--nexus-mobile-panel-height` token). Switching to measured px at settle caused a visible snap.
 *
 * @param _htmlAttributes - Active attribute names on `<html>` (unused; kept for tests).
 * @returns Always false.
 */
export function shouldUseMeasuredCanvasIslandStack(
  _htmlAttributes: readonly string[],
): boolean {
  return false;
}

/**
 * Compute island `bottom` offset from canvas bottom to sit `gapPx` above the panel top.
 *
 * @param canvasBottom - Canvas shell bottom edge in viewport coordinates.
 * @param panelTop - Plugin panel top edge in viewport coordinates.
 * @param gapPx - Desired gap between panel top and island bottom.
 * @returns Rounded stack offset in px, or null when inputs are invalid.
 */
export function measureCanvasIslandStackBottomPx(
  canvasBottom: number,
  panelTop: number,
  gapPx: number,
): number | null {
  if (!Number.isFinite(canvasBottom) || !Number.isFinite(panelTop) || !Number.isFinite(gapPx)) {
    return null;
  }

  const stackBottom = canvasBottom - panelTop + gapPx;
  if (!Number.isFinite(stackBottom)) return null;

  return Math.max(0, Math.round(stackBottom * 100) / 100);
}

/**
 * Read the compact viewport-island gap token from `.Puck`.
 *
 * @returns Gap in px between plugin panel top and toolbar islands.
 */
export function resolveCanvasIslandStackGapPx(): number {
  if (typeof document === "undefined") return 10;

  const puck = document.querySelector(".Puck");
  if (!puck) return 10;

  const raw = getComputedStyle(puck).getPropertyValue("--nexus-viewport-island-gap").trim();
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : 10;
}

/**
 * Whether the compact plugin panel is open with a visible sidebar shell.
 *
 * @returns True when panel-open layout class is set and the sidebar is visible.
 */
export function isCompactPluginPanelOpen(): boolean {
  if (typeof document === "undefined") return false;
  if (!document.querySelector(PUCK_COMPACT_PANEL_OPEN_SELECTOR)) return false;

  const sidebar = document.querySelector(PUCK_COMPACT_PLUGIN_PANEL_SELECTOR);
  if (!sidebar) return false;

  return sidebar.getBoundingClientRect().height > 0;
}

/**
 * Clear the measured island stack offset.
 */
export function clearCanvasIslandStackBottom(): void {
  if (typeof document === "undefined") return;
  document.documentElement.style.removeProperty(NEXUS_CANVAS_ISLAND_STACK_BOTTOM_VAR);
}

/**
 * Measure plugin panel geometry and write `--nexus-canvas-island-stack-bottom` on `<html>`.
 *
 * @returns True when a stack offset was written.
 */
export function syncCanvasIslandStackBottom(): boolean {
  if (typeof document === "undefined") return false;

  const htmlAttributes = [...document.documentElement.attributes].map((attr) => attr.name);

  if (
    !usesMobileScrollportGridViewport() ||
    !isCompactPluginPanelOpen() ||
    !shouldUseMeasuredCanvasIslandStack(htmlAttributes)
  ) {
    clearCanvasIslandStackBottom();
    return false;
  }

  const canvas = document.querySelector(PUCK_MOBILE_CANVAS_SHELL_SELECTOR);
  const sidebar = document.querySelector(PUCK_COMPACT_PLUGIN_PANEL_SELECTOR);
  if (!canvas || !sidebar) {
    clearCanvasIslandStackBottom();
    return false;
  }

  const stackBottom = measureCanvasIslandStackBottomPx(
    canvas.getBoundingClientRect().bottom,
    sidebar.getBoundingClientRect().top,
    resolveCanvasIslandStackGapPx(),
  );

  if (stackBottom === null) {
    clearCanvasIslandStackBottom();
    return false;
  }

  document.documentElement.style.setProperty(
    NEXUS_CANVAS_ISLAND_STACK_BOTTOM_VAR,
    `${stackBottom}px`,
  );
  return true;
}
