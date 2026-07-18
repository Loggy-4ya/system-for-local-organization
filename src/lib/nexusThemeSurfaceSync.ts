/**
 * @fileoverview Coordinated repaints after site theme toggles (Puck canvas + layout grid).
 *
 * @module src/lib/nexusThemeSurfaceSync
 */

/** Custom event fired after `data-theme` changes so canvas/grid surfaces resync. */
export const NEXUS_THEME_SURFACE_SYNC_EVENT = "nexus-theme-surface-sync";

/**
 * Read the active site theme from the document root.
 *
 * @returns True when `data-theme="light"`.
 */
export function readDomThemeIsLight(): boolean {
  if (typeof document === "undefined") {
    return false;
  }

  return document.documentElement.getAttribute("data-theme") === "light";
}

/**
 * Notify listeners that theme-dependent surfaces should repaint immediately.
 */
export function dispatchNexusThemeSurfaceSync(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent(NEXUS_THEME_SURFACE_SYNC_EVENT));
}

/**
 * Subscribe to {@link NEXUS_THEME_SURFACE_SYNC_EVENT}.
 *
 * @param handler - Repaint callback.
 * @returns Unsubscribe function.
 */
export function subscribeNexusThemeSurfaceSync(handler: () => void): () => void {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  window.addEventListener(NEXUS_THEME_SURFACE_SYNC_EVENT, handler);
  return () => window.removeEventListener(NEXUS_THEME_SURFACE_SYNC_EVENT, handler);
}

/**
 * Run a repaint callback immediately and across subsequent animation frames.
 *
 * Beats Puck AutoFrame and module CSS that repaint canvas chrome one frame late.
 *
 * @param handler - Surface sync callback.
 * @param frames - Additional animation frames to run after the immediate call.
 */
export function scheduleThemeSurfaceSyncBurst(handler: () => void, frames = 4): void {
  if (typeof window === "undefined") {
    handler();
    return;
  }

  handler();

  let remaining = frames;
  const tick = () => {
    handler();
    remaining -= 1;
    if (remaining > 0) {
      window.requestAnimationFrame(tick);
    }
  };

  window.requestAnimationFrame(tick);
}

let domThemeObserverStarted = false;

/**
 * Watch `data-theme` on `<html>` and dispatch {@link NEXUS_THEME_SURFACE_SYNC_EVENT}.
 *
 * @returns Disconnect function.
 */
export function observeDomThemeSurfaceSync(): () => void {
  if (typeof document === "undefined" || typeof MutationObserver === "undefined") {
    return () => undefined;
  }

  const observer = new MutationObserver(() => {
    scheduleThemeSurfaceSyncBurst(dispatchNexusThemeSurfaceSync);
  });

  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });

  return () => observer.disconnect();
}

/**
 * Start a single document-level `data-theme` observer for the tab.
 *
 * @returns Disconnect function.
 */
export function ensureDomThemeSurfaceSyncObserver(): () => void {
  if (domThemeObserverStarted || typeof document === "undefined") {
    return () => undefined;
  }

  domThemeObserverStarted = true;
  return observeDomThemeSurfaceSync();
}
