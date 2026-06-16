/**
 * @fileoverview Pure helpers for compact-mode nav tab double-tap panel gestures.
 *
 * Tests: `tests/puck/lib/mobileNavPanelGestureLogic.test.ts` — `npm run test:mobile-nav-gestures`
 *
 * @module src/components/puck/lib/mobileNavPanelGestureLogic
 */

/** Max delay between tap ends to count as a double-tap. */
export const MOBILE_NAV_DOUBLE_TAP_MS = 250;

/** Delay before a lone single-tap close/open (just past {@link MOBILE_NAV_DOUBLE_TAP_MS}). */
export const MOBILE_NAV_SINGLE_TAP_DEFER_MS = MOBILE_NAV_DOUBLE_TAP_MS + 16;

/** Ignore duplicate touchend/pointerup pairs from one physical tap on mobile. */
export const MOBILE_NAV_SAME_TAP_EVENT_DEDUPE_MS = 45;

/** Suppress ghost `click` after a handled pointer/touch tap (same physical tap). */
export const MOBILE_NAV_GHOST_CLICK_SUPPRESS_MS = 300;

/**
 * Ignore duplicate dispatch from pointer/touch + click for the same physical tap.
 * Matches {@link MOBILE_NAV_GHOST_CLICK_SUPPRESS_MS} so synthetic `click` / `detail: 2`
 * after a handled touch double-tap cannot re-toggle the panel.
 */
export const MOBILE_NAV_DOUBLE_TAP_DISPATCH_DEDUPE_MS = MOBILE_NAV_GHOST_CLICK_SUPPRESS_MS;

/** Height delta treated as already at max panel height. */
export const MOBILE_NAV_PANEL_HEIGHT_MAX_TOLERANCE_PX = 8;

/** Tap source for nav gesture handling. */
export type MobileNavTapSource = "pointer" | "touch" | "click";

/** Outcome of processing one nav tab tap. */
export type MobileNavTapOutcome =
  | { type: "ignore" }
  | { type: "record-single-tap" }
  | { type: "double-tap-toggle" };

/** In-memory tap timing state for one nav rail. */
export interface MobileNavTapState {
  /** Timestamp and stable link id of the previous tap. */
  lastTap: { time: number; linkId: string } | null;
  /** Timestamp of the last handled double-tap toggle dispatch. */
  lastDoubleTapHandledAt: number;
  /** End time of the last primary pointer/touch/click tap (ghost-click guard). */
  lastPrimaryTapEndAt: number;
  /** Start time of the most recent nav-link pointer/touch press. */
  lastNavPointerDownAt: number;
}

/**
 * Create the initial nav tap state.
 *
 * @returns Empty tap state.
 */
export function createMobileNavTapState(): MobileNavTapState {
  return {
    lastTap: null,
    lastDoubleTapHandledAt: 0,
    lastPrimaryTapEndAt: 0,
    lastNavPointerDownAt: 0,
  };
}

/**
 * Resolve a stable id for a nav link element.
 *
 * @param link - Active nav link element.
 * @returns Link id string.
 */
export function resolveNavLinkId(link: HTMLElement): string {
  return (
    link.dataset.nexusNavLinkId ??
    link.getAttribute("data-nav-key") ??
    link.textContent?.trim() ??
    "nav-link"
  );
}

/**
 * Resolve the active compact nav tab link from an event target.
 *
 * @param target - Event target element.
 * @returns Active nav link element or null.
 */
export function resolveNavLinkFromTarget(target: EventTarget | null): HTMLElement | null {
  if (!target || typeof (target as HTMLElement).closest !== "function") return null;

  return (target as HTMLElement).closest('[class*="NavItem-link"]') as HTMLElement | null;
}

/**
 * Resolve the active compact nav tab link from an event target.
 *
 * Normalizes icon, label, and SVG descendants to the parent `NavItem-link` div.
 *
 * @param target - Event target element.
 * @returns Active nav link element or null.
 */
export function resolveActiveNavLink(target: EventTarget | null): HTMLElement | null {
  const link = resolveNavLinkFromTarget(target);
  if (!link) return null;

  const navItem = link.parentElement;
  if (!navItem || typeof navItem.className !== "string") return null;

  return navItem.className.includes("NavItem--active") ? link : null;
}

/**
 * Record a pointer/touch press on the active nav link.
 *
 * @param state - Nav tap state.
 * @param now - Current timestamp.
 */
export function recordNavPointerDown(state: MobileNavTapState, now: number): void {
  state.lastNavPointerDownAt = now;
}

/**
 * Whether a click event is the synthetic ghost click after a handled touch/pointer tap.
 *
 * @param state - Nav tap state.
 * @param now - Current timestamp.
 * @returns True when the click should be ignored as a duplicate of the same physical tap.
 */
export function isGhostNavClick(state: MobileNavTapState, now: number): boolean {
  const sinceLastEnd = now - state.lastPrimaryTapEndAt;
  if (sinceLastEnd >= MOBILE_NAV_GHOST_CLICK_SUPPRESS_MS) return false;

  return state.lastNavPointerDownAt <= state.lastPrimaryTapEndAt;
}

/**
 * Whether a pointer release should count as a primary nav tap.
 *
 * @param event - Pointer release on the nav rail.
 * @returns True for primary touch/mouse/pen taps.
 */
export function isPrimaryPointerTap(event: Pick<PointerEvent, "pointerType" | "button">): boolean {
  if (event.pointerType === "mouse") return event.button === 0;
  return event.button === 0 || event.button === -1;
}

/**
 * Whether a touch release should count as a primary nav tap.
 *
 * @param event - Touch release on the nav rail.
 * @returns True for a single-finger primary touch end.
 */
export function isPrimaryTouchTap(event: Pick<TouchEvent, "changedTouches">): boolean {
  return event.changedTouches.length === 1;
}

/** Panel action for a confirmed nav double-tap. */
export type MobileNavPanelToggleAction = "open-full" | "close" | "expand" | "collapse";

/** Input for resolving double-tap panel toggle direction. */
export interface ResolveMobileNavPanelToggleInput {
  /** Puck left plugin panel is visible. */
  leftSideBarVisible: boolean;
  /** Panel was opened via double-tap to full height (close on next double-tap). */
  openedViaDoubleTap: boolean;
  /** Puck UI expanded flag (single-tap open + double-tap expand cycle). */
  isMobilePanelExpanded: boolean;
  /** Current panel height in px. */
  currentHeightPx: number;
  /** Max allowed panel height in px. */
  maxHeightPx: number;
}

/** Resolved double-tap panel toggle action. */
export interface ResolvedMobileNavPanelToggle {
  /** Next panel action for the double-tap gesture. */
  action: MobileNavPanelToggleAction;
  /** Height in px to persist before expanding. */
  preExpandHeightPx?: number;
  /** Target height in px when collapsing. */
  restoreHeightPx?: number;
}

/**
 * Resolve the next panel action for a confirmed nav double-tap.
 *
 * - Closed panel → open at max height (`open-full`).
 * - Opened via double-tap → close entirely (`close`).
 * - Single-tap open, not expanded → expand to max (`expand`).
 * - Single-tap open, expanded → restore pre-expand height (`collapse`).
 *
 * @param input - Current panel metrics and UI state.
 * @param resolvePreExpandHeightPx - Reads the saved pre-expand height in px.
 * @returns Toggle action and associated heights.
 */
export function resolveMobileNavPanelToggle(
  input: ResolveMobileNavPanelToggleInput,
  resolvePreExpandHeightPx: () => number,
): ResolvedMobileNavPanelToggle {
  if (!input.leftSideBarVisible) {
    return { action: "open-full" };
  }

  if (input.openedViaDoubleTap) {
    return { action: "close" };
  }

  if (input.isMobilePanelExpanded) {
    return {
      action: "collapse",
      restoreHeightPx: resolvePreExpandHeightPx(),
    };
  }

  return {
    action: "expand",
    preExpandHeightPx: input.currentHeightPx,
  };
}

/**
 * Whether a duplicate double-tap dispatch should be ignored.
 *
 * @param lastHandledAt - Timestamp of the previous handled double-tap.
 * @param now - Current timestamp.
 * @returns True when the dispatch is a pointer/click duplicate.
 */
export function shouldDedupeDoubleTapDispatch(lastHandledAt: number, now: number): boolean {
  return now - lastHandledAt <= MOBILE_NAV_DOUBLE_TAP_DISPATCH_DEDUPE_MS;
}

/**
 * Whether a pending first tap is still inside the double-tap pairing window.
 *
 * @param state - Nav tap state.
 * @param now - Current timestamp.
 * @returns True while a second tap may still complete a double-tap.
 */
export function isWithinMobileNavDoubleTapWindow(state: MobileNavTapState, now: number): boolean {
  const lastTap = state.lastTap;
  if (lastTap === null) return false;
  return now - lastTap.time <= MOBILE_NAV_DOUBLE_TAP_MS;
}

/** Input for deciding whether to intercept Puck's active-tab nav handler. */
export interface ShouldBlockActiveNavTabInput {
  /** Viewport is in compact editor mode. */
  isCompactViewport: boolean;
  /** Puck left plugin panel is visible. */
  leftSideBarVisible: boolean;
  /** Event target lies on the bottom nav rail. */
  isNavRailTarget: boolean;
  /** Resolved active nav link, if any. */
  link: HTMLElement | null;
  /** Current nav tap state. */
  tapState: MobileNavTapState;
  /** Current timestamp. */
  now: number;
}

/**
 * Whether Nexus should intercept Puck's active-tab nav handler.
 *
 * Blocks while the panel is open, and while the panel is closed on the active
 * tab so single/double-tap defer can choose persisted vs full-height open.
 *
 * @param input - Block decision input.
 * @returns True when the event should be consumed.
 */
export function shouldBlockActiveNavTab(input: ShouldBlockActiveNavTabInput): boolean {
  if (!input.isCompactViewport || !input.isNavRailTarget || input.link === null) {
    return false;
  }

  return true;
}

/** Input for processing one nav tab tap. */
export interface ProcessMobileNavTapInput {
  /** Mutable tap state. */
  state: MobileNavTapState;
  /** Current timestamp. */
  now: number;
  /** Active nav link element. */
  link: HTMLElement;
  /** Event source. */
  source: MobileNavTapSource;
  /** Native click detail when source is `click`. */
  clickDetail?: number;
}

/**
 * Process one nav tab tap and return the next action.
 *
 * @param input - Tap input.
 * @returns Tap outcome and updated state fields.
 */
export function processMobileNavTap(input: ProcessMobileNavTapInput): MobileNavTapOutcome {
  const { state, now, link, source, clickDetail = 1 } = input;
  const linkId = resolveNavLinkId(link);

  if (
    source !== "click" &&
    now - state.lastPrimaryTapEndAt < MOBILE_NAV_SAME_TAP_EVENT_DEDUPE_MS
  ) {
    return { type: "ignore" };
  }

  if (source === "click") {
    if (clickDetail < 2 && isGhostNavClick(state, now)) {
      return { type: "ignore" };
    }

    if (clickDetail >= 2) {
      if (shouldDedupeDoubleTapDispatch(state.lastDoubleTapHandledAt, now)) {
        return { type: "ignore" };
      }

      state.lastDoubleTapHandledAt = now;
      state.lastTap = null;
      state.lastPrimaryTapEndAt = now;
      return { type: "double-tap-toggle" };
    }
  }

  const lastTap = state.lastTap;
  const isDoubleTap =
    lastTap !== null &&
    now - lastTap.time <= MOBILE_NAV_DOUBLE_TAP_MS &&
    lastTap.linkId === linkId;

  if (isDoubleTap) {
    if (shouldDedupeDoubleTapDispatch(state.lastDoubleTapHandledAt, now)) {
      return { type: "ignore" };
    }

    state.lastDoubleTapHandledAt = now;
    state.lastTap = null;
    state.lastPrimaryTapEndAt = now;
    return { type: "double-tap-toggle" };
  }

  state.lastTap = { time: now, linkId };
  state.lastPrimaryTapEndAt = now;
  return { type: "record-single-tap" };
}
