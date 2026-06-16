"use client";

/**
 * @fileoverview Keeps the desktop right fields column closed on narrow editor viewports.
 *
 * Puck's default `fieldsPlugin()` still mounts a right `FieldSideBar` when the viewport
 * is ≥638px (landscape phones, docked DevTools). Closing the mobile settings panel only
 * toggles `leftSideBarVisible`, so the right strip can linger and block the canvas.
 *
 * @module src/components/puck/NexusCompactRightSidebarGuard
 */

import { useEffect } from "react";
import { useGetPuck } from "@puckeditor/core";
import { resetCompactPanelChromeAfterClose } from "@/components/puck/lib/mobilePanelLayout";
import { NEXUS_NARROW_EDITOR_MAX_WIDTH } from "@/components/puck/lib/sidebarLayoutLimits";
import { useNexusPuck } from "@/components/puck/lib/useNexusPuck";
import { matchesNarrowEditorViewport } from "@/components/puck/NexusCompactEditorAttr";

/**
 * Whether narrow-editor layout fixes should apply right now.
 *
 * @returns True when the viewport width is at most {@link NEXUS_NARROW_EDITOR_MAX_WIDTH}.
 */
function isNarrowEditorViewport(): boolean {
  return matchesNarrowEditorViewport();
}

/**
 * Silent Puck child — closes the desktop right sidebar on narrow editor viewports.
 *
 * @returns null
 */
export function NexusCompactRightSidebarGuard() {
  const leftSideBarVisible = useNexusPuck(
    (state) => state.appState.ui.leftSideBarVisible,
  );
  const rightSideBarVisible = useNexusPuck(
    (state) => state.appState.ui.rightSideBarVisible ?? false,
  );
  const getPuck = useGetPuck();

  const closeRightSidebar = () => {
    const { appState, dispatch } = getPuck();
    const ui = appState.ui;

    if (!ui.rightSideBarVisible && ui.rightSideBarWidth === 0) {
      return;
    }

    dispatch({
      type: "setUi",
      ui: {
        rightSideBarVisible: false,
        rightSideBarWidth: 0,
      },
      recordHistory: false,
    });
  };

  useEffect(() => {
    if (!isNarrowEditorViewport()) return;
    closeRightSidebar();
  }, [getPuck, rightSideBarVisible]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const syncNarrowSidebar = () => {
      if (window.innerWidth > NEXUS_NARROW_EDITOR_MAX_WIDTH) return;
      closeRightSidebar();
    };

    syncNarrowSidebar();
    window.addEventListener("resize", syncNarrowSidebar);

    return () => window.removeEventListener("resize", syncNarrowSidebar);
  }, [getPuck]);

  useEffect(() => {
    if (leftSideBarVisible || !isNarrowEditorViewport()) return;

    resetCompactPanelChromeAfterClose();
    closeRightSidebar();
  }, [getPuck, leftSideBarVisible]);

  return null;
}

export default NexusCompactRightSidebarGuard;
