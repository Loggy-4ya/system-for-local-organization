"use client";

/**
 * @fileoverview Compact-mode nav tab gestures — double-tap toggle, single-tap close.
 *
 * Replaces Puck's maximize button on the bottom plugin rail. Double-tapping the
 * active tab expands the panel to max height or restores the pre-expand height;
 * single-tapping closes it with animation.
 *
 * Tests: `tests/puck/lib/mobileNavPanelGestureLogic.test.ts` — `npm run test:mobile-nav-gestures`
 *
 * @module src/components/puck/NexusMobileNavPanelGestures
 */

import { useEffect, useRef } from "react";
import {
  createMobileNavTapState,
  isPrimaryPointerTap,
  isPrimaryTouchTap,
  MOBILE_NAV_SINGLE_TAP_DEFER_MS,
  processMobileNavTap,
  recordNavPointerDown,
  resolveActiveNavLink,
  resolveMobileNavPanelToggle,
  resolveNavLinkFromTarget,
  shouldBlockActiveNavTab,
  type MobileNavTapState,
} from "@/components/puck/lib/mobileNavPanelGestureLogic";
import {
  animateMobilePanelHeight,
  cancelMobilePanelHeightAnimation,
  measureMobilePanelHeightPx,
  NEXUS_PANEL_CLOSE_ANIMATION_MS,
  NEXUS_PANEL_CLOSING_ATTR,
  NEXUS_PANEL_COLLAPSING_ATTR,
  NEXUS_PANEL_EXPAND_ANIMATION_MS,
  NEXUS_PANEL_EXPANDING_ATTR,
  resolvePreExpandPanelHeightPx,
  restorePersistedPanelHeight,
  savePreExpandPanelHeight,
} from "@/components/puck/lib/mobilePanelLayout";
import {
  NEXUS_MOBILE_PANEL_HEIGHT_STORAGE_KEY,
  resolveMobilePanelMaxHeightPx,
} from "@/components/puck/lib/sidebarLayoutLimits";
import { useNexusPuck } from "@/components/puck/lib/useNexusPuck";
import { PUCK_COMPACT_EDITOR_MAX_WIDTH } from "@/components/puck/usePuckMobileEditorChrome";

/** Passive flag for touch listeners that call `preventDefault` (blocks synthetic click). */
const NAV_TOUCH_LISTENER_OPTIONS: AddEventListenerOptions = { capture: true, passive: false };

/** Capture-phase pointer/click listeners that may call `preventDefault`. */
const NAV_POINTER_LISTENER_OPTIONS: AddEventListenerOptions = { capture: true, passive: false };

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
 * Whether an event target lies inside the Puck bottom nav rail.
 *
 * @param target - Event target.
 * @returns True when the event originated from the compact nav rail.
 */
function isNavRailTarget(target: EventTarget | null): boolean {
  if (!target || typeof (target as HTMLElement).closest !== "function") return false;
  return Boolean((target as HTMLElement).closest('.Puck [class*="PuckLayout-nav"]'));
}

/**
 * Resolve the active compact nav tab link element in the DOM.
 *
 * @returns Active `NavItem-link` div or null.
 */
function queryActiveNavLink(): HTMLElement | null {
  if (typeof document === "undefined") return null;

  const link = document.querySelector(
    '.Puck [class*="NavItem--active"] > [class*="NavItem-link"]',
  ) as HTMLElement | null;

  if (!link) return null;

  if (!link.dataset.nexusNavLinkId) {
    link.dataset.nexusNavLinkId = link.textContent?.trim() ?? "nav-link";
  }

  return link;
}

/**
 * Compact-mode nav tab gesture handler for panel expand/close.
 *
 * @returns null
 */
export function NexusMobileNavPanelGestures() {
  const dispatch = useNexusPuck((state) => state.dispatch);
  const leftSideBarVisible = useNexusPuck((state) => state.appState.ui.leftSideBarVisible);
  const mobilePanelExpanded = useNexusPuck(
    (state) => state.appState.ui.mobilePanelExpanded ?? false,
  );
  const leftSideBarVisibleRef = useRef(leftSideBarVisible);
  const mobilePanelExpandedRef = useRef(mobilePanelExpanded);
  const preExpandHeightRef = useRef<number | null>(null);
  const closingRef = useRef(false);
  const animatingRef = useRef(false);
  const singleTapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animationCancelRef = useRef<(() => void) | null>(null);
  const tapStateRef = useRef<MobileNavTapState>(createMobileNavTapState());

  useEffect(() => {
    leftSideBarVisibleRef.current = leftSideBarVisible;
  }, [leftSideBarVisible]);

  useEffect(() => {
    if (!animatingRef.current) {
      mobilePanelExpandedRef.current = mobilePanelExpanded;
    }
  }, [mobilePanelExpanded]);

  useEffect(() => {
    if (typeof document === "undefined") return;

    const clearSingleTapTimer = () => {
      if (singleTapTimerRef.current !== null) {
        clearTimeout(singleTapTimerRef.current);
        singleTapTimerRef.current = null;
      }
    };

    const clearAnimation = () => {
      animationCancelRef.current?.();
      animationCancelRef.current = null;
      cancelMobilePanelHeightAnimation();
      animatingRef.current = false;
    };

    const finishPanelClose = () => {
      closingRef.current = false;
      animatingRef.current = false;

      requestAnimationFrame(() => {
        dispatch({
          type: "setUi",
          ui: {
            leftSideBarVisible: false,
            mobilePanelExpanded: false,
          },
        });
      });
    };

    const animatePanelClose = () => {
      if (closingRef.current || animatingRef.current || !leftSideBarVisibleRef.current) return;

      const startHeight = measureMobilePanelHeightPx();
      if (startHeight === undefined) {
        finishPanelClose();
        return;
      }

      closingRef.current = true;
      animatingRef.current = true;
      clearAnimation();
      animatingRef.current = true;

      animationCancelRef.current = animateMobilePanelHeight(
        startHeight,
        0,
        NEXUS_PANEL_CLOSE_ANIMATION_MS,
        {
          htmlAttr: NEXUS_PANEL_CLOSING_ATTR,
          onComplete: () => {
            animationCancelRef.current = null;
            finishPanelClose();
          },
        },
      );
    };

    const animatePanelExpandToMax = (startHeight: number, maxHeight: number) => {
      animatingRef.current = true;
      clearAnimation();
      animatingRef.current = true;
      mobilePanelExpandedRef.current = true;

      animationCancelRef.current = animateMobilePanelHeight(
        startHeight,
        maxHeight,
        NEXUS_PANEL_EXPAND_ANIMATION_MS,
        {
          htmlAttr: NEXUS_PANEL_EXPANDING_ATTR,
          onComplete: () => {
            animationCancelRef.current = null;
            animatingRef.current = false;
            localStorage.setItem(NEXUS_MOBILE_PANEL_HEIGHT_STORAGE_KEY, String(maxHeight));
            dispatch({
              type: "setUi",
              ui: { mobilePanelExpanded: true },
            });
          },
        },
      );
    };

    const animatePanelCollapseFromMax = (startHeight: number, restoreHeight: number) => {
      animatingRef.current = true;
      clearAnimation();
      animatingRef.current = true;
      mobilePanelExpandedRef.current = false;

      animationCancelRef.current = animateMobilePanelHeight(
        startHeight,
        restoreHeight,
        NEXUS_PANEL_EXPAND_ANIMATION_MS,
        {
          htmlAttr: NEXUS_PANEL_COLLAPSING_ATTR,
          onComplete: () => {
            animationCancelRef.current = null;
            animatingRef.current = false;
            localStorage.setItem(NEXUS_MOBILE_PANEL_HEIGHT_STORAGE_KEY, String(restoreHeight));
            dispatch({
              type: "setUi",
              ui: { mobilePanelExpanded: false },
            });
          },
        },
      );
    };

    const resolveStoredPreExpandHeightPx = (): number => {
      return preExpandHeightRef.current ?? resolvePreExpandPanelHeightPx();
    };

    const reopenPanelAfterMidGestureClose = () => {
      leftSideBarVisibleRef.current = true;
      restorePersistedPanelHeight();
      dispatch({
        type: "setUi",
        ui: { leftSideBarVisible: true },
      });
    };

    const animatePanelDoubleTapToggle = () => {
      if (closingRef.current || typeof window === "undefined") return;

      clearSingleTapTimer();

      if (!leftSideBarVisibleRef.current) {
        reopenPanelAfterMidGestureClose();
      }

      const startHeight = measureMobilePanelHeightPx();
      if (startHeight === undefined) return;

      const maxHeight = resolveMobilePanelMaxHeightPx(window.innerHeight);
      const toggle = resolveMobileNavPanelToggle(
        {
          isMobilePanelExpanded: mobilePanelExpandedRef.current,
          currentHeightPx: startHeight,
          maxHeightPx: maxHeight,
        },
        resolveStoredPreExpandHeightPx,
      );

      if (toggle.action === "collapse") {
        const restoreHeight = toggle.restoreHeightPx ?? startHeight;
        animatePanelCollapseFromMax(startHeight, restoreHeight);
        return;
      }

      const preExpandHeight = toggle.preExpandHeightPx ?? startHeight;
      preExpandHeightRef.current = preExpandHeight;
      savePreExpandPanelHeight(preExpandHeight);
      animatePanelExpandToMax(startHeight, maxHeight);
    };

    const scheduleSingleTapClose = () => {
      clearSingleTapTimer();
      singleTapTimerRef.current = setTimeout(() => {
        singleTapTimerRef.current = null;
        animatePanelClose();
      }, MOBILE_NAV_SINGLE_TAP_DEFER_MS);
    };

    /**
     * Route a nav tap through shared gesture logic.
     *
     * @param link - Active nav link element.
     * @param source - Event source.
     * @param clickDetail - Native click detail when source is click.
     */
    const handleNavTap = (
      link: HTMLElement,
      source: "pointer" | "touch" | "click",
      clickDetail = 1,
    ) => {
      const outcome = processMobileNavTap({
        state: tapStateRef.current,
        now: performance.now(),
        link,
        source,
        clickDetail,
      });

      if (outcome.type === "ignore") return;

      if (outcome.type === "double-tap-toggle") {
        clearSingleTapTimer();
        animatePanelDoubleTapToggle();
        return;
      }

      scheduleSingleTapClose();
    };

    /**
     * Block Puck's native active-tab handler for nav rail events.
     *
     * @param event - Native nav event.
     * @returns Active nav link when the event targets the active tab.
     */
    const blockActiveNavEvent = (event: Event): HTMLElement | null => {
      const link = resolveActiveNavLink(event.target);
      const shouldBlock = shouldBlockActiveNavTab({
        isCompactViewport: isCompactViewport(),
        leftSideBarVisible: leftSideBarVisibleRef.current,
        isNavRailTarget: isNavRailTarget(event.target),
        link,
        tapState: tapStateRef.current,
        now: performance.now(),
      });

      if (!shouldBlock || !link) return null;

      if (
        event.type === "touchstart" ||
        event.type === "pointerdown" ||
        event.type === "mousedown"
      ) {
        recordNavPointerDown(tapStateRef.current, performance.now());
      }

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      return link;
    };

    let activeLinkCleanup: (() => void) | null = null;

    const detachActiveLinkListeners = () => {
      activeLinkCleanup?.();
      activeLinkCleanup = null;
    };

    const attachActiveLinkListeners = () => {
      detachActiveLinkListeners();

      if (!isCompactViewport()) return;

      const link = queryActiveNavLink();
      if (!link) return;

      const onLinkTouchStart = () => {
        recordNavPointerDown(tapStateRef.current, performance.now());
      };

      const onLinkPointerDown = () => {
        recordNavPointerDown(tapStateRef.current, performance.now());
      };

      const onLinkTouchEnd = (event: TouchEvent) => {
        if (!isPrimaryTouchTap(event)) return;

        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        handleNavTap(link, "touch");
      };

      const onLinkPointerUp = (event: PointerEvent) => {
        if (!isPrimaryPointerTap(event)) return;

        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        handleNavTap(link, event.pointerType === "touch" ? "touch" : "pointer");
      };

      const onLinkClick = (event: MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        handleNavTap(link, "click", event.detail);
      };

      link.addEventListener("touchstart", onLinkTouchStart, NAV_TOUCH_LISTENER_OPTIONS);
      link.addEventListener("pointerdown", onLinkPointerDown, NAV_POINTER_LISTENER_OPTIONS);
      link.addEventListener("touchend", onLinkTouchEnd, NAV_TOUCH_LISTENER_OPTIONS);
      link.addEventListener("pointerup", onLinkPointerUp, NAV_POINTER_LISTENER_OPTIONS);
      link.addEventListener("click", onLinkClick, NAV_POINTER_LISTENER_OPTIONS);

      activeLinkCleanup = () => {
        link.removeEventListener("touchstart", onLinkTouchStart, NAV_TOUCH_LISTENER_OPTIONS);
        link.removeEventListener("pointerdown", onLinkPointerDown, NAV_POINTER_LISTENER_OPTIONS);
        link.removeEventListener("touchend", onLinkTouchEnd, NAV_TOUCH_LISTENER_OPTIONS);
        link.removeEventListener("pointerup", onLinkPointerUp, NAV_POINTER_LISTENER_OPTIONS);
        link.removeEventListener("click", onLinkClick, NAV_POINTER_LISTENER_OPTIONS);
      };
    };

    const navRoot = document.querySelector('.Puck [class*="PuckLayout-nav"]');
    const navObserver =
      navRoot === null
        ? null
        : new MutationObserver(() => {
            attachActiveLinkListeners();
          });

    if (navRoot && navObserver) {
      navObserver.observe(navRoot, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: ["class"],
      });
    }

    attachActiveLinkListeners();

    const onDocumentTouchStart = (event: TouchEvent) => {
      if (event.changedTouches.length !== 1) return;
      blockActiveNavEvent(event);
    };

    const onDocumentPointerDown = (event: PointerEvent) => {
      if (!isPrimaryPointerTap(event)) return;
      blockActiveNavEvent(event);
    };

    const onDocumentMouseDown = (event: MouseEvent) => {
      if (event.button !== 0) return;
      blockActiveNavEvent(event);
    };

    const onDocumentTouchEnd = (event: TouchEvent) => {
      if (!isPrimaryTouchTap(event)) return;
      if (!resolveNavLinkFromTarget(event.target)) return;
      blockActiveNavEvent(event);
    };

    const onDocumentPointerUp = (event: PointerEvent) => {
      if (!isPrimaryPointerTap(event)) return;
      if (!resolveNavLinkFromTarget(event.target)) return;
      blockActiveNavEvent(event);
    };

    const onDocumentClickCapture = (event: MouseEvent) => {
      if (!resolveNavLinkFromTarget(event.target)) return;
      blockActiveNavEvent(event);
    };

    document.addEventListener("touchstart", onDocumentTouchStart, NAV_TOUCH_LISTENER_OPTIONS);
    document.addEventListener("touchend", onDocumentTouchEnd, NAV_TOUCH_LISTENER_OPTIONS);
    document.addEventListener("pointerdown", onDocumentPointerDown, NAV_POINTER_LISTENER_OPTIONS);
    document.addEventListener("mousedown", onDocumentMouseDown, NAV_POINTER_LISTENER_OPTIONS);
    document.addEventListener("pointerup", onDocumentPointerUp, NAV_POINTER_LISTENER_OPTIONS);
    document.addEventListener("click", onDocumentClickCapture, NAV_POINTER_LISTENER_OPTIONS);

    return () => {
      clearSingleTapTimer();
      clearAnimation();
      navObserver?.disconnect();
      detachActiveLinkListeners();
      document.removeEventListener("touchstart", onDocumentTouchStart, NAV_TOUCH_LISTENER_OPTIONS);
      document.removeEventListener("touchend", onDocumentTouchEnd, NAV_TOUCH_LISTENER_OPTIONS);
      document.removeEventListener("pointerdown", onDocumentPointerDown, NAV_POINTER_LISTENER_OPTIONS);
      document.removeEventListener("mousedown", onDocumentMouseDown, NAV_POINTER_LISTENER_OPTIONS);
      document.removeEventListener("pointerup", onDocumentPointerUp, NAV_POINTER_LISTENER_OPTIONS);
      document.removeEventListener("click", onDocumentClickCapture, NAV_POINTER_LISTENER_OPTIONS);
      document.documentElement.removeAttribute(NEXUS_PANEL_CLOSING_ATTR);
      document.documentElement.removeAttribute(NEXUS_PANEL_EXPANDING_ATTR);
      document.documentElement.removeAttribute(NEXUS_PANEL_COLLAPSING_ATTR);
      closingRef.current = false;
      animatingRef.current = false;
      tapStateRef.current = createMobileNavTapState();
      preExpandHeightRef.current = null;
    };
  }, [dispatch]);

  return null;
}

export default NexusMobileNavPanelGestures;
