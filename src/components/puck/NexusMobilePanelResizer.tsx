"use client";

/**
 * @fileoverview Vertical drag resize for the compact-mode Puck plugin panel.
 *
 * @module src/components/puck/NexusMobilePanelResizer
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  applyMobilePanelHeight,
  beginMobilePanelLayoutMutation,
  clearCompactPanelSidebarLayout,
  endMobilePanelLayoutMutation,
  measureMobilePanelHeightPx,
  NEXUS_PANEL_CLOSING_ATTR,
  NEXUS_PANEL_COLLAPSING_ATTR,
  NEXUS_PANEL_EXPANDING_ATTR,
  resetCompactPanelSidebarScroll,
  resolveLayoutInner,
  resolveLeftSidebar,
  restorePersistedPanelHeight,
  syncCompactPanelSidebarLayout,
} from "@/components/puck/lib/mobilePanelLayout";
import {
  clampMobilePanelHeightPx,
  NEXUS_MOBILE_PANEL_HEIGHT_STORAGE_KEY,
  NEXUS_PANEL_RESIZING_ATTR,
  resolveMobilePanelMaxHeightPx,
} from "@/components/puck/lib/sidebarLayoutLimits";
import { useNexusPuck } from "@/components/puck/lib/useNexusPuck";
import {
  PUCK_COMPACT_EDITOR_MAX_WIDTH,
  usePuckMobileEditorChrome,
} from "@/components/puck/usePuckMobileEditorChrome";

/**
 * Compact-mode plugin panel vertical resizer and maximize/minimize snap helper.
 *
 * @returns Portaled drag handle or null.
 */
export function NexusMobilePanelResizer() {
  const isCompactEditor = usePuckMobileEditorChrome();
  const leftSideBarVisible = useNexusPuck((state) => state.appState.ui.leftSideBarVisible);
  const mobilePanelExpanded = useNexusPuck(
    (state) => state.appState.ui.mobilePanelExpanded ?? false,
  );
  const [handleMount, setHandleMount] = useState<HTMLElement | null>(null);
  const dragRef = useRef<{ startY: number; startHeight: number; lastHeight: number } | null>(null);
  const dragFrameRef = useRef<number | null>(null);
  const expandedRef = useRef(mobilePanelExpanded);

  useEffect(() => {
    if (!isCompactEditor || typeof window === "undefined") return;

    restorePersistedPanelHeight();

    const media = window.matchMedia(`(max-width: ${PUCK_COMPACT_EDITOR_MAX_WIDTH}px)`);
    const onBreakpointChange = () => restorePersistedPanelHeight();
    media.addEventListener("change", onBreakpointChange);

    return () => media.removeEventListener("change", onBreakpointChange);
  }, [isCompactEditor]);

  useEffect(() => {
    if (!isCompactEditor || !leftSideBarVisible) {
      setHandleMount(null);
      return;
    }

    const syncHandle = () => {
      const sidebar = resolveLeftSidebar();
      if (!sidebar) {
        setHandleMount(null);
        return;
      }

      let host = sidebar.querySelector<HTMLElement>(".nexus-mobile-panel-resize-host");
      if (!host) {
        host = document.createElement("div");
        host.className = "nexus-mobile-panel-resize-host";
        sidebar.prepend(host);
      }

      setHandleMount(host);
    };

    syncHandle();

    const observer = new MutationObserver(syncHandle);
    const layout = resolveLayoutInner();
    if (layout) {
      observer.observe(layout, { attributes: true, childList: true, subtree: true });
    }

    return () => {
      observer.disconnect();
      document.querySelectorAll(".nexus-mobile-panel-resize-host").forEach((node) => node.remove());
      setHandleMount(null);
    };
  }, [isCompactEditor, leftSideBarVisible]);

  useEffect(() => {
    if (!isCompactEditor || !leftSideBarVisible) return;
    if (expandedRef.current === mobilePanelExpanded) return;

    expandedRef.current = mobilePanelExpanded;

    if (typeof window === "undefined") return;

    if (mobilePanelExpanded) {
      if (document.documentElement.hasAttribute(NEXUS_PANEL_EXPANDING_ATTR)) {
        return;
      }

      const max = resolveMobilePanelMaxHeightPx(window.innerHeight);
      const current = measureMobilePanelHeightPx();
      if (current !== undefined && Math.abs(current - max) <= 8) {
        localStorage.setItem(NEXUS_MOBILE_PANEL_HEIGHT_STORAGE_KEY, String(max));
        return;
      }

      applyMobilePanelHeight(`${max}px`);
      localStorage.setItem(NEXUS_MOBILE_PANEL_HEIGHT_STORAGE_KEY, String(max));
      return;
    }

    if (document.documentElement.hasAttribute(NEXUS_PANEL_CLOSING_ATTR)) {
      return;
    }

    if (
      document.documentElement.hasAttribute(NEXUS_PANEL_COLLAPSING_ATTR) ||
      document.documentElement.hasAttribute(NEXUS_PANEL_EXPANDING_ATTR)
    ) {
      return;
    }
  }, [isCompactEditor, leftSideBarVisible, mobilePanelExpanded]);

  const endDrag = useCallback(() => {
    if (dragFrameRef.current !== null) {
      cancelAnimationFrame(dragFrameRef.current);
      dragFrameRef.current = null;
    }

    if (!dragRef.current || typeof window === "undefined") return;

    const { lastHeight } = dragRef.current;
    dragRef.current = null;
    document.documentElement.removeAttribute(NEXUS_PANEL_RESIZING_ATTR);
    endMobilePanelLayoutMutation();
    clearCompactPanelSidebarLayout();
    resetCompactPanelSidebarScroll();

    const clamped = clampMobilePanelHeightPx(lastHeight, window.innerHeight);
    applyMobilePanelHeight(`${clamped}px`);
    localStorage.setItem(NEXUS_MOBILE_PANEL_HEIGHT_STORAGE_KEY, String(clamped));
  }, []);

  const onPointerMove = useCallback((event: PointerEvent) => {
    const drag = dragRef.current;
    if (!drag || typeof window === "undefined") return;

    const delta = drag.startY - event.clientY;
    const next = clampMobilePanelHeightPx(drag.startHeight + delta, window.innerHeight);
    if (next === drag.lastHeight) {
      event.preventDefault();
      return;
    }

    drag.lastHeight = next;

    if (dragFrameRef.current !== null) {
      event.preventDefault();
      return;
    }

    dragFrameRef.current = requestAnimationFrame(() => {
      dragFrameRef.current = null;
      const activeDrag = dragRef.current;
      if (!activeDrag) return;
      applyMobilePanelHeight(`${activeDrag.lastHeight}px`);
      syncCompactPanelSidebarLayout();
    });

    event.preventDefault();
  }, []);

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      if (event.button !== 0 || typeof window === "undefined") return;

      const height = measureMobilePanelHeightPx();
      if (height === undefined) return;

      dragRef.current = {
        startY: event.clientY,
        startHeight: height,
        lastHeight: height,
      };

      document.documentElement.setAttribute(NEXUS_PANEL_RESIZING_ATTR, "");
      beginMobilePanelLayoutMutation();
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);

      const handlePointerMove = (moveEvent: PointerEvent) => onPointerMove(moveEvent);
      const handlePointerEnd = () => {
        document.removeEventListener("pointermove", handlePointerMove);
        document.removeEventListener("pointerup", handlePointerEnd);
        document.removeEventListener("pointercancel", handlePointerEnd);
        endDrag();
      };

      document.addEventListener("pointermove", handlePointerMove);
      document.addEventListener("pointerup", handlePointerEnd);
      document.addEventListener("pointercancel", handlePointerEnd);
    },
    [endDrag, onPointerMove],
  );

  if (!isCompactEditor || !leftSideBarVisible || !handleMount) {
    return null;
  }

  return createPortal(
    <button
      type="button"
      className="nexus-mobile-panel-resize-handle"
      aria-label="Resize plugin panel"
      title="Drag to resize panel"
      onPointerDown={onPointerDown}
    />,
    handleMount,
  );
}

export default NexusMobilePanelResizer;
