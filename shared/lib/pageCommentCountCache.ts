/**
 * @fileoverview Short-lived in-process cache for page top-level comment counts.
 *
 * Reduces repeated `countDocuments` calls when the launcher badge and list
 * pagination both need the total on the same page view.
 *
 * @module shared/lib/pageCommentCountCache
 *
 * Run: `npm run test:page-comment-count-cache`
 * Registry: `.ai/docs/testing.md`
 */

/** Default TTL for cached comment counts (ms). */
export const PAGE_COMMENT_COUNT_CACHE_TTL_MS = 30_000;

interface CountCacheEntry {
  count: number;
  expiresAt: number;
}

const countCache = new Map<string, CountCacheEntry>();

/**
 * Read a cached top-level comment count when still fresh.
 *
 * @param pagePath - Normalised page path key.
 * @returns Cached count or null when missing/expired.
 */
export function getCachedPageCommentCount(pagePath: string): number | null {
  const entry = countCache.get(pagePath);
  if (!entry) return null;
  if (Date.now() >= entry.expiresAt) {
    countCache.delete(pagePath);
    return null;
  }
  return entry.count;
}

/**
 * Store a top-level comment count in the process cache.
 *
 * @param pagePath - Normalised page path key.
 * @param count - Total top-level comments.
 * @param ttlMs - Optional TTL override.
 */
export function setCachedPageCommentCount(
  pagePath: string,
  count: number,
  ttlMs: number = PAGE_COMMENT_COUNT_CACHE_TTL_MS,
): void {
  countCache.set(pagePath, {
    count: Math.max(0, count),
    expiresAt: Date.now() + Math.max(1_000, ttlMs),
  });
}

/**
 * Drop cached count for a page — call after create/delete mutations.
 *
 * @param pagePath - Normalised page path key.
 */
export function invalidatePageCommentCountCache(pagePath: string): void {
  countCache.delete(pagePath);
}

/**
 * Clear all cached counts — test helper.
 */
export function clearPageCommentCountCache(): void {
  countCache.clear();
}
