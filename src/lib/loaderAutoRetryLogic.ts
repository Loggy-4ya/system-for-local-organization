/**
 * @fileoverview Session-scoped auto-reload guards for stuck route loaders.
 *
 * Prevents infinite reload loops by capping retries per pathname per tab session.
 *
 * Run: `npm run test:loader-auto-retry`
 * Registry: `.ai/docs/testing.md`
 *
 * @module src/lib/loaderAutoRetryLogic
 */

/** Default delay before a stuck loader triggers `location.reload()` (non-history nav). */
export const LOADER_AUTO_RETRY_DELAY_MS = 4_500;

/** Maximum automatic reload attempts per pathname in one browser tab session. */
export const LOADER_AUTO_RETRY_MAX = 2;

/** Storage key prefix for retry counters (`{prefix}{pathname}`). */
export const LOADER_AUTO_RETRY_STORAGE_PREFIX = "nexus-loader-retry:";

/**
 * Build the sessionStorage key for a pathname retry counter.
 *
 * @param pathname - Current route pathname (e.g. `/news`).
 * @returns Session storage key.
 */
export function loaderAutoRetryStorageKey(pathname: string): string {
  return `${LOADER_AUTO_RETRY_STORAGE_PREFIX}${pathname || "/"}`;
}

/**
 * Read how many automatic reloads already ran for this pathname.
 *
 * @param pathname - Current route pathname.
 * @param readCount - Storage reader (defaults to sessionStorage in the browser).
 * @returns Non-negative retry count.
 */
export function readLoaderAutoRetryCount(
  pathname: string,
  readCount: (key: string) => string | null = (key) => {
    try {
      return sessionStorage.getItem(key);
    } catch {
      return null;
    }
  },
): number {
  const raw = readCount(loaderAutoRetryStorageKey(pathname));
  const parsed = raw ? Number.parseInt(raw, 10) : 0;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

/**
 * Whether another automatic reload is allowed for this pathname.
 *
 * @param pathname - Current route pathname.
 * @param readCount - Optional storage reader override for tests.
 * @returns True when under {@link LOADER_AUTO_RETRY_MAX}.
 */
export function canLoaderAutoRetry(
  pathname: string,
  readCount?: (key: string) => string | null,
): boolean {
  return readLoaderAutoRetryCount(pathname, readCount) < LOADER_AUTO_RETRY_MAX;
}

/**
 * Increment the automatic reload counter before calling `location.reload()`.
 *
 * @param pathname - Current route pathname.
 * @param writeCount - Storage writer (defaults to sessionStorage).
 */
export function recordLoaderAutoRetry(
  pathname: string,
  writeCount: (key: string, value: string) => void = (key, value) => {
    try {
      sessionStorage.setItem(key, value);
    } catch {
      /* ignore quota / private mode */
    }
  },
  readCount: (key: string) => string | null = (key) => {
    try {
      return sessionStorage.getItem(key);
    } catch {
      return null;
    }
  },
): void {
  const key = loaderAutoRetryStorageKey(pathname);
  const next = readLoaderAutoRetryCount(pathname, readCount) + 1;
  writeCount(key, String(next));
}

/**
 * Clear retry state after a route finishes loading (loader unmounted in time).
 *
 * @param pathname - Current route pathname.
 * @param remove - Storage remover (defaults to sessionStorage).
 */
export function clearLoaderAutoRetry(
  pathname: string,
  remove: (key: string) => void = (key) => {
    try {
      sessionStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  },
): void {
  remove(loaderAutoRetryStorageKey(pathname));
}

/**
 * Resolve the delay until the next automatic reload attempt.
 *
 * @param delayMs - Configured delay; non-finite values fall back to default.
 * @returns Delay in milliseconds.
 */
export function resolveLoaderAutoRetryDelayMs(
  delayMs: number = LOADER_AUTO_RETRY_DELAY_MS,
): number {
  return Number.isFinite(delayMs) && delayMs > 0
    ? delayMs
    : LOADER_AUTO_RETRY_DELAY_MS;
}
