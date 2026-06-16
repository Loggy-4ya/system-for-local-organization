"use client";

/**
 * @fileoverview Compact-mode Blocks palette drag — auto-close plugin panel for placement space.
 *
 * Closes the slide-up settings panel only while drafting a block from the Blocks tab toward
 * the canvas. Canvas taps, canvas reparent drags, and Outline/Fields interactions are ignored.
 *
 * Tests: `tests/puck/lib/mobileBlocksPalettePanelDismissLogic.test.ts` — `npm run test:mobile-blocks-palette-dismiss`
 *
 * @module src/components/puck/NexusMobileBlocksPalettePanelDismiss
 */

import { useEffect, useRef } from "react";
import {
  BLOCKS_PALETTE_DRAG_ROOT_SELECTOR,
  isBlocksPaletteDragActiveInParent,
  readMobileBlocksTabActiveFromDocument,
  shouldRequestMobilePanelDismissOnBlocksPaletteDrag,
  shouldRequestMobilePanelDismissOnPaletteDragStart,
  type MobilePluginPanelRect,
} from "@/components/puck/lib/mobileBlocksPalettePanelDismissLogic";
import {
  measureMobilePanelHeightPx,
  requestMobilePanelDismiss,
  resolveLeftSidebar,
} from "@/components/puck/lib/mobilePanelLayout";
import { useNexusPuck } from "@/components/puck/lib/useNexusPuck";
import { usePuckMobileEditorChrome } from "@/components/puck/usePuckMobileEditorChrome";

/** Capture-phase move listeners — must run while dnd-kit owns the palette drag gesture. */
const MOVE_LISTENER_OPTIONS: AddEventListenerOptions = { capture: true, passive: true };

/**
 * Measure the compact plugin panel bounds in parent viewport coordinates.
 *
 * @returns Panel rectangle or null when the sidebar is not mounted.
 */
function measureMobilePluginPanelRect(): MobilePluginPanelRect | null {
  const rect = resolveLeftSidebar()?.getBoundingClientRect();
  if (!rect) {
    return null;
  }

  return {
    left: rect.left,
    top: rect.top,
    right: rect.right,
    bottom: rect.bottom,
  };
}

/**
 * Silent Puck child — dismisses the compact plugin panel during Blocks palette insert drags.
 *
 * @returns null
 */
export function NexusMobileBlocksPalettePanelDismiss(): null {
  const isCompactEditor = usePuckMobileEditorChrome();
  const leftSideBarVisible = useNexusPuck((state) => state.appState.ui.leftSideBarVisible);
  const leftSideBarVisibleRef = useRef(leftSideBarVisible);
  const dismissedLatchRef = useRef(false);

  leftSideBarVisibleRef.current = leftSideBarVisible;

  useEffect(() => {
    if (typeof document === "undefined" || !isCompactEditor) {
      return;
    }

    const resetDismissLatch = () => {
      dismissedLatchRef.current = false;
    };

    const dismissPanelIfNeeded = () => {
      requestMobilePanelDismiss({ lastHeightPx: measureMobilePanelHeightPx() });
    };

    const readPaletteDragSnapshot = () => ({
      paletteDragActive: isBlocksPaletteDragActiveInParent(document),
      blocksTabActive: readMobileBlocksTabActiveFromDocument(document),
    });

    const evaluatePaletteDragStartDismiss = () => {
      if (!leftSideBarVisibleRef.current || dismissedLatchRef.current) {
        return;
      }

      const { paletteDragActive, blocksTabActive } = readPaletteDragSnapshot();
      const shouldDismiss = shouldRequestMobilePanelDismissOnPaletteDragStart({
        panelVisible: leftSideBarVisibleRef.current,
        paletteDragActive,
        blocksTabActive,
      });

      if (!shouldDismiss) {
        return;
      }

      dismissedLatchRef.current = true;
      dismissPanelIfNeeded();
    };

    const evaluatePaletteDragLeaveDismiss = (clientX: number, clientY: number) => {
      if (!leftSideBarVisibleRef.current) {
        resetDismissLatch();
        return;
      }

      const { paletteDragActive, blocksTabActive } = readPaletteDragSnapshot();
      if (!paletteDragActive) {
        resetDismissLatch();
        return;
      }

      const shouldDismiss = shouldRequestMobilePanelDismissOnBlocksPaletteDrag({
        clientX,
        clientY,
        panelRect: measureMobilePluginPanelRect(),
        panelVisible: leftSideBarVisibleRef.current,
        blocksTabActive,
        paletteDragActive,
        alreadyDismissedThisDrag: dismissedLatchRef.current,
      });

      if (!shouldDismiss) {
        return;
      }

      dismissedLatchRef.current = true;
      dismissPanelIfNeeded();
    };

    const onPointerMove = (event: PointerEvent) => {
      evaluatePaletteDragLeaveDismiss(event.clientX, event.clientY);
    };

    const onTouchMove = (event: TouchEvent) => {
      const touch = event.touches[0] ?? event.changedTouches[0];
      if (!touch) {
        return;
      }

      evaluatePaletteDragStartDismiss();
      evaluatePaletteDragLeaveDismiss(touch.clientX, touch.clientY);
    };

    const onGestureEnd = () => {
      resetDismissLatch();
    };

    const dragMarkerObserver =
      typeof MutationObserver !== "undefined"
        ? new MutationObserver(() => {
            evaluatePaletteDragStartDismiss();
          })
        : null;

    const observeBlocksPaletteRoot = () => {
      if (!dragMarkerObserver) {
        return;
      }

      dragMarkerObserver.disconnect();

      const blocksRoot = document.querySelector(BLOCKS_PALETTE_DRAG_ROOT_SELECTOR);
      if (!blocksRoot) {
        return;
      }

      dragMarkerObserver.observe(blocksRoot, {
        attributes: true,
        subtree: true,
        attributeFilter: ["class", "data-dnd-dragging"],
      });
    };

    observeBlocksPaletteRoot();

    const mountObserver =
      typeof MutationObserver !== "undefined"
        ? new MutationObserver(() => {
            observeBlocksPaletteRoot();
          })
        : null;

    const puckRoot = document.querySelector(".Puck");
    if (mountObserver && puckRoot) {
      mountObserver.observe(puckRoot, { childList: true, subtree: true });
    }

    window.addEventListener("pointermove", onPointerMove, MOVE_LISTENER_OPTIONS);
    window.addEventListener("touchmove", onTouchMove, MOVE_LISTENER_OPTIONS);
    window.addEventListener("pointerup", onGestureEnd, MOVE_LISTENER_OPTIONS);
    window.addEventListener("pointercancel", onGestureEnd, MOVE_LISTENER_OPTIONS);
    window.addEventListener("touchend", onGestureEnd, MOVE_LISTENER_OPTIONS);
    window.addEventListener("touchcancel", onGestureEnd, MOVE_LISTENER_OPTIONS);

    return () => {
      dragMarkerObserver?.disconnect();
      mountObserver?.disconnect();

      window.removeEventListener("pointermove", onPointerMove, MOVE_LISTENER_OPTIONS);
      window.removeEventListener("touchmove", onTouchMove, MOVE_LISTENER_OPTIONS);
      window.removeEventListener("pointerup", onGestureEnd, MOVE_LISTENER_OPTIONS);
      window.removeEventListener("pointercancel", onGestureEnd, MOVE_LISTENER_OPTIONS);
      window.removeEventListener("touchend", onGestureEnd, MOVE_LISTENER_OPTIONS);
      window.removeEventListener("touchcancel", onGestureEnd, MOVE_LISTENER_OPTIONS);
      dismissedLatchRef.current = false;
    };
  }, [isCompactEditor, leftSideBarVisible]);

  return null;
}

export default NexusMobileBlocksPalettePanelDismiss;
