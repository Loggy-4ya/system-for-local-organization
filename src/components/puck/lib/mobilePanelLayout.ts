/**
 * @fileoverview DOM helpers for compact-mode plugin panel height on the Puck layout grid.
 *
 * @module src/components/puck/lib/mobilePanelLayout
 */

import { clearMobilePreviewViewportOverrides } from "@/components/puck/lib/mobilePanelPreviewSync";
import {
  isCompactPluginPanelOpen,
} from "@/components/puck/lib/canvasIslandStackSync";
import { recordMobileScrollportShellMetrics } from "@/components/puck/lib/mobileScrollportGridFreeze";
import {
  clampMobilePanelHeightPx,
  NEXUS_MOBILE_PANEL_DEFAULT_HEIGHT,
  resolveMobilePanelDefaultOpenHeightPx,
  NEXUS_MOBILE_PANEL_HEIGHT_STORAGE_KEY,
  NEXUS_MOBILE_PANEL_HEIGHT_VAR,
  NEXUS_MOBILE_PANEL_MIN_HEIGHT_PX,
  NEXUS_MOBILE_PANEL_PRE_EXPAND_HEIGHT_STORAGE_KEY,
  NEXUS_PANEL_LAYOUT_MUTATING_ATTR,
  NEXUS_PANEL_LAYOUT_SETTLED_EVENT,
  NEXUS_PANEL_RESIZING_ATTR,
} from "@/components/puck/lib/sidebarLayoutLimits";

/** Cached Puck layout inner grid — invalidated when detached from the document. */
let cachedLayoutInner: HTMLElement | null = null;

/**
 * Resolve and cache the Puck layout inner grid root.
 *
 * @returns Layout element or null.
 */
export function resolveLayoutInner(): HTMLElement | null {
  if (typeof document === "undefined") return null;

  if (cachedLayoutInner && cachedLayoutInner.isConnected) {
    return cachedLayoutInner;
  }

  cachedLayoutInner = document.querySelector('[class*="PuckLayout-inner"]') as HTMLElement | null;
  return cachedLayoutInner;
}

/**
 * Locate the compact-mode bottom plugin nav rail.
 *
 * @returns Nav root element or null.
 */
export function resolveNavRoot(): HTMLElement | null {
  if (typeof document === "undefined") return null;
  return document.querySelector('.Puck [class*="PuckLayout-nav"]') as HTMLElement | null;
}

/**
 * Locate the visible left plugin sidebar panel.
 *
 * @returns Sidebar element or null.
 */
export function resolveLeftSidebar(): HTMLElement | null {
  if (typeof document === "undefined") return null;
  return document.querySelector('.Puck [class*="Sidebar--left"]') as HTMLElement | null;
}

/**
 * Apply compact panel height to the layout grid.
 *
 * @param value - CSS length (`px` or `%`).
 */
/** Attribute on `<html>` while the plugin panel row has non-zero height (settled open). */
export const NEXUS_PANEL_ROW_OPEN_ATTR = "data-nexus-panel-row-open";

export function applyMobilePanelHeight(value: string): void {
  document.documentElement.style.setProperty(NEXUS_MOBILE_PANEL_HEIGHT_VAR, value);

  syncPanelRowOpenAttr(value);

  const layout = resolveLayoutInner();
  if (!layout) {
    return;
  }

  const current = layout.style.getPropertyValue(NEXUS_MOBILE_PANEL_HEIGHT_VAR);
  if (current === value) {
    return;
  }

  layout.style.setProperty(NEXUS_MOBILE_PANEL_HEIGHT_VAR, value);
}

/**
 * Sync `data-nexus-panel-row-open` from the height token (deferred while height eases).
 *
 * @param value - CSS length applied to `--nexus-mobile-panel-height`.
 */
function syncPanelRowOpenAttr(value: string): void {
  const parsed = Number.parseFloat(value);
  const heightEasing =
    document.documentElement.hasAttribute(NEXUS_PANEL_OPENING_ATTR) ||
    document.documentElement.hasAttribute(NEXUS_PANEL_CLOSING_ATTR) ||
    document.documentElement.hasAttribute(NEXUS_PANEL_EXPANDING_ATTR) ||
    document.documentElement.hasAttribute(NEXUS_PANEL_COLLAPSING_ATTR);

  if (Number.isFinite(parsed) && parsed > 0 && !heightEasing) {
    document.documentElement.setAttribute(NEXUS_PANEL_ROW_OPEN_ATTR, "");
  } else {
    document.documentElement.removeAttribute(NEXUS_PANEL_ROW_OPEN_ATTR);
  }
}

/**
 * Apply panel height, retrying until the Puck layout inner grid is mounted.
 *
 * @param value - CSS length (`px` or `%`).
 * @param options - Optional completion callback and attempt cap.
 * @returns Cancel function for pending retries.
 */
export function scheduleMobilePanelHeightApply(
  value: string,
  options?: {
    onApplied?: () => void;
    maxAttempts?: number;
  },
): () => void {
  if (typeof window === "undefined") {
    options?.onApplied?.();
    return () => undefined;
  }

  let attempts = 0;
  let frameId = 0;
  let cancelled = false;
  const maxAttempts = options?.maxAttempts ?? 16;

  const tryApply = () => {
    if (cancelled) return;

    applyMobilePanelHeight(value);
    const layout = resolveLayoutInner();

    if (layout) {
      options?.onApplied?.();
      return;
    }

    attempts += 1;
    if (attempts < maxAttempts) {
      frameId = requestAnimationFrame(tryApply);
    } else {
      options?.onApplied?.();
    }
  };

  tryApply();

  return () => {
    cancelled = true;
    if (frameId) {
      cancelAnimationFrame(frameId);
    }
  };
}

/**
 * Read the panel height from the layout CSS variable (no layout read).
 *
 * @returns Panel height in px, or undefined when unavailable.
 */
export function readMobilePanelHeightVarPx(): number | undefined {
  if (typeof document === "undefined") return undefined;

  const layout = resolveLayoutInner();

  const raw =
    layout?.style.getPropertyValue(NEXUS_MOBILE_PANEL_HEIGHT_VAR) ||
    (layout ? getComputedStyle(layout).getPropertyValue(NEXUS_MOBILE_PANEL_HEIGHT_VAR) : "") ||
    document.documentElement.style.getPropertyValue(NEXUS_MOBILE_PANEL_HEIGHT_VAR) ||
    getComputedStyle(document.documentElement).getPropertyValue(NEXUS_MOBILE_PANEL_HEIGHT_VAR);

  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

/**
 * Whether the compact panel height token reads as fully closed (0px).
 *
 * @param heightPx - Parsed panel height in px.
 * @returns True when the panel row should be treated as closed.
 */
export function isMobilePanelHeightClosedPx(heightPx: number | undefined): boolean {
  return heightPx === undefined || heightPx <= 0;
}

/**
 * Read the current compact panel height in px from the open sidebar.
 *
 * @returns Panel height in px, or undefined when unavailable.
 */
export function measureMobilePanelHeightPx(): number | undefined {
  const fromVar = readMobilePanelHeightVarPx();
  if (fromVar !== undefined) {
    return fromVar;
  }

  const sidebar = resolveLeftSidebar();
  const height = sidebar?.getBoundingClientRect().height;
  if (height === undefined || !Number.isFinite(height)) return undefined;
  return height >= 0 ? height : undefined;
}

/**
 * Reset persisted compact panel height to the default open height for the viewport.
 *
 * Used after swipe-to-dismiss so the next section-tab open animates to the default
 * height instead of a dragged-down partial height.
 *
 * @param viewportHeight - Current viewport height in px.
 */
export function resetMobilePanelPersistedHeightToDefault(viewportHeight?: number): void {
  if (typeof localStorage === "undefined") return;

  const viewport =
    viewportHeight ?? (typeof window !== "undefined" ? window.innerHeight : undefined);
  if (viewport === undefined) return;

  const defaultPx = resolveMobilePanelDefaultOpenHeightPx(viewport);
  localStorage.setItem(NEXUS_MOBILE_PANEL_HEIGHT_STORAGE_KEY, String(defaultPx));
}

/**
 * Keep the compact plugin sidebar clipped to the live panel height while dragging.
 *
 * Height is enforced in CSS via `--nexus-mobile-panel-height`; this only ensures the
 * token is mirrored on `<html>` (see {@link applyMobilePanelHeight}).
 */
export function syncCompactPanelSidebarLayout(): void {
  if (typeof document === "undefined") return;

  const heightPx = readMobilePanelHeightVarPx();
  if (heightPx === undefined) return;

  document.documentElement.style.setProperty(
    NEXUS_MOBILE_PANEL_HEIGHT_VAR,
    `${heightPx}px`,
  );
}

/**
 * Clear compact sidebar height overrides after drag ends.
 */
export function clearCompactPanelSidebarLayout(): void {
  /* Panel height token lives on layout + html; no per-sidebar inline overrides. */
}

/**
 * Reset plugin panel scroll positions after a vertical resize.
 */
export function resetCompactPanelSidebarScroll(): void {
  if (typeof document === "undefined") return;

  const sidebar = resolveLeftSidebar();
  if (!sidebar) return;

  sidebar
    .querySelectorAll<HTMLElement>(
      '[class*="PuckPluginTab-body"], [class*="SidebarSection-content"], [class*="FieldsPlugin"], .nexus-outline-plugin, [class*="Drawer"]',
    )
    .forEach((scrollEl) => {
      scrollEl.scrollTop = 0;
    });
}

/**
 * Restore persisted compact panel height when valid.
 *
 * When the plugin panel is closed, keeps `--nexus-mobile-panel-height` at `0px` so open
 * animations always ease from zero (persisted height is read from storage on open instead).
 */
export function restorePersistedPanelHeight(): void {
  if (typeof window === "undefined") return;

  if (!isCompactPluginPanelOpen()) {
    applyMobilePanelHeight("0px");
    return;
  }

  try {
    const raw = localStorage.getItem(NEXUS_MOBILE_PANEL_HEIGHT_STORAGE_KEY);
    if (!raw) {
      applyMobilePanelHeight(NEXUS_MOBILE_PANEL_DEFAULT_HEIGHT);
      return;
    }

    const parsed = Number.parseFloat(raw);
    if (!Number.isFinite(parsed)) {
      applyMobilePanelHeight(NEXUS_MOBILE_PANEL_DEFAULT_HEIGHT);
      return;
    }

    const clamped = clampMobilePanelHeightPx(parsed, window.innerHeight);
    applyMobilePanelHeight(`${clamped}px`);
  } catch {
    applyMobilePanelHeight(NEXUS_MOBILE_PANEL_DEFAULT_HEIGHT);
  }
}

/** Attribute on `<html>` while the active nav tab close animation runs. */
export const NEXUS_PANEL_CLOSING_ATTR = "data-nexus-panel-closing";

/** Attribute on `<html>` while the compact plugin panel open animation runs. */
export const NEXUS_PANEL_OPENING_ATTR = "data-nexus-panel-opening";

/** Attribute on `<html>` while the canvas reflows after panel close (matches height animation). */
export const NEXUS_PANEL_CLOSE_SETTLING_ATTR = "data-nexus-panel-close-settling";

/** Attribute on `<html>` while the active nav tab expand animation runs. */
export const NEXUS_PANEL_EXPANDING_ATTR = "data-nexus-panel-expanding";

/** Attribute on `<html>` while double-tap restores height from full expand. */
export const NEXUS_PANEL_COLLAPSING_ATTR = "data-nexus-panel-collapsing";

/** One-shot flag: next panel open should animate to max height (double-tap open). */
let pendingDoubleTapFullOpen = false;

/**
 * Mark the next compact panel open as a double-tap full-height open.
 *
 * Consumed by {@link consumePendingDoubleTapFullOpen} in the open animation.
 */
export function markPendingDoubleTapFullOpen(): void {
  pendingDoubleTapFullOpen = true;
}

/**
 * Whether the current open should use max height instead of persisted height.
 *
 * @returns True when {@link markPendingDoubleTapFullOpen} was called and not yet consumed.
 */
export function consumePendingDoubleTapFullOpen(): boolean {
  if (!pendingDoubleTapFullOpen) return false;
  pendingDoubleTapFullOpen = false;
  return true;
}

/**
 * Persist the panel height captured before double-tap expand.
 *
 * @param heightPx - Panel height in px before expanding to max.
 */
export function savePreExpandPanelHeight(heightPx: number): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(NEXUS_MOBILE_PANEL_PRE_EXPAND_HEIGHT_STORAGE_KEY, String(heightPx));
}

/**
 * Read the panel height saved before the last double-tap expand.
 *
 * @returns Pre-expand height in px, or undefined when unavailable.
 */
export function readPreExpandPanelHeight(): number | undefined {
  if (typeof window === "undefined") return undefined;

  try {
    const raw = localStorage.getItem(NEXUS_MOBILE_PANEL_PRE_EXPAND_HEIGHT_STORAGE_KEY);
    if (!raw) return undefined;

    const parsed = Number.parseFloat(raw);
    if (!Number.isFinite(parsed)) return undefined;

    return clampMobilePanelHeightPx(parsed, window.innerHeight);
  } catch {
    return undefined;
  }
}

/**
 * Resolve the height to restore when collapsing from full expand.
 *
 * @returns Clamped panel height in px.
 */
export function resolvePreExpandPanelHeightPx(): number {
  if (typeof window === "undefined") return NEXUS_MOBILE_PANEL_MIN_HEIGHT_PX;

  return readPreExpandPanelHeight() ?? NEXUS_MOBILE_PANEL_MIN_HEIGHT_PX;
}

/** Duration of compact panel height animations in ms. */
export const NEXUS_PANEL_HEIGHT_ANIMATION_MS = 400;

/** Duration of the panel close height animation in ms. */
export const NEXUS_PANEL_CLOSE_ANIMATION_MS = NEXUS_PANEL_HEIGHT_ANIMATION_MS;

/** Duration of the panel open height animation in ms. */
export const NEXUS_PANEL_OPEN_ANIMATION_MS = NEXUS_PANEL_HEIGHT_ANIMATION_MS;

/** Duration of the panel expand/collapse height animation in ms. */
export const NEXUS_PANEL_EXPAND_ANIMATION_MS = NEXUS_PANEL_HEIGHT_ANIMATION_MS;

/** Document event dispatched when compact panel close animation should run. */
export const NEXUS_MOBILE_PANEL_CLOSE_REQUEST_EVENT = "nexus-mobile-panel-close-request";

/** Payload for {@link NEXUS_MOBILE_PANEL_CLOSE_REQUEST_EVENT}. */
export interface MobilePanelDismissRequestDetail {
  /** Panel height in px at dismiss release — avoids stale reads after drag. */
  lastHeightPx?: number;
}

/**
 * Request the compact plugin panel close animation (e.g. swipe-to-dismiss on the resize handle).
 *
 * Handled by {@link NexusMobileNavPanelGestures} so close logic stays centralized.
 *
 * @param detail - Optional dismiss metadata from the drag release.
 */
export function requestMobilePanelDismiss(detail?: MobilePanelDismissRequestDetail): void {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent<MobilePanelDismissRequestDetail>(NEXUS_MOBILE_PANEL_CLOSE_REQUEST_EVENT, {
      detail,
    }),
  );
}

/** Active post-close settle timer — cleared when a new settle starts. */
let mobilePanelCloseSettlingTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Begin the post-close canvas reflow phase while preview height tracks the editor shell.
 */
export function beginMobilePanelCloseSettling(): void {
  if (typeof document === "undefined") return;

  document.documentElement.removeAttribute(NEXUS_PANEL_CLOSING_ATTR);
  document.documentElement.setAttribute(NEXUS_PANEL_CLOSE_SETTLING_ATTR, "");
  beginMobilePanelLayoutMutation();
}

/**
 * End post-close settle — clear preview overrides and notify listeners.
 */
export function endMobilePanelCloseSettling(): void {
  if (typeof document === "undefined") return;

  if (mobilePanelCloseSettlingTimer !== null) {
    clearTimeout(mobilePanelCloseSettlingTimer);
    mobilePanelCloseSettlingTimer = null;
  }

  document.documentElement.removeAttribute(NEXUS_PANEL_CLOSE_SETTLING_ATTR);
  clearMobilePreviewViewportOverrides();
  endMobilePanelLayoutMutation();
}

/**
 * Run {@link beginMobilePanelCloseSettling} then end after the height animation duration.
 *
 * @param durationMs - Settle duration in ms (defaults to panel close animation length).
 */
export function scheduleMobilePanelCloseSettling(
  durationMs: number = NEXUS_PANEL_CLOSE_ANIMATION_MS,
): void {
  if (typeof window === "undefined") return;

  if (mobilePanelCloseSettlingTimer !== null) {
    clearTimeout(mobilePanelCloseSettlingTimer);
  }

  beginMobilePanelCloseSettling();

  mobilePanelCloseSettlingTimer = setTimeout(() => {
    mobilePanelCloseSettlingTimer = null;
    endMobilePanelCloseSettling();
  }, durationMs);
}

/**
 * Whether the compact panel row height is easing via CSS (open or close animation).
 *
 * @returns True while `data-nexus-panel-opening` or `data-nexus-panel-closing` is set.
 */
export function isMobilePanelHeightTransitionActive(): boolean {
  if (typeof document === "undefined") return false;

  const root = document.documentElement;
  return (
    root.hasAttribute(NEXUS_PANEL_OPENING_ATTR) ||
    root.hasAttribute(NEXUS_PANEL_CLOSING_ATTR) ||
    root.hasAttribute(NEXUS_PANEL_CLOSE_SETTLING_ATTR)
  );
}

/**
 * Whether the compact plugin panel height or layout is actively changing.
 *
 * @returns True during drag, open, close, expand, or collapse mutations.
 */
export function isMobilePanelLayoutMutating(): boolean {
  if (typeof document === "undefined") return false;

  const root = document.documentElement;
  return (
    root.hasAttribute(NEXUS_PANEL_LAYOUT_MUTATING_ATTR) ||
    root.hasAttribute(NEXUS_PANEL_RESIZING_ATTR) ||
    root.hasAttribute(NEXUS_PANEL_CLOSING_ATTR) ||
    root.hasAttribute(NEXUS_PANEL_OPENING_ATTR) ||
    root.hasAttribute(NEXUS_PANEL_EXPANDING_ATTR) ||
    root.hasAttribute(NEXUS_PANEL_COLLAPSING_ATTR) ||
    root.hasAttribute(NEXUS_PANEL_CLOSE_SETTLING_ATTR)
  );
}

/**
 * Mark the compact panel layout as mutating so canvas/viewport sync can pause.
 */
export function beginMobilePanelLayoutMutation(): void {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute(NEXUS_PANEL_LAYOUT_MUTATING_ATTR, "");
}

/**
 * Clear the compact panel layout mutation flag and notify listeners once.
 */
export function endMobilePanelLayoutMutation(): void {
  if (typeof document === "undefined") return;

  document.documentElement.removeAttribute(NEXUS_PANEL_LAYOUT_MUTATING_ATTR);

  const stillMutating =
    document.documentElement.hasAttribute(NEXUS_PANEL_CLOSING_ATTR) ||
    document.documentElement.hasAttribute(NEXUS_PANEL_OPENING_ATTR) ||
    document.documentElement.hasAttribute(NEXUS_PANEL_EXPANDING_ATTR) ||
    document.documentElement.hasAttribute(NEXUS_PANEL_COLLAPSING_ATTR) ||
    document.documentElement.hasAttribute(NEXUS_PANEL_CLOSE_SETTLING_ATTR) ||
    document.documentElement.hasAttribute(NEXUS_PANEL_RESIZING_ATTR);

  if (!stillMutating) {
    recordMobileScrollportShellMetrics();
    window.dispatchEvent(new CustomEvent(NEXUS_PANEL_LAYOUT_SETTLED_EVENT, { bubbles: true }));
  }
}

/**
 * Resolve and synchronously apply the target compact panel height.
 *
 * @param viewportHeight - `window.innerHeight` or equivalent.
 */
export function applyMobilePanelOpenHeightImmediate(viewportHeight: number): void {
  const targetHeightPx = resolveMobilePanelOpenHeightPx(viewportHeight);
  scheduleMobilePanelHeightApply(`${targetHeightPx}px`);
}

/**
 * Prepare the plugin panel for an open-height animation on the next frame.
 * @deprecated Use {@link applyMobilePanelOpenHeightImmediate} instead.
 */
export function prepareMobilePanelOpenAnimation(): void {
  beginMobilePanelLayoutMutation();
}

/**
 * Resolve the target compact panel height when opening the plugin panel.
 *
 * @param viewportHeight - `window.innerHeight` or equivalent.
 * @returns Clamped panel height in px.
 */
export function resolveMobilePanelOpenHeightPx(viewportHeight: number): number {
  if (typeof window === "undefined") {
    return clampMobilePanelHeightPx(
      Math.round(viewportHeight * 0.3),
      viewportHeight,
    );
  }

  try {
    const raw = localStorage.getItem(NEXUS_MOBILE_PANEL_HEIGHT_STORAGE_KEY);
    if (raw) {
      const parsed = Number.parseFloat(raw);
      if (Number.isFinite(parsed)) {
        return clampMobilePanelHeightPx(parsed, viewportHeight);
      }
    }
  } catch {
    /* ignore persistence errors */
  }

  return resolveMobilePanelDefaultOpenHeightPx(viewportHeight);
}

/** Active panel height animation cancel callback. */
let activePanelHeightAnimationCancel: (() => void) | null = null;

/**
 * Whether reduced-motion should skip panel height easing.
 *
 * @returns True when the user prefers reduced motion.
 */
function prefersReducedPanelMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Pure helper to determine if the open animation should be skipped because the panel is already sufficiently open.
 *
 * @param currentPx - Current measured panel height in px.
 * @param targetPx - Target open height in px.
 * @returns True if the animation should be skipped.
 */
export function shouldSkipMobilePanelOpenAnimation(
  currentPx: number | undefined,
  targetPx: number,
): boolean {
  if (currentPx === undefined) return false;
  return currentPx >= targetPx * 0.85;
}

/**
 * Animate compact plugin panel height between two pixel values.
 *
 * Uses the registered `@property --nexus-mobile-panel-height` CSS transition on
 * `PuckLayout-inner` instead of per-frame JS writes so weak devices perform one pass.
 *
 * @param fromPx - Starting height in px.
 * @param toPx - Target height in px.
 * @param durationMs - Animation duration in ms.
 * @param options - Optional `<html>` attribute and completion callback.
 * @returns Cancel function for the in-flight animation.
 */
export function animateMobilePanelHeight(
  fromPx: number,
  toPx: number,
  durationMs: number,
  options?: {
    htmlAttr?: string;
    onComplete?: () => void;
  },
): () => void {
  if (typeof window === "undefined") {
    options?.onComplete?.();
    return () => undefined;
  }

  activePanelHeightAnimationCancel?.();

  let finished = false;
  let fallbackTimer: ReturnType<typeof setTimeout> | null = null;
  let retryFrame: number | null = null;
  let activeLayoutEl: HTMLElement | null = null;

  const onTransitionEnd = (event: TransitionEvent) => {
    if (event.target !== activeLayoutEl) return;
    if (event.propertyName !== "--nexus-mobile-panel-height") {
      return;
    }
    finish();
  };

  const finish = () => {
    if (finished) return;
    finished = true;

    if (activeLayoutEl) {
      activeLayoutEl.removeEventListener("transitionend", onTransitionEnd);
    }
    if (fallbackTimer !== null) {
      clearTimeout(fallbackTimer);
      fallbackTimer = null;
    }

    applyMobilePanelHeight(`${toPx}px`);

    if (options?.htmlAttr === NEXUS_PANEL_CLOSING_ATTR) {
      options?.onComplete?.();
      document.documentElement.removeAttribute(options.htmlAttr);
      syncPanelRowOpenAttr(`${toPx}px`);
      endMobilePanelLayoutMutation();
      if (activePanelHeightAnimationCancel === cancel) {
        activePanelHeightAnimationCancel = null;
      }
      return;
    }

    options?.onComplete?.();

    if (options?.htmlAttr) {
      document.documentElement.removeAttribute(options.htmlAttr);
    }

    syncPanelRowOpenAttr(`${toPx}px`);
    endMobilePanelLayoutMutation();
    if (activePanelHeightAnimationCancel === cancel) {
      activePanelHeightAnimationCancel = null;
    }
  };

  const cancel = () => {
    if (finished) return;
    finished = true;

    if (retryFrame !== null) {
      cancelAnimationFrame(retryFrame);
      retryFrame = null;
    }

    if (activeLayoutEl) {
      activeLayoutEl.removeEventListener("transitionend", onTransitionEnd);
    }
    if (fallbackTimer !== null) {
      clearTimeout(fallbackTimer);
      fallbackTimer = null;
    }

    if (options?.htmlAttr) {
      document.documentElement.removeAttribute(options.htmlAttr);
    }

    // On cancel, if mid-open (height near 0), apply the intended toPx so cleanup never leaves the panel at 0px.
    if (fromPx === 0 && toPx > 0) {
      applyMobilePanelHeight(`${toPx}px`);
    }

    endMobilePanelLayoutMutation();
    if (activePanelHeightAnimationCancel === cancel) {
      activePanelHeightAnimationCancel = null;
    }
  };

  const runAnimation = (layoutEl: HTMLElement) => {
    if (finished) return;
    activeLayoutEl = layoutEl;

    if (fromPx === toPx) {
      applyMobilePanelHeight(`${toPx}px`);
      if (options?.htmlAttr) {
        document.documentElement.removeAttribute(options.htmlAttr);
      }
      endMobilePanelLayoutMutation();
      options?.onComplete?.();
      return;
    }

    beginMobilePanelLayoutMutation();

    if (options?.htmlAttr) {
      document.documentElement.setAttribute(options.htmlAttr, "");
    }

    if (prefersReducedPanelMotion()) {
      applyMobilePanelHeight(`${toPx}px`);
      if (options?.htmlAttr) {
        document.documentElement.removeAttribute(options.htmlAttr);
      }
      endMobilePanelLayoutMutation();
      options?.onComplete?.();
      return;
    }

    applyMobilePanelHeight(`${fromPx}px`);
    layoutEl.addEventListener("transitionend", onTransitionEnd);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (finished) return;
        applyMobilePanelHeight(`${toPx}px`);
      });
    });

    fallbackTimer = setTimeout(finish, durationMs + 96);
  };

  const layout = resolveLayoutInner();
  if (!layout) {
    retryFrame = requestAnimationFrame(() => {
      retryFrame = null;
      const retryLayout = resolveLayoutInner();
      if (!retryLayout) {
        options?.onComplete?.();
        return;
      }
      runAnimation(retryLayout);
    });

    activePanelHeightAnimationCancel = cancel;
    return cancel;
  }

  runAnimation(layout);
  activePanelHeightAnimationCancel = cancel;
  return cancel;
}

/**
 * Cancel any in-flight compact panel height animation.
 */
export function cancelMobilePanelHeightAnimation(): void {
  activePanelHeightAnimationCancel?.();
  activePanelHeightAnimationCancel = null;
}

/** `<html>` / layout panel mutation attributes cleared after a full panel close. */
const PANEL_MUTATION_ATTRS = [
  NEXUS_PANEL_LAYOUT_MUTATING_ATTR,
  NEXUS_PANEL_RESIZING_ATTR,
  NEXUS_PANEL_CLOSING_ATTR,
  NEXUS_PANEL_OPENING_ATTR,
  NEXUS_PANEL_EXPANDING_ATTR,
  NEXUS_PANEL_COLLAPSING_ATTR,
  NEXUS_PANEL_CLOSE_SETTLING_ATTR,
] as const;

/**
 * Clear resize-only flags so the slide-up plugin panel accepts scroll and pointer input.
 *
 * Opening/closing/expanding/collapsing attrs are owned by {@link animateMobilePanelHeight}
 * — removing them here caused header/island settle snaps before the ease finished.
 */
export function releaseMobilePanelSidebarForInteraction(): void {
  if (typeof document === "undefined") return;

  document.documentElement.removeAttribute(NEXUS_PANEL_RESIZING_ATTR);
}

/**
 * Clear stuck focus / press state on compact bottom-rail nav tabs after panel dismiss.
 *
 * Touch taps can leave `:hover` or focus on the active tab; blur every nav link so
 * closed-panel styling wins immediately.
 */
export function clearCompactNavTabPressChrome(): void {
  if (typeof document === "undefined") return;

  document.querySelectorAll('.Puck [class*="NavItem-link"]').forEach((node) => {
    if (node instanceof HTMLElement) {
      node.blur();
    }
  });

  const activeElement = document.activeElement;
  if (
    activeElement instanceof HTMLElement &&
    activeElement.closest('.Puck [class*="PuckLayout-nav"]')
  ) {
    activeElement.blur();
  }
}

/**
 * Clear portaled resize overlays and drag chrome after the plugin panel closes.
 */
export function cleanupCompactPanelOverlayChrome(): void {
  if (typeof document === "undefined") return;

  document.getElementById("resize-overlay")?.remove();
  document.body.style.removeProperty("cursor");
  document.body.style.removeProperty("user-select");

  document.querySelectorAll(".nexus-mobile-panel-resize-host").forEach((node) => {
    node.remove();
  });
}

/**
 * Remove stale compact panel chrome after the plugin panel closes.
 *
 * Clears mutation flags, panel height tokens, stuck resize overlays, and portaled
 * drag hosts so the canvas returns to a full-width, interactive state.
 */
export function resetCompactPanelChromeAfterClose(): void {
  if (typeof document === "undefined") return;

  for (const attr of PANEL_MUTATION_ATTRS) {
    document.documentElement.removeAttribute(attr);
  }

  applyMobilePanelHeight("0px");
  cleanupCompactPanelOverlayChrome();
  clearCompactNavTabPressChrome();
  endMobilePanelCloseSettling();
  endMobilePanelLayoutMutation();
}
