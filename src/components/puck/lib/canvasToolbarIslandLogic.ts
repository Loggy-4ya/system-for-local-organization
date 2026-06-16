/**
 * @fileoverview Mutual exclusivity helpers for compact canvas toolbar islands.
 *
 * History (undo/redo) and viewport preset choosers share one open-at-a-time rule on
 * mobile editor chrome.
 *
 * @module src/components/puck/lib/canvasToolbarIslandLogic
 * Tests: — (DOM helpers; covered by Playwright puck mobile panel specs)
 */

/** Document event fired when a canvas toolbar island expands. */
export const NEXUS_CANVAS_TOOLBAR_OPEN_EVENT = "nexus-canvas-toolbar-open";

/** Identifiers for the two compact canvas toolbar islands. */
export type CanvasToolbarIslandId = "history" | "viewport";

/**
 * Broadcast that a canvas toolbar island opened so peers can collapse.
 *
 * @param id - Island that opened.
 */
export function notifyCanvasToolbarOpen(id: CanvasToolbarIslandId): void {
  if (typeof document === "undefined") return;
  document.dispatchEvent(new CustomEvent(NEXUS_CANVAS_TOOLBAR_OPEN_EVENT, { detail: id }));
}

/**
 * Subscribe to canvas toolbar open notifications.
 *
 * @param onOpen - Called with the island id that opened.
 * @returns Teardown function.
 */
export function subscribeCanvasToolbarOpen(
  onOpen: (id: CanvasToolbarIslandId) => void,
): () => void {
  if (typeof document === "undefined") return () => undefined;

  const handler = (event: Event) => {
    const detail = (event as CustomEvent<CanvasToolbarIslandId>).detail;
    if (detail === "history" || detail === "viewport") {
      onOpen(detail);
    }
  };

  document.addEventListener(NEXUS_CANVAS_TOOLBAR_OPEN_EVENT, handler);
  return () => document.removeEventListener(NEXUS_CANVAS_TOOLBAR_OPEN_EVENT, handler);
}

/**
 * Whether Puck's full-screen viewport preset tray is expanded.
 *
 * @returns True when the viewport island is open.
 */
export function isViewportToolbarExpanded(): boolean {
  if (typeof document === "undefined") return false;
  return Boolean(
    document.querySelector(
      '[class*="ViewportControls--fullScreen"][class*="ViewportControls--isExpanded"]',
    ),
  );
}

/**
 * Collapse Puck's expanded viewport preset island by clicking its toggle.
 */
export function collapseViewportToolbarIsland(): void {
  if (typeof document === "undefined") return;

  const toggle = document.querySelector(
    '[class*="ViewportControls--fullScreen"][class*="ViewportControls--isExpanded"] [class*="ViewportControls-toggleButton_"]',
  ) as HTMLButtonElement | null;

  toggle?.click();
}
