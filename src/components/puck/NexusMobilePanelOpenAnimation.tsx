"use client";

/**
 * @fileoverview Animate compact-mode plugin panel height when a bottom-rail tab opens.
 *
 * Puck toggles `leftSideBarVisible` instantly; this module eases the panel from 0px
 * to the persisted (or default) height so open matches the close animation feel.
 *
 * @module src/components/puck/NexusMobilePanelOpenAnimation
 */

import { useLayoutEffect, useEffect, useRef } from "react";
import {
  animateMobilePanelHeight,
  cancelMobilePanelHeightAnimation,
  measureMobilePanelHeightPx,
  NEXUS_PANEL_OPEN_ANIMATION_MS,
  NEXUS_PANEL_OPENING_ATTR,
  prepareMobilePanelOpenAnimation,
  resolveMobilePanelOpenHeightPx,
  endMobilePanelLayoutMutation,
} from "@/components/puck/lib/mobilePanelLayout";
import { useNexusPuck } from "@/components/puck/lib/useNexusPuck";
import { PUCK_COMPACT_EDITOR_MAX_WIDTH } from "@/components/puck/usePuckMobileEditorChrome";

/**
 * Whether the viewport uses compact editor chrome.
 *
 * @returns True at or below {@link PUCK_COMPACT_EDITOR_MAX_WIDTH}.
 */
function isCompactViewport(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia(`(max-width: ${PUCK_COMPACT_EDITOR_MAX_WIDTH}px)`).matches;
}

/**
 * Silent Puck child — eases compact plugin panel open height.
 *
 * @returns null
 */
export function NexusMobilePanelOpenAnimation() {
  const leftSideBarVisible = useNexusPuck((state) => state.appState.ui.leftSideBarVisible);
  const previousVisibleRef = useRef(leftSideBarVisible);
  const animationCancelRef = useRef<(() => void) | null>(null);

  useLayoutEffect(() => {
    const wasVisible = previousVisibleRef.current;

    if (typeof window === "undefined" || !isCompactViewport()) return;
    if (!leftSideBarVisible || wasVisible) return;

    prepareMobilePanelOpenAnimation();
  }, [leftSideBarVisible]);

  useEffect(() => {
    const wasVisible = previousVisibleRef.current;
    previousVisibleRef.current = leftSideBarVisible;

    if (typeof window === "undefined" || !isCompactViewport()) return;

    animationCancelRef.current?.();
    animationCancelRef.current = null;
    cancelMobilePanelHeightAnimation();
    document.documentElement.removeAttribute(NEXUS_PANEL_OPENING_ATTR);

    if (!leftSideBarVisible || wasVisible) return;

    const targetHeightPx = resolveMobilePanelOpenHeightPx(window.innerHeight);
    const measuredHeightPx = measureMobilePanelHeightPx();

    if (measuredHeightPx !== undefined && measuredHeightPx >= targetHeightPx * 0.85) {
      endMobilePanelLayoutMutation();
      return;
    }

    animationCancelRef.current = animateMobilePanelHeight(
      0,
      targetHeightPx,
      NEXUS_PANEL_OPEN_ANIMATION_MS,
      {
        htmlAttr: NEXUS_PANEL_OPENING_ATTR,
        onComplete: () => {
          animationCancelRef.current = null;
        },
      },
    );

    return () => {
      animationCancelRef.current?.();
      animationCancelRef.current = null;
      cancelMobilePanelHeightAnimation();
      document.documentElement.removeAttribute(NEXUS_PANEL_OPENING_ATTR);
    };
  }, [leftSideBarVisible]);

  return null;
}

export default NexusMobilePanelOpenAnimation;
