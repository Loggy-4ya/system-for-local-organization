/**
 * @fileoverview Compact editor scrollport grid — CSS backdrop behind canvas + overlay panel.
 *
 * On narrow editor routes (≤900px) the grid portals into `PuckLayout-inner` as an absolute
 * fill layer (`inset: 0`; browser-sized via min/max height). The plugin panel is an overlay
 * above the bottom nav — it does not shrink the canvas or resize the grid.
 *
 * @module src/components/puck/lib/mobileScrollportGridFreeze
 */

import { PUCK_MOBILE_CANVAS_SHELL_SELECTOR } from "@/components/puck/lib/puckCanvasSelectors";
import {
  NEXUS_PANEL_LAYOUT_MUTATING_ATTR,
  NEXUS_PANEL_RESIZING_ATTR,
} from "@/components/puck/lib/sidebarLayoutLimits";
import { PUCK_COMPACT_EDITOR_MAX_WIDTH } from "@/components/puck/usePuckMobileEditorChrome";

/** Puck layout inner grid — hosts the compact backdrop scrollport grid. */
export const PUCK_COMPACT_LAYOUT_INNER_SELECTOR = '.Puck [class*="PuckLayout-inner"]';

/** Puck bottom nav rail — used by scrollport mount observers only. */
export const PUCK_COMPACT_LAYOUT_NAV_SELECTOR = '.Puck [class*="PuckLayout-nav"]';

/** Id of the portaled editor scrollport {@link InfiniteGrid} wrapper. */
export const NEXUS_SCROLLPORT_GRID_ID = "nexus-editor-scrollport-grid";

/** Marks compact layout-inner backdrop scrollport grid. */
export const NEXUS_SCROLLPORT_GRID_BACKDROP_ATTR = "data-nexus-scrollport-grid-backdrop";

/** Fired after viewport resize so the grid bitmap can resync once. */
export const NEXUS_SCROLLPORT_GRID_METRICS_CHANGED_EVENT = "nexus-scrollport-grid-metrics-changed";

/** @deprecated Use {@link NEXUS_SCROLLPORT_GRID_BACKDROP_ATTR}. */
export const NEXUS_SCROLLPORT_GRID_VIEWPORT_ATTR = NEXUS_SCROLLPORT_GRID_BACKDROP_ATTR;

/** @deprecated Backdrop sizing is CSS-only (`inset: 0` on layout-inner). */
export const NEXUS_SCROLLPORT_GRID_BG_WIDTH_VAR = "--nexus-scrollport-grid-bg-width";

/** @deprecated Backdrop sizing is CSS-only (`inset: 0` on layout-inner). */
export const NEXUS_SCROLLPORT_GRID_BG_HEIGHT_VAR = "--nexus-scrollport-grid-bg-height";

/** CSS var — measured bottom nav rail height for overlay panel positioning. */
export const NEXUS_COMPACT_NAV_RAIL_HEIGHT_VAR = "--nexus-compact-nav-rail-height";

/** @deprecated Backdrop sizing is CSS-only (`inset: 0` on layout-inner). */
export const NEXUS_SCROLLPORT_GRID_BG_TOP_VAR = "--nexus-scrollport-grid-bg-top";

/**
 * Pure width check for narrow editor scrollport backdrop (≤900px).
 *
 * @param viewportWidth - `window.innerWidth` or equivalent.
 * @returns True when the mobile panel grid layout is active.
 */
export function isNarrowEditorViewportWidth(viewportWidth: number): boolean {
  return viewportWidth <= PUCK_COMPACT_EDITOR_MAX_WIDTH;
}

/**
 * Whether the narrow mobile panel editor (≤900px) uses the layout-inner backdrop grid.
 *
 * @returns True when the editor uses bottom-rail + fullScreen canvas layout.
 */
export function usesMobileScrollportGridViewport(): boolean {
  if (typeof window === "undefined") return false;
  return isNarrowEditorViewportWidth(window.innerWidth);
}

/**
 * Whether the scrollport grid should mount on `PuckLayout-inner` instead of the canvas shell.
 *
 * @returns True when a fullScreen canvas is present on a narrow viewport.
 */
export function usesMobileScrollportGridBackdropMount(): boolean {
  if (typeof document === "undefined") return false;
  if (!usesMobileScrollportGridViewport()) return false;
  return document.querySelector(PUCK_MOBILE_CANVAS_SHELL_SELECTOR) !== null;
}

/**
 * Whether scrollport grid bitmap resize should pause (panel height easing / drag).
 *
 * @returns True while compact panel layout attrs indicate an in-flight height change.
 */
export function isMobileScrollportGridMetricsLocked(): boolean {
  if (typeof document === "undefined") return false;

  const root = document.documentElement;
  return (
    root.hasAttribute(NEXUS_PANEL_LAYOUT_MUTATING_ATTR) ||
    root.hasAttribute(NEXUS_PANEL_RESIZING_ATTR) ||
    root.hasAttribute("data-nexus-panel-opening") ||
    root.hasAttribute("data-nexus-panel-closing") ||
    root.hasAttribute("data-nexus-panel-expanding") ||
    root.hasAttribute("data-nexus-panel-collapsing") ||
    root.hasAttribute("data-nexus-panel-close-settling")
  );
}

/**
 * Whether scrollport grid bitmap resize should be skipped (panel layout locked).
 *
 * @returns True while panel layout is mutating on a narrow backdrop route.
 */
export function isMobileScrollportGridPaintFrozen(): boolean {
  return usesMobileScrollportGridViewport() && isMobileScrollportGridMetricsLocked();
}

/** @deprecated Use {@link isMobileScrollportGridMetricsLocked}. */
export function isMobileScrollportGridShellFrozen(): boolean {
  return isMobileScrollportGridMetricsLocked();
}

/**
 * Resolve backdrop pixel size for tests and legacy callers.
 *
 * @param layoutInnerWidth - `PuckLayout-inner` client width in CSS px.
 * @param layoutInnerHeight - `PuckLayout-inner` client height in CSS px.
 * @param navHeight - Bottom nav rail height in CSS px.
 * @param editorTopOffset - Unused; backdrop fills layout-inner via CSS.
 * @returns Backdrop width and height in CSS px.
 */
export function resolveMobileScrollportBackdropMetrics(
  layoutInnerWidth: number,
  layoutInnerHeight: number,
  navHeight: number,
  editorTopOffset = 0,
): { width: number; height: number; top: number } {
  return {
    width: Math.max(1, Math.round(layoutInnerWidth)),
    height: Math.max(1, Math.round(layoutInnerHeight)),
    top: Math.max(0, Math.round(editorTopOffset)),
  };
}

/**
 * Resolve the compact layout inner that hosts the backdrop grid.
 *
 * @returns Layout inner element or null.
 */
export function resolveMobileScrollportBackdropHost(): HTMLElement | null {
  if (typeof document === "undefined") return null;
  return document.querySelector(PUCK_COMPACT_LAYOUT_INNER_SELECTOR) as HTMLElement | null;
}

/** @deprecated Backdrop metrics are CSS-only; no-op. */
export function applyMobileScrollportBackdropMetrics(): boolean {
  return usesMobileScrollportGridViewport();
}

/** @deprecated Backdrop metrics are CSS-only; no-op. */
export function freezeMobileScrollportBackdropMetrics(): boolean {
  return usesMobileScrollportGridViewport();
}

/** @deprecated Backdrop metrics are CSS-only; no-op. */
export function clearMobileScrollportBackdropMetricsFreeze(): void {}

/**
 * Tag the scrollport grid wrapper for compact backdrop CSS.
 */
export function applyMobileScrollportGridViewport(): void {
  if (typeof document === "undefined") return;
  if (!usesMobileScrollportGridViewport()) return;

  document.getElementById(NEXUS_SCROLLPORT_GRID_ID)?.setAttribute(
    NEXUS_SCROLLPORT_GRID_BACKDROP_ATTR,
    "",
  );
}

/**
 * Write measured bottom nav height onto layout-inner for overlay panel `bottom` inset.
 *
 * @returns True when the rail height var was updated.
 */
export function syncCompactNavRailHeight(): boolean {
  if (typeof document === "undefined") return false;
  if (!usesMobileScrollportGridViewport()) return false;

  const layoutInner = resolveMobileScrollportBackdropHost();
  const nav = layoutInner?.querySelector(PUCK_COMPACT_LAYOUT_NAV_SELECTOR) as HTMLElement | null;
  if (!layoutInner || !nav || nav.offsetHeight <= 0) return false;

  layoutInner.style.setProperty(NEXUS_COMPACT_NAV_RAIL_HEIGHT_VAR, `${nav.offsetHeight}px`);
  return true;
}

/**
 * Notify listeners after viewport width / orientation change.
 */
export function notifyMobileScrollportGridResync(): void {
  if (typeof document === "undefined") return;
  if (!usesMobileScrollportGridViewport()) return;

  window.dispatchEvent(
    new CustomEvent(NEXUS_SCROLLPORT_GRID_METRICS_CHANGED_EVENT, { bubbles: true }),
  );
}

/**
 * Tag backdrop mode and optionally resync after viewport settle (not panel open/close).
 */
export function recordMobileScrollportShellMetrics(): void {
  if (typeof document === "undefined") return;
  if (!usesMobileScrollportGridViewport()) return;

  applyMobileScrollportGridViewport();
  syncCompactNavRailHeight();

  if (isMobileScrollportGridMetricsLocked()) return;

  notifyMobileScrollportGridResync();
}

/** @deprecated No-op — backdrop mode does not freeze DOM shell dimensions. */
export function stageMobileScrollportGridFreezePanelDelta(_panelDeltaPx: number): void {}

/** @deprecated No-op — backdrop mode does not freeze DOM shell dimensions. */
export function freezeMobileScrollportGridShell(): void {
  applyMobileScrollportGridViewport();
}

/** @deprecated No-op — backdrop mode does not freeze DOM shell dimensions. */
export function unfreezeMobileScrollportGridShell(): void {}

/** @deprecated Use {@link resolveMobileScrollportBackdropMetrics}. */
export function resolveMobileScrollportGridFreezeSize(
  shellWidth: number,
  shellHeight: number,
  panelDeltaPx: number,
): { width: number; height: number; top: number } {
  return {
    width: Math.max(1, Math.round(shellWidth)),
    height: Math.max(
      1,
      Math.round(panelDeltaPx > 0 ? shellHeight + panelDeltaPx : shellHeight),
    ),
    top: 0,
  };
}

/** @deprecated Use {@link isMobileScrollportGridPaintFrozen}. */
export function isMobileScrollportGridFrozen(): boolean {
  return isMobileScrollportGridPaintFrozen();
}

/** @deprecated Use {@link applyMobileScrollportGridViewport}. */
export function freezeMobileScrollportGrid(): void {
  applyMobileScrollportGridViewport();
}

/** @deprecated Use {@link applyMobileScrollportGridViewport}. */
export function unfreezeMobileScrollportGrid(): void {
  applyMobileScrollportGridViewport();
}

/** @deprecated Backdrop host supersedes canvas shell mount on compact routes. */
export function resolveMobileScrollportShellForMetrics(): HTMLElement | null {
  return (
    resolveMobileScrollportBackdropHost() ??
    (document.querySelector(PUCK_MOBILE_CANVAS_SHELL_SELECTOR) as HTMLElement | null)
  );
}
