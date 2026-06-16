/**
 * @fileoverview Sidebar width and compact mobile panel height limits for the Puck editor.
 *
 * @module src/components/puck/lib/sidebarLayoutLimits
 */

import {
  PUCK_COMPACT_EDITOR_MAX_WIDTH,
  PUCK_COMPACT_EDITOR_MQ,
  PUCK_NARROW_DESKTOP_MAX_WIDTH,
  PUCK_TIGHT_DESKTOP_MAX_WIDTH,
} from "@/components/puck/usePuckMobileEditorChrome";

/** Upper bound for narrow editor layout fixes (sidebar strip, full-bleed canvas). */
export const NEXUS_NARROW_EDITOR_MAX_WIDTH = PUCK_COMPACT_EDITOR_MAX_WIDTH;

/** Puck `localStorage` key for persisted sidebar drag widths. */
export const PUCK_SIDEBAR_WIDTHS_STORAGE_KEY = "puck-sidebar-widths";

/** `localStorage` key for compact-mode plugin panel height (px). */
export const NEXUS_MOBILE_PANEL_HEIGHT_STORAGE_KEY = "nexus-mobile-panel-height";

/** `localStorage` key for panel height (px) before double-tap expand to max. */
export const NEXUS_MOBILE_PANEL_PRE_EXPAND_HEIGHT_STORAGE_KEY =
  "nexus-mobile-panel-pre-expand-height";

/** CSS custom property for compact plugin panel row height. */
export const NEXUS_MOBILE_PANEL_HEIGHT_VAR = "--nexus-mobile-panel-height";

/** `<html>` attribute set while the compact panel vertical drag is active. */
export const NEXUS_PANEL_RESIZING_ATTR = "data-nexus-panel-resizing";

/** `<html>` attribute set while any compact panel height/layout mutation runs. */
export const NEXUS_PANEL_LAYOUT_MUTATING_ATTR = "data-nexus-panel-layout-mutating";

/** Custom event dispatched once after compact panel layout mutations settle. */
export const NEXUS_PANEL_LAYOUT_SETTLED_EVENT = "nexus-panel-layout-settled";

/** Desktop (≥1024px) left sidebar min/max width in px. */
export const NEXUS_LEFT_SIDEBAR_MIN_WIDTH = 280;
export const NEXUS_LEFT_SIDEBAR_MAX_WIDTH = 320;

/** Desktop (≥1024px) right sidebar min/max width in px. */
export const NEXUS_RIGHT_SIDEBAR_MIN_WIDTH = 320;
export const NEXUS_RIGHT_SIDEBAR_MAX_WIDTH = 400;

/** Narrow desktop (961–1023px) left sidebar min/max width in px. */
export const NEXUS_NARROW_LEFT_SIDEBAR_MIN_WIDTH = 180;
export const NEXUS_NARROW_LEFT_SIDEBAR_MAX_WIDTH = 200;

/** Narrow desktop (961–1023px) right sidebar min/max width in px. */
export const NEXUS_NARROW_RIGHT_SIDEBAR_MIN_WIDTH = 220;
export const NEXUS_NARROW_RIGHT_SIDEBAR_MAX_WIDTH = 260;

/** Tight desktop (901–960px) left sidebar min/max width in px. */
export const NEXUS_TIGHT_LEFT_SIDEBAR_MIN_WIDTH = 150;
export const NEXUS_TIGHT_LEFT_SIDEBAR_MAX_WIDTH = 170;

/** Tight desktop (901–960px) right sidebar min/max width in px. */
export const NEXUS_TIGHT_RIGHT_SIDEBAR_MIN_WIDTH = 190;
export const NEXUS_TIGHT_RIGHT_SIDEBAR_MAX_WIDTH = 220;

/** Compact plugin panel minimum height in px. */
export const NEXUS_MOBILE_PANEL_MIN_HEIGHT_PX = 160;

/** Compact plugin panel maximum height as a fraction of viewport height. */
export const NEXUS_MOBILE_PANEL_MAX_HEIGHT_VH = 0.6;

/** Compact plugin panel absolute maximum height in px. */
export const NEXUS_MOBILE_PANEL_MAX_HEIGHT_PX = 480;

/** Default compact panel height when nothing is persisted. */
export const NEXUS_MOBILE_PANEL_DEFAULT_HEIGHT = "30%";

/** Default compact panel height as a fraction of viewport height. */
export const NEXUS_MOBILE_PANEL_DEFAULT_HEIGHT_VH = 0.3;

/**
 * Resolve the default compact plugin panel open height in px.
 *
 * @param viewportHeight - Current viewport height in px.
 * @returns Clamped default open height in px.
 */
export function resolveMobilePanelDefaultOpenHeightPx(viewportHeight: number): number {
  return clampMobilePanelHeightPx(
    Math.round(viewportHeight * NEXUS_MOBILE_PANEL_DEFAULT_HEIGHT_VH),
    viewportHeight,
  );
}

/** Min/max sidebar width limits for the current viewport band. */
export interface SidebarWidthLimits {
  /** Left sidebar minimum width in px. */
  leftMin: number;
  /** Left sidebar maximum width in px. */
  leftMax: number;
  /** Right sidebar minimum width in px. */
  rightMin: number;
  /** Right sidebar maximum width in px. */
  rightMax: number;
}

/**
 * Resolve sidebar width limits for the current editor viewport width.
 *
 * @param viewportWidth - `window.innerWidth` or equivalent.
 * @returns Min/max pair for left and right sidebars.
 */
export function resolveSidebarWidthLimits(viewportWidth: number): SidebarWidthLimits {
  if (viewportWidth > PUCK_NARROW_DESKTOP_MAX_WIDTH) {
    return {
      leftMin: NEXUS_LEFT_SIDEBAR_MIN_WIDTH,
      leftMax: NEXUS_LEFT_SIDEBAR_MAX_WIDTH,
      rightMin: NEXUS_RIGHT_SIDEBAR_MIN_WIDTH,
      rightMax: NEXUS_RIGHT_SIDEBAR_MAX_WIDTH,
    };
  }

  if (viewportWidth > PUCK_TIGHT_DESKTOP_MAX_WIDTH) {
    return {
      leftMin: NEXUS_NARROW_LEFT_SIDEBAR_MIN_WIDTH,
      leftMax: NEXUS_NARROW_LEFT_SIDEBAR_MAX_WIDTH,
      rightMin: NEXUS_NARROW_RIGHT_SIDEBAR_MIN_WIDTH,
      rightMax: NEXUS_NARROW_RIGHT_SIDEBAR_MAX_WIDTH,
    };
  }

  if (viewportWidth > PUCK_COMPACT_EDITOR_MAX_WIDTH) {
    return {
      leftMin: NEXUS_TIGHT_LEFT_SIDEBAR_MIN_WIDTH,
      leftMax: NEXUS_TIGHT_LEFT_SIDEBAR_MAX_WIDTH,
      rightMin: NEXUS_TIGHT_RIGHT_SIDEBAR_MIN_WIDTH,
      rightMax: NEXUS_TIGHT_RIGHT_SIDEBAR_MAX_WIDTH,
    };
  }

  return {
    leftMin: NEXUS_LEFT_SIDEBAR_MIN_WIDTH,
    leftMax: NEXUS_LEFT_SIDEBAR_MAX_WIDTH,
    rightMin: NEXUS_RIGHT_SIDEBAR_MIN_WIDTH,
    rightMax: NEXUS_RIGHT_SIDEBAR_MAX_WIDTH,
  };
}

/**
 * Clamp a sidebar width to the allowed range.
 *
 * @param width - Candidate width in px.
 * @param min - Minimum allowed width in px.
 * @param max - Maximum allowed width in px.
 * @returns Clamped width in px.
 */
export function clampSidebarWidth(width: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, width));
}

/**
 * Compute the compact plugin panel maximum height for the current viewport.
 *
 * @param viewportHeight - `window.innerHeight` or equivalent.
 * @returns Maximum panel height in px.
 */
export function resolveMobilePanelMaxHeightPx(viewportHeight: number): number {
  return Math.min(
    Math.round(viewportHeight * NEXUS_MOBILE_PANEL_MAX_HEIGHT_VH),
    NEXUS_MOBILE_PANEL_MAX_HEIGHT_PX,
  );
}

/**
 * Clamp compact plugin panel height to Nexus limits.
 *
 * @param heightPx - Candidate height in px.
 * @param viewportHeight - Current viewport height for max resolution.
 * @returns Clamped height in px.
 */
export function clampMobilePanelHeightPx(heightPx: number, viewportHeight: number): number {
  const max = resolveMobilePanelMaxHeightPx(viewportHeight);
  return clampSidebarWidth(heightPx, NEXUS_MOBILE_PANEL_MIN_HEIGHT_PX, max);
}
