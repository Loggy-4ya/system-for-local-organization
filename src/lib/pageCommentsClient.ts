/**
 * @fileoverview Browser client for page comment APIs.
 *
 * Uses {@link module:src/lib/pageCommentsClientCache} for deduped short-TTL caching.
 *
 * @module src/lib/pageCommentsClient
 */

import type { PageCommentDto, PageCommentListResult } from "@shared/domains/CommentDomain";
import type { CommentVotePolarity } from "@shared/models/CommentVote";
import {
  fetchPageCommentsCached,
  invalidatePageCommentsClientCache,
  PAGE_COMMENTS_COUNT_CLIENT_TTL_MS,
  PAGE_COMMENTS_LIST_CLIENT_TTL_MS,
  PAGE_COMMENTS_REPLIES_CLIENT_TTL_MS,
  pageCommentsCacheKeys,
} from "@/lib/pageCommentsClientCache";

/** Default page size for comment list / infinite scroll batches. */
export const PAGE_COMMENTS_BATCH_SIZE = 15;

/** Comment vote API response. */
export interface CommentVoteResult {
  likeCount: number;
  dislikeCount: number;
  userVote: CommentVotePolarity | null;
}

/** Author heart toggle API response. */
export interface CommentAuthorHeartResult {
  authorHearted: boolean;
}

/** Options for {@link fetchPageComments}. */
export interface FetchPageCommentsOptions {
  /** 1-based page index. */
  page?: number;
  /** Rows per page. */
  limit?: number;
  /** Hydrate nested replies in the same request. */
  includeReplies?: boolean;
  /** Skip read-through cache (after local mutations). */
  bypassCache?: boolean;
}

/**
 * Fetch paginated comments for a page.
 *
 * @param pagePath - Normalised page path.
 * @param options - Pagination and hydration flags.
 * @returns Comment list payload.
 */
export async function fetchPageComments(
  pagePath: string,
  options: FetchPageCommentsOptions = {},
): Promise<PageCommentListResult> {
  const page = options.page ?? 1;
  const limit = options.limit ?? PAGE_COMMENTS_BATCH_SIZE;
  const includeReplies = options.includeReplies ?? false;
  const cacheKey = pageCommentsCacheKeys.list(pagePath, page, limit);

  const load = async () => {
    const params = new URLSearchParams({
      path: pagePath,
      page: String(page),
      limit: String(limit),
      includeReplies: includeReplies ? "true" : "false",
    });
    const res = await fetch(`/api/pages/comments?${params.toString()}`);
    if (!res.ok) {
      const payload = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(payload.error ?? "Failed to load comments.");
    }
    return (await res.json()) as PageCommentListResult;
  };

  if (options.bypassCache) {
    return load();
  }

  return fetchPageCommentsCached(cacheKey, PAGE_COMMENTS_LIST_CLIENT_TTL_MS, load);
}

/**
 * Fetch the top-level comment count for a page launcher badge.
 *
 * @param pagePath - Normalised page path.
 * @param options - Optional cache bypass.
 * @returns Total top-level comment count.
 */
export async function fetchPageCommentCount(
  pagePath: string,
  options: { bypassCache?: boolean } = {},
): Promise<number> {
  const cacheKey = pageCommentsCacheKeys.count(pagePath);

  const load = async () => {
    const params = new URLSearchParams({ path: pagePath });
    const res = await fetch(`/api/pages/comments/count?${params.toString()}`);
    if (!res.ok) {
      return 0;
    }
    const payload = (await res.json()) as { count?: number };
    return payload.count ?? 0;
  };

  if (options.bypassCache) {
    return load();
  }

  return fetchPageCommentsCached(cacheKey, PAGE_COMMENTS_COUNT_CLIENT_TTL_MS, load);
}

/**
 * Lazy-load replies for a comment thread.
 *
 * @param parentCommentId - Top-level comment id.
 * @param options - Optional cache bypass.
 * @returns Reply rows oldest-first.
 */
export async function fetchCommentReplies(
  parentCommentId: string,
  options: { bypassCache?: boolean } = {},
): Promise<PageCommentDto[]> {
  const cacheKey = pageCommentsCacheKeys.replies(parentCommentId);

  const load = async () => {
    const params = new URLSearchParams({ parentCommentId });
    const res = await fetch(`/api/pages/comments/replies?${params.toString()}`);
    if (!res.ok) {
      const payload = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(payload.error ?? "Failed to load replies.");
    }
    const payload = (await res.json()) as { replies: PageCommentDto[] };
    return payload.replies ?? [];
  };

  if (options.bypassCache) {
    return load();
  }

  return fetchPageCommentsCached(cacheKey, PAGE_COMMENTS_REPLIES_CLIENT_TTL_MS, load);
}

/**
 * Post a new comment or reply.
 *
 * @param pagePath - Normalised page path.
 * @param body - Comment text.
 * @param parentCommentId - Optional parent id for replies.
 * @returns Created comment row.
 */
export async function postPageComment(
  pagePath: string,
  body: string,
  parentCommentId?: string | null,
): Promise<PageCommentDto> {
  const res = await fetch("/api/pages/comments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: pagePath, body, parentCommentId }),
  });
  if (!res.ok) {
    const payload = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(payload.error ?? "Failed to post comment.");
  }
  const payload = (await res.json()) as { comment: PageCommentDto };
  invalidatePageCommentsClientCache(pagePath);
  return payload.comment;
}

/**
 * Toggle like/dislike on a comment.
 *
 * @param commentId - Target comment id.
 * @param vote - Requested polarity.
 * @returns Updated counts and active vote.
 */
export async function voteOnPageComment(
  commentId: string,
  vote: CommentVotePolarity,
): Promise<CommentVoteResult> {
  const res = await fetch("/api/pages/comments/vote", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ commentId, vote }),
  });
  if (!res.ok) {
    const payload = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(payload.error ?? "Failed to update vote.");
  }
  return (await res.json()) as CommentVoteResult;
}

/**
 * Fetch top liked comments for the preview strip.
 *
 * @param pagePath - Normalised page path.
 * @param limit - Maximum rows (default 5).
 * @param options - Optional cache bypass.
 * @returns Top liked comment rows.
 */
export async function fetchTopLikedPageComments(
  pagePath: string,
  limit = 5,
  options: { bypassCache?: boolean } = {},
): Promise<PageCommentDto[]> {
  const cacheKey = pageCommentsCacheKeys.topLiked(pagePath, limit);

  const load = async () => {
    const params = new URLSearchParams({
      path: pagePath,
      limit: String(limit),
    });
    const res = await fetch(`/api/pages/comments/top-liked?${params.toString()}`);
    if (!res.ok) {
      const payload = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(payload.error ?? "Failed to load top comments.");
    }
    const payload = (await res.json()) as { comments?: PageCommentDto[] };
    return payload.comments ?? [];
  };

  if (options.bypassCache) {
    return load();
  }

  return fetchPageCommentsCached(cacheKey, PAGE_COMMENTS_LIST_CLIENT_TTL_MS, load);
}

/**
 * Toggle the page author's heart on a comment.
 *
 * @param commentId - Target comment id.
 * @returns Whether the comment is now hearted by the author.
 */
export async function toggleCommentAuthorHeart(
  commentId: string,
): Promise<CommentAuthorHeartResult> {
  const res = await fetch("/api/pages/comments/author-heart", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ commentId }),
  });
  if (!res.ok) {
    const payload = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(payload.error ?? "Failed to update author heart.");
  }
  return (await res.json()) as CommentAuthorHeartResult;
}

export { invalidatePageCommentsClientCache };
