/**
 * @fileoverview Keeps the live preview canvas scrollable while header chrome menus are open.
 *
 * @module src/components/global-layout/lib/useGlobalLayoutPreviewScroll
 */

import { useEffect, type RefObject } from "react";

/** CSS variable written on the preview frame for drawer height clipping. */
export const GLOBAL_LAYOUT_PREVIEW_VISIBLE_HEIGHT_VAR =
  "--global-layout-preview-visible-height";

/**
 * Returns the mobile nav scrollport when it can absorb a wheel gesture.
 *
 * @param target - Wheel event target.
 * @returns Scrollable panel element, or `null`.
 */
function getScrollableMobilePanel(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof Element)) {
    return null;
  }

  const panel = target.closest(".site-header-mobile-panel__scroll");
  if (!(panel instanceof HTMLElement)) {
    return null;
  }

  if (panel.scrollHeight <= panel.clientHeight + 1) {
    return null;
  }

  return panel;
}

/**
 * Whether a scrollable element can move further in the wheel direction.
 *
 * @param element - Scrollable element.
 * @param deltaY - Wheel delta on the Y axis.
 * @returns `true` when the element should consume the wheel event.
 */
function elementCanConsumeWheelScroll(element: HTMLElement, deltaY: number): boolean {
  if (deltaY < 0) {
    return element.scrollTop > 0;
  }

  if (deltaY > 0) {
    return element.scrollTop + element.clientHeight < element.scrollHeight - 1;
  }

  return false;
}

/**
 * Syncs the preview frame's visible height and forwards wheel events to the canvas
 * when header menus are open.
 *
 * @param canvasRef - Scrollable preview canvas element.
 * @param frameRef - Preview frame that scopes fixed header chrome.
 */
export function useGlobalLayoutPreviewScroll(
  canvasRef: RefObject<HTMLDivElement | null>,
  frameRef: RefObject<HTMLDivElement | null>,
): void {
  useEffect(() => {
    const canvas = canvasRef.current;
    const frame = frameRef.current;
    if (!canvas || !frame) {
      return undefined;
    }

    const syncVisibleHeight = () => {
      const frameRect = frame.getBoundingClientRect();
      const canvasRect = canvas.getBoundingClientRect();
      const visibleTop = Math.max(frameRect.top, canvasRect.top);
      const visibleBottom = Math.min(frameRect.bottom, canvasRect.bottom);
      const visibleHeight = Math.max(0, visibleBottom - visibleTop);

      frame.style.setProperty(
        GLOBAL_LAYOUT_PREVIEW_VISIBLE_HEIGHT_VAR,
        `${visibleHeight}px`,
      );
    };

    const onWheel = (event: WheelEvent) => {
      if (!(event.target instanceof Element)) {
        return;
      }

      if (event.target.closest('[data-slot="dropdown-menu-content"]')) {
        return;
      }

      if (!event.target.closest(".global-layout-preview-frame")) {
        return;
      }

      const mobilePanel = getScrollableMobilePanel(event.target);
      if (mobilePanel && elementCanConsumeWheelScroll(mobilePanel, event.deltaY)) {
        return;
      }

      canvas.scrollTop += event.deltaY;
      event.preventDefault();
    };

    syncVisibleHeight();
    canvas.addEventListener("scroll", syncVisibleHeight, { passive: true });
    canvas.addEventListener("wheel", onWheel, { capture: true, passive: false });
    window.addEventListener("resize", syncVisibleHeight);

    const observer = new ResizeObserver(syncVisibleHeight);
    observer.observe(frame);
    observer.observe(canvas);

    return () => {
      canvas.removeEventListener("scroll", syncVisibleHeight);
      canvas.removeEventListener("wheel", onWheel, { capture: true });
      window.removeEventListener("resize", syncVisibleHeight);
      observer.disconnect();
      frame.style.removeProperty(GLOBAL_LAYOUT_PREVIEW_VISIBLE_HEIGHT_VAR);
    };
  }, [canvasRef, frameRef]);
}

export default useGlobalLayoutPreviewScroll;
