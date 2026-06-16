"use client";

/**
 * @fileoverview Animate compact-mode plugin panel height when a bottom-rail tab opens.
 *
 * Puck toggles `leftSideBarVisible` instantly; this module eases the grid row from 0 to the
 * persisted (or default) height. Strict Mode cleanup and cancel paths always apply the target
 * height so the row never stays at 0px (black void).
 *
 * Tests: `tests/puck/lib/mobileEditorReachabilityLogic.test.ts` — `npm run test:mobile-editor-reachability`
 *
 * @module src/components/puck/NexusMobilePanelOpenAnimation
 */

import { useLayoutEffect, useEffect, useRef } from "react";
import {
  NEXUS_PANEL_OPEN_ANIMATION_MS,
  NEXUS_PANEL_OPENING_ATTR,
  animateMobilePanelHeight,
  applyMobilePanelHeight,
  beginMobilePanelLayoutMutation,
  cancelMobilePanelHeightAnimation,
  consumePendingDoubleTapFullOpen,
  endMobilePanelCloseSettling,
  endMobilePanelLayoutMutation,
  measureMobilePanelHeightPx,
  releaseMobilePanelSidebarForInteraction,
  resolveMobilePanelOpenHeightPx,
  scheduleMobilePanelHeightApply,
  shouldSkipMobilePanelOpenAnimation,
} from "@/components/puck/lib/mobilePanelLayout";
import {
  NEXUS_MOBILE_PANEL_HEIGHT_STORAGE_KEY,
  resolveMobilePanelMaxHeightPx,
} from "@/components/puck/lib/sidebarLayoutLimits";
import { recordMobileScrollportShellMetrics, syncCompactNavRailHeight } from "@/components/puck/lib/mobileScrollportGridFreeze";
import { useNexusPuck } from "@/components/puck/lib/useNexusPuck";
import { matchesCompactEditorViewport } from "@/components/puck/usePuckMobileEditorChrome";
import { matchesNarrowEditorViewport } from "@/components/puck/NexusCompactEditorAttr";

/**
 * Whether the viewport uses compact or narrow editor layout.
 *
 * @returns True when compact touch-primary media query matches or width is narrow.
 */
function isCompactOrNarrowViewport(): boolean {
  return matchesCompactEditorViewport() || matchesNarrowEditorViewport();
}

/**
 * Silent Puck child — animates compact plugin panel open height.
 *
 * @returns null
 */
export function NexusMobilePanelOpenAnimation() {
  const leftSideBarVisible = useNexusPuck((state) => state.appState.ui.leftSideBarVisible);
  const leftSideBarVisibleRef = useRef(leftSideBarVisible);
  const openSessionRef = useRef<number>(0);
  const animationCancelRef = useRef<(() => void) | null>(null);
  const scheduleCancelRef = useRef<(() => void) | null>(null);

  leftSideBarVisibleRef.current = leftSideBarVisible;

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;

    if (!leftSideBarVisible) {
      openSessionRef.current = 0;
      animationCancelRef.current?.();
      animationCancelRef.current = null;
      scheduleCancelRef.current?.();
      scheduleCancelRef.current = null;
      cancelMobilePanelHeightAnimation();
      document.documentElement.removeAttribute(NEXUS_PANEL_OPENING_ATTR);
      releaseMobilePanelSidebarForInteraction();
      recordMobileScrollportShellMetrics();
      return;
    }

    if (!isCompactOrNarrowViewport()) return;

    endMobilePanelCloseSettling();
    syncCompactNavRailHeight();

    // Snapshot backdrop alignment + defer header collapse before panel height writes.
    beginMobilePanelLayoutMutation();
    document.documentElement.setAttribute(NEXUS_PANEL_OPENING_ATTR, "");

    // Snap panel row to 0 before paint so persisted height cannot flash the panel background.
    applyMobilePanelHeight("0px");

    const openToMaxHeight = consumePendingDoubleTapFullOpen();
    const targetPx = openToMaxHeight
      ? resolveMobilePanelMaxHeightPx(window.innerHeight)
      : resolveMobilePanelOpenHeightPx(window.innerHeight);
    const currentPx = measureMobilePanelHeightPx() ?? 0;

    animationCancelRef.current?.();
    animationCancelRef.current = null;
    scheduleCancelRef.current?.();
    scheduleCancelRef.current = null;
    cancelMobilePanelHeightAnimation();

    const sessionId = Date.now();
    openSessionRef.current = sessionId;

    const ensureTargetHeight = () => {
      if (openSessionRef.current === sessionId) {
        scheduleCancelRef.current = scheduleMobilePanelHeightApply(`${targetPx}px`, {
          onApplied: () => {
            if (openSessionRef.current === sessionId) {
              if (openToMaxHeight) {
                localStorage.setItem(NEXUS_MOBILE_PANEL_HEIGHT_STORAGE_KEY, String(targetPx));
              }
              releaseMobilePanelSidebarForInteraction();
            }
          },
        });
      }
    };

    if (shouldSkipMobilePanelOpenAnimation(currentPx, targetPx)) {
      applyMobilePanelHeight(`${targetPx}px`);
      if (openToMaxHeight) {
        localStorage.setItem(NEXUS_MOBILE_PANEL_HEIGHT_STORAGE_KEY, String(targetPx));
      }
      document.documentElement.removeAttribute(NEXUS_PANEL_OPENING_ATTR);
      endMobilePanelLayoutMutation();
      releaseMobilePanelSidebarForInteraction();
      ensureTargetHeight();
      return () => {
        if (leftSideBarVisibleRef.current && openSessionRef.current === sessionId) {
          applyMobilePanelHeight(`${targetPx}px`);
          releaseMobilePanelSidebarForInteraction();
        }
      };
    }

    animationCancelRef.current = animateMobilePanelHeight(
      0,
      targetPx,
      NEXUS_PANEL_OPEN_ANIMATION_MS,
      {
        htmlAttr: NEXUS_PANEL_OPENING_ATTR,
        onComplete: () => {
          animationCancelRef.current = null;
          ensureTargetHeight();
          releaseMobilePanelSidebarForInteraction();
        },
      },
    );

    return () => {
      animationCancelRef.current?.();
      animationCancelRef.current = null;
      scheduleCancelRef.current?.();
      scheduleCancelRef.current = null;

      if (leftSideBarVisibleRef.current && openSessionRef.current === sessionId) {
        applyMobilePanelHeight(`${targetPx}px`);
        releaseMobilePanelSidebarForInteraction();
      }
    };
  }, [leftSideBarVisible]);

  useEffect(() => {
    return () => {
      animationCancelRef.current?.();
      scheduleCancelRef.current?.();
      cancelMobilePanelHeightAnimation();
    };
  }, []);

  return null;
}

export default NexusMobilePanelOpenAnimation;
