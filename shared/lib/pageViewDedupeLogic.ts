/**
 * @fileoverview View-count deduplication helpers for anonymous page viewers.
 *
 * Tests: `npm run test:page-view-dedupe`
 * Registry: `.ai/docs/testing.md`
 *
 * @module shared/lib/pageViewDedupeLogic
 */

/** Default dedupe window — one counted view per path per browser per day. */
export const PAGE_VIEW_DEDUPE_TTL_SECONDS = 24 * 60 * 60;

/**
 * Build a cookie name for a page view dedupe token.
 *
 * @param pagePath - Normalised page path.
 * @returns Cookie key safe for HTTP headers.
 */
export function buildPageViewCookieName(pagePath: string): string {
  const slug = pagePath.replace(/^\//, "").replace(/[^a-zA-Z0-9_-]/g, "_") || "root";
  return `nexus_pv_${slug}`;
}

/**
 * Whether a view should increment the counter given an existing dedupe cookie value.
 *
 * @param existingValue - Current cookie value (`1` means already counted).
 * @returns True when the view count should increment.
 */
export function shouldIncrementPageView(existingValue: string | undefined): boolean {
  return existingValue !== "1";
}
