/**
 * @fileoverview Stuck-loader recovery timing and back-navigation detection.
 *
 * Browser back/forward and bfcache restores can leave the App Router Suspense
 * fallback (`loading.tsx` / {@link SiteLoader}) mounted indefinitely. Recovery
 * prefers a soft `router.refresh()` before a hard `location.reload()`.
 *
 * Run: `npm run test:route-loader-recovery`
 * Registry: `.ai/docs/testing.md`
 *
 * @module src/lib/routeLoaderRecoveryLogic
 */

/** Soft RSC refetch delay after a history (back/forward) navigation. */
export const LOADER_BACK_REFRESH_DELAY_MS = 400;

/** Hard reload delay after history navigation if refresh did not resolve the loader. */
export const LOADER_BACK_RELOAD_DELAY_MS = 1_200;

/** Soft RSC refetch delay for other stuck navigations. */
export const LOADER_DEFAULT_REFRESH_DELAY_MS = 1_500;

/** Hard reload delay for other stuck navigations. */
export const LOADER_DEFAULT_RELOAD_DELAY_MS = 4_500;

/** How long after `popstate` a loader still counts as history navigation. */
export const LOADER_HISTORY_NAV_WINDOW_MS = 4_000;

/** Resolved recovery delays for a stuck loader instance. */
export interface LoaderRecoveryDelays {
  /** Milliseconds until the first soft `router.refresh()` attempt. */
  refreshMs: number;
  /** Milliseconds until a hard `location.reload()` fallback. */
  reloadMs: number;
}

let lastPopstateAt = 0;

/**
 * Record that the user navigated via browser history (back/forward).
 *
 * Called from {@link RouteNavigationRecoveryHost} on `popstate`.
 */
export function markHistoryPopNavigation(nowMs: number = Date.now()): void {
  lastPopstateAt = nowMs;
}

/**
 * Whether a history pop happened recently enough to treat the loader as back-nav stuck.
 *
 * @param nowMs - Current timestamp for tests.
 * @param withinMs - Look-back window.
 * @returns True when `popstate` fired within the window.
 */
export function wasRecentHistoryPopNavigation(
  nowMs: number = Date.now(),
  withinMs: number = LOADER_HISTORY_NAV_WINDOW_MS,
): boolean {
  if (lastPopstateAt <= 0) return false;
  return nowMs - lastPopstateAt <= withinMs;
}

/**
 * Reset popstate tracking — for unit tests only.
 */
export function resetHistoryPopNavigationForTests(): void {
  lastPopstateAt = 0;
}

/**
 * Whether a Performance Navigation Timing entry represents back/forward travel.
 *
 * @param navType - `PerformanceNavigationTiming.type` value.
 * @returns True for `back_forward`.
 */
export function isBackForwardNavigationType(navType: string | undefined): boolean {
  return navType === "back_forward";
}

/**
 * Read whether the current document load was triggered by back/forward.
 *
 * @param readNavType - Injectable navigation type reader for tests.
 * @returns True when the browser reports `back_forward`.
 */
export function isBackForwardNavigation(
  readNavType: () => string | undefined = () => {
    if (typeof performance === "undefined") return undefined;
    const nav = performance.getEntriesByType("navigation")[0] as
      | PerformanceNavigationTiming
      | undefined;
    return nav?.type;
  },
): boolean {
  return isBackForwardNavigationType(readNavType());
}

/**
 * Decide if stuck-loader recovery should use the faster back-navigation timings.
 *
 * @param nowMs - Current timestamp for tests.
 * @returns True for recent `popstate` or `back_forward` document loads.
 */
export function shouldTreatAsBackNavigation(nowMs: number = Date.now()): boolean {
  return wasRecentHistoryPopNavigation(nowMs) || isBackForwardNavigation();
}

/**
 * Resolve soft-refresh and hard-reload delays for a stuck loader.
 *
 * @param isBackNavigation - When true, use {@link LOADER_BACK_REFRESH_DELAY_MS} timings.
 * @param reloadOverrideMs - Optional hard-reload override from component props.
 * @returns Recovery delay pair.
 */
export function resolveLoaderRecoveryDelays(
  isBackNavigation: boolean,
  reloadOverrideMs?: number,
): LoaderRecoveryDelays {
  const reloadMs =
    Number.isFinite(reloadOverrideMs) && (reloadOverrideMs as number) > 0
      ? (reloadOverrideMs as number)
      : isBackNavigation
        ? LOADER_BACK_RELOAD_DELAY_MS
        : LOADER_DEFAULT_RELOAD_DELAY_MS;

  return {
    refreshMs: isBackNavigation
      ? LOADER_BACK_REFRESH_DELAY_MS
      : LOADER_DEFAULT_REFRESH_DELAY_MS,
    reloadMs,
  };
}
