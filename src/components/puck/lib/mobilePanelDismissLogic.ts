/**
 * @fileoverview Pure logic for compact-mode plugin panel swipe-to-dismiss during vertical drag.
 *
 * When the user drags the panel top handle downward past the normal resize minimum,
 * height may follow the pointer down to zero. On release, a dismiss threshold decides
 * whether the panel closes or snaps back to the minimum height.
 *
 * Tests: `tests/puck/lib/mobilePanelDismissLogic.test.ts` — `npm run test:mobile-panel-dismiss`
 *
 * @module src/components/puck/lib/mobilePanelDismissLogic
 */

import {
  clampMobilePanelHeightPx,
  NEXUS_MOBILE_PANEL_MIN_HEIGHT_PX,
  resolveMobilePanelMaxHeightPx,
} from "@/components/puck/lib/sidebarLayoutLimits";

/** Absolute height (px) at or below which a downward drag release closes the panel. */
export const NEXUS_MOBILE_PANEL_DISMISS_THRESHOLD_PX = 120;

/** Fraction of drag-start height used as an alternate dismiss threshold (whichever is lower). */
export const NEXUS_MOBILE_PANEL_DISMISS_RATIO = 0.35;

/**
 * Resolve the dismiss threshold for a drag that started at {@link startHeightPx}.
 *
 * @param startHeightPx - Panel height when the drag began.
 * @returns Height in px at or below which release should close the panel.
 */
export function resolveMobilePanelDismissThresholdPx(startHeightPx: number): number {
  const ratioThreshold = Math.round(Math.max(0, startHeightPx) * NEXUS_MOBILE_PANEL_DISMISS_RATIO);
  return Math.min(NEXUS_MOBILE_PANEL_DISMISS_THRESHOLD_PX, ratioThreshold);
}

/**
 * Resolve panel height while the user drags the top resize handle.
 *
 * Upward drags respect the normal min/max clamp. Downward drags may shrink below the
 * minimum resize height so the panel can slide off screen before release.
 *
 * @param startHeightPx - Panel height when the drag began.
 * @param pointerDeltaY - Vertical pointer delta (`startY - clientY`; positive = grow).
 * @param viewportHeight - Current viewport height for max resolution.
 * @returns Next panel height in px.
 */
export function resolveMobilePanelDragHeightPx(
  startHeightPx: number,
  pointerDeltaY: number,
  viewportHeight: number,
): number {
  const max = resolveMobilePanelMaxHeightPx(viewportHeight);
  const raw = startHeightPx + pointerDeltaY;

  if (raw >= startHeightPx) {
    return clampMobilePanelHeightPx(raw, viewportHeight);
  }

  return Math.max(0, Math.min(max, raw));
}

/**
 * Whether a drag release should dismiss (close) the panel instead of snapping to min height.
 *
 * @param lastHeightPx - Panel height at pointer release.
 * @param startHeightPx - Panel height when the drag began.
 * @returns True when the panel should animate closed.
 */
export function shouldDismissMobilePanelOnDragEnd(
  lastHeightPx: number,
  startHeightPx: number,
): boolean {
  return lastHeightPx <= resolveMobilePanelDismissThresholdPx(startHeightPx);
}

/**
 * Resolve the settled height after a non-dismiss drag release.
 *
 * Heights below the resize minimum snap back to {@link NEXUS_MOBILE_PANEL_MIN_HEIGHT_PX};
 * otherwise the value is clamped to the normal min/max band.
 *
 * @param lastHeightPx - Panel height at pointer release.
 * @param viewportHeight - Current viewport height for max resolution.
 * @returns Settled panel height in px to persist.
 */
export function resolveMobilePanelDragSettleHeightPx(
  lastHeightPx: number,
  viewportHeight: number,
): number {
  if (lastHeightPx < NEXUS_MOBILE_PANEL_MIN_HEIGHT_PX) {
    return NEXUS_MOBILE_PANEL_MIN_HEIGHT_PX;
  }

  return clampMobilePanelHeightPx(lastHeightPx, viewportHeight);
}
