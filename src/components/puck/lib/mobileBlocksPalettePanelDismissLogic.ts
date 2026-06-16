/**
 * @fileoverview Compact-mode Blocks palette drag — auto-dismiss plugin panel for canvas placement space.
 *
 * Only Blocks-tab **palette insert** drags close or yield screen space. Canvas taps, canvas
 * reparent drags, and Outline/Fields sidebar drags do not trigger this path.
 *
 * Tests: `tests/puck/lib/mobileBlocksPalettePanelDismissLogic.test.ts` — `npm run test:mobile-blocks-palette-dismiss`
 *
 * @module src/components/puck/lib/mobileBlocksPalettePanelDismissLogic
 */

/** Axis-aligned bounds of the compact plugin panel overlay. */
export interface MobilePluginPanelRect {
  /** Left edge in viewport coordinates. */
  left: number;
  /** Top edge in viewport coordinates. */
  top: number;
  /** Right edge in viewport coordinates. */
  right: number;
  /** Bottom edge in viewport coordinates. */
  bottom: number;
}

/** Default inset (px) before treating the pointer as outside the panel top edge. */
export const MOBILE_BLOCKS_PALETTE_PANEL_DISMISS_EDGE_TOLERANCE_PX = 4;

/** Root selector for Blocks drawer palette insert drags (excludes Outline/Fields/canvas). */
export const BLOCKS_PALETTE_DRAG_ROOT_SELECTOR =
  '.Puck [class*="Sidebar--left"] .nexus-blocks-plugin';

/**
 * Whether a viewport pointer lies outside the plugin panel rectangle.
 *
 * @param clientX - Pointer X in the parent window viewport.
 * @param clientY - Pointer Y in the parent window viewport.
 * @param panelRect - Measured panel bounds.
 * @param edgeTolerancePx - Inset applied on all edges before counting as outside.
 * @returns True when the pointer is outside the tolerated panel bounds.
 */
export function isPointerOutsideMobilePluginPanelBounds(
  clientX: number,
  clientY: number,
  panelRect: MobilePluginPanelRect,
  edgeTolerancePx = MOBILE_BLOCKS_PALETTE_PANEL_DISMISS_EDGE_TOLERANCE_PX,
): boolean {
  return (
    clientX < panelRect.left + edgeTolerancePx ||
    clientX > panelRect.right - edgeTolerancePx ||
    clientY < panelRect.top + edgeTolerancePx ||
    clientY > panelRect.bottom - edgeTolerancePx
  );
}

/**
 * Whether the Blocks plugin body is the active visible tab inside the left sidebar.
 *
 * @param doc - Editor shell document.
 * @returns True when `.nexus-blocks-plugin` is inside the visible plugin tab.
 */
export function readMobileBlocksTabActiveFromDocument(doc: Document): boolean {
  const sidebar = doc.querySelector('.Puck [class*="Sidebar--left"]');
  if (!sidebar) {
    return false;
  }

  const visibleTab = sidebar.querySelector('[class*="PuckPluginTab--visible"]');
  if (!visibleTab) {
    return false;
  }

  return visibleTab.querySelector(".nexus-blocks-plugin") !== null;
}

/**
 * Whether a Blocks drawer palette insert drag is active (scoped to `.nexus-blocks-plugin` only).
 *
 * @param parentDoc - Editor shell document.
 * @returns True while a Blocks palette item is being drafted toward the canvas.
 */
export function isBlocksPaletteDragActiveInParent(parentDoc: Document): boolean {
  const blocksRoot = parentDoc.querySelector(BLOCKS_PALETTE_DRAG_ROOT_SELECTOR);
  if (!blocksRoot) {
    return false;
  }

  return Boolean(
    blocksRoot.querySelector('[class*="DrawerItem--isDragging"]') ||
      blocksRoot.querySelector('[data-dnd-dragging][class*="DrawerItem"]'),
  );
}

/** Input for palette drag leave dismiss. */
export interface MobileBlocksPalettePanelDismissLeaveInput {
  /** Pointer X in the parent window viewport. */
  clientX: number;
  /** Pointer Y in the parent window viewport. */
  clientY: number;
  /** Measured plugin panel bounds, or null when unavailable. */
  panelRect: MobilePluginPanelRect | null;
  /** Puck `leftSideBarVisible` flag. */
  panelVisible: boolean;
  /** True when the Blocks bottom-rail tab body is active. */
  blocksTabActive: boolean;
  /** True while a Blocks drawer palette insert drag is active. */
  paletteDragActive: boolean;
  /** Latch — dismiss only once per palette drag session. */
  alreadyDismissedThisDrag: boolean;
  /** Optional per-edge tolerance before counting as outside. */
  edgeTolerancePx?: number;
}

/** Input for palette drag start dismiss. */
export interface MobileBlocksPalettePanelDismissStartInput {
  /** Puck `leftSideBarVisible` flag. */
  panelVisible: boolean;
  /** True while a Blocks drawer palette insert drag is active. */
  paletteDragActive: boolean;
  /** True when the Blocks bottom-rail tab body is active. */
  blocksTabActive: boolean;
}

/**
 * Whether the compact plugin panel should dismiss as soon as a Blocks palette insert drag begins.
 *
 * Touch-primary devices often fail to deliver shell `pointermove` while dnd-kit owns the gesture.
 *
 * @param input - Drag marker snapshot.
 * @returns True when {@link requestMobilePanelDismiss} should run.
 */
export function shouldRequestMobilePanelDismissOnPaletteDragStart(
  input: MobileBlocksPalettePanelDismissStartInput,
): boolean {
  return (
    input.panelVisible && input.paletteDragActive && input.blocksTabActive
  );
}

/**
 * Whether the compact plugin panel should dismiss during a Blocks palette drag once the pointer
 * leaves the panel overlay toward the canvas.
 *
 * @param input - Pointer, panel geometry, and drag/tab snapshot.
 * @returns True when {@link requestMobilePanelDismiss} should run.
 */
export function shouldRequestMobilePanelDismissOnBlocksPaletteDrag(
  input: MobileBlocksPalettePanelDismissLeaveInput,
): boolean {
  if (
    !input.panelVisible ||
    !input.blocksTabActive ||
    !input.paletteDragActive ||
    input.alreadyDismissedThisDrag ||
    !input.panelRect
  ) {
    return false;
  }

  return isPointerOutsideMobilePluginPanelBounds(
    input.clientX,
    input.clientY,
    input.panelRect,
    input.edgeTolerancePx,
  );
}
