/**
 * @fileoverview DOM helpers for compact-mode plugin panel height on the Puck layout grid.
 *
 * @module src/components/puck/lib/mobilePanelLayout
 */

import {
  clampMobilePanelHeightPx,
  NEXUS_MOBILE_PANEL_DEFAULT_HEIGHT,
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
export function applyMobilePanelHeight(value: string): void {
  const layout = resolveLayoutInner();
  if (!layout) return;

  const current = layout.style.getPropertyValue(NEXUS_MOBILE_PANEL_HEIGHT_VAR);
  if (current === value) return;

  layout.style.setProperty(NEXUS_MOBILE_PANEL_HEIGHT_VAR, value);
  document.documentElement.style.setProperty(NEXUS_MOBILE_PANEL_HEIGHT_VAR, value);
}

/**
 * Read the panel height from the layout CSS variable (no layout read).
 *
 * @returns Panel height in px, or undefined when unavailable.
 */
export function readMobilePanelHeightVarPx(): number | undefined {
  const layout = resolveLayoutInner();
  if (!layout) return undefined;

  const raw =
    layout.style.getPropertyValue(NEXUS_MOBILE_PANEL_HEIGHT_VAR) ||
    getComputedStyle(layout).getPropertyValue(NEXUS_MOBILE_PANEL_HEIGHT_VAR);

  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

/**
 * Read the current compact panel height in px from the open sidebar.
 *
 * @returns Panel height in px, or undefined when unavailable.
 */
export function measureMobilePanelHeightPx(): number | undefined {
  const fromVar = readMobilePanelHeightVarPx();
  if (fromVar !== undefined && fromVar > 0) {
    return fromVar;
  }

  const sidebar = resolveLeftSidebar();
  const height = sidebar?.getBoundingClientRect().height;
  return height && height > 0 ? height : undefined;
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
      '[class*="SidebarSection-content"], [class*="FieldsPlugin"], .nexus-outline-plugin, [class*="Drawer"]',
    )
    .forEach((scrollEl) => {
      scrollEl.scrollTop = 0;
    });
}

/**
 * Restore persisted compact panel height when valid.
 */
export function restorePersistedPanelHeight(): void {
  if (typeof window === "undefined") return;

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

/** Attribute on `<html>` while the active nav tab expand animation runs. */
export const NEXUS_PANEL_EXPANDING_ATTR = "data-nexus-panel-expanding";

/** Attribute on `<html>` while double-tap restores height from full expand. */
export const NEXUS_PANEL_COLLAPSING_ATTR = "data-nexus-panel-collapsing";

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
    root.hasAttribute(NEXUS_PANEL_COLLAPSING_ATTR)
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
    document.documentElement.hasAttribute(NEXUS_PANEL_RESIZING_ATTR);

  if (!stillMutating) {
    window.dispatchEvent(new CustomEvent(NEXUS_PANEL_LAYOUT_SETTLED_EVENT, { bubbles: true }));
  }
}

/**
 * Prepare the plugin panel for an open-height animation on the next frame.
 */
export function prepareMobilePanelOpenAnimation(): void {
  beginMobilePanelLayoutMutation();
  applyMobilePanelHeight("0px");
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

  return clampMobilePanelHeightPx(Math.round(viewportHeight * 0.3), viewportHeight);
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
 * Animate compact plugin panel height between two pixel values.
 *
 * Uses the native `grid-template-rows` CSS transition (compact ≤900px) instead of
 * per-frame JS writes so weak devices perform one compositor-friendly pass.
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

  const layout = resolveLayoutInner();
  if (!layout) {
    options?.onComplete?.();
    return () => undefined;
  }

  activePanelHeightAnimationCancel?.();

  if (fromPx === toPx) {
    applyMobilePanelHeight(`${toPx}px`);
    options?.onComplete?.();
    return () => undefined;
  }

  beginMobilePanelLayoutMutation();

  if (options?.htmlAttr) {
    document.documentElement.setAttribute(options.htmlAttr, "");
  }

  let finished = false;
  let fallbackTimer: ReturnType<typeof setTimeout> | null = null;

  const finish = () => {
    if (finished) return;
    finished = true;

    layout.removeEventListener("transitionend", onTransitionEnd);
    if (fallbackTimer !== null) {
      clearTimeout(fallbackTimer);
      fallbackTimer = null;
    }

    applyMobilePanelHeight(`${toPx}px`);
    endMobilePanelLayoutMutation();
    activePanelHeightAnimationCancel = null;
    options?.onComplete?.();

    if (options?.htmlAttr) {
      document.documentElement.removeAttribute(options.htmlAttr);
    }
  };

  const cancel = () => {
    if (finished) return;
    finished = true;

    layout.removeEventListener("transitionend", onTransitionEnd);
    if (fallbackTimer !== null) {
      clearTimeout(fallbackTimer);
      fallbackTimer = null;
    }

    if (options?.htmlAttr) {
      document.documentElement.removeAttribute(options.htmlAttr);
    }

    endMobilePanelLayoutMutation();
    if (activePanelHeightAnimationCancel === cancel) {
      activePanelHeightAnimationCancel = null;
    }
  };

  const onTransitionEnd = (event: TransitionEvent) => {
    if (event.target !== layout) return;
    if (
      event.propertyName !== "--nexus-mobile-panel-height"
    ) {
      return;
    }
    finish();
  };

  if (prefersReducedPanelMotion()) {
    applyMobilePanelHeight(`${toPx}px`);
    if (options?.htmlAttr) {
      document.documentElement.removeAttribute(options.htmlAttr);
    }
    endMobilePanelLayoutMutation();
    options?.onComplete?.();
    return () => undefined;
  }

  applyMobilePanelHeight(`${fromPx}px`);
  layout.addEventListener("transitionend", onTransitionEnd);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (finished) return;
      applyMobilePanelHeight(`${toPx}px`);
    });
  });

  fallbackTimer = setTimeout(finish, durationMs + 96);

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
