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

/** Unified page like/dislike toggle API response. */
export interface PageEngagementResult {
  liked: boolean;
  likeCount: number;
  disliked: boolean;
  dislikeCount: number;
}

/** @deprecated Use {@link PageEngagementResult} — kept for call-site clarity. */
export type PageLikeResult = PageEngagementResult;

/** @deprecated Use {@link PageEngagementResult} — kept for call-site clarity. */
export type PageDislikeResult = PageEngagementResult;

const EMPTY_VIEW_RESULT: PageViewResult = { viewCount: 0, counted: false };

/**
 * Record a page view (deduped server-side via cookie).
 *
 * Best-effort only — failures are swallowed so public pages never surface
 * console errors when a view cannot be counted (draft page, path mismatch, etc.).
 *
 * @param pagePath - Normalised page path.
 * @returns Updated view count payload, or a zero-count fallback.
 */
export async function recordPageView(pagePath: string): Promise<PageViewResult> {
  try {
    const res = await fetch("/api/pages/view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: pagePath }),
    });
    if (!res.ok) {
      return EMPTY_VIEW_RESULT;
    }
    return (await res.json()) as PageViewResult;
  } catch {
    return EMPTY_VIEW_RESULT;
  }
}

/**
 * Toggle the current user's like on a page.
 *
 * @param pagePath - Normalised page path.
 * @returns Updated like state.
 */
export async function togglePageLike(pagePath: string): Promise<PageEngagementResult> {
  const res = await fetch("/api/pages/like", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: pagePath }),
  });
  if (!res.ok) {
    const payload = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(payload.error ?? "Failed to toggle like.");
  }
  return (await res.json()) as PageEngagementResult;
}

/**
 * Toggle the current user's dislike on a page.
 *
 * @param pagePath - Normalised page path.
 * @returns Updated engagement state (mutually exclusive with like).
 */
export async function togglePageDislike(pagePath: string): Promise<PageEngagementResult> {
  const res = await fetch("/api/pages/dislike", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: pagePath }),
  });
  if (!res.ok) {
    const payload = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(payload.error ?? "Failed to toggle dislike.");
  }
  return (await res.json()) as PageEngagementResult;
}
