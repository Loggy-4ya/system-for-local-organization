/**
 * @fileoverview Browser client for page view and like engagement APIs.
 *
 * @module src/lib/pageEngagementClient
 */

/** View count API response. */
export interface PageViewResult {
  viewCount: number;
  counted: boolean;
}

/** Like toggle API response. */
export interface PageLikeResult {
  liked: boolean;
  likeCount: number;
}

/**
 * Record a page view (deduped server-side via cookie).
 *
 * @param pagePath - Normalised page path.
 * @returns Updated view count payload.
 */
export async function recordPageView(pagePath: string): Promise<PageViewResult> {
  const res = await fetch("/api/pages/view", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: pagePath }),
  });
  if (!res.ok) {
    throw new Error("Failed to record page view.");
  }
  return (await res.json()) as PageViewResult;
}

/**
 * Toggle the current user's like on a page.
 *
 * @param pagePath - Normalised page path.
 * @returns Updated like state.
 */
export async function togglePageLike(pagePath: string): Promise<PageLikeResult> {
  const res = await fetch("/api/pages/like", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: pagePath }),
  });
  if (!res.ok) {
    const payload = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(payload.error ?? "Failed to toggle like.");
  }
  return (await res.json()) as PageLikeResult;
}
