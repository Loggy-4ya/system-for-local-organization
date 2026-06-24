/**
 * @fileoverview Browser-side comment API cache — dedupe inflight fetches + short TTL.
 *
 * @module src/lib/pageCommentsClientCache
 */

import type { PageCommentDto, PageCommentListResult } from "@shared/domains/CommentDomain";

/** TTL for comment count badge (ms). */
export const PAGE_COMMENTS_COUNT_CLIENT_TTL_MS = 60_000;

/** TTL for first-page list + top-liked preview (ms). */
export const PAGE_COMMENTS_LIST_CLIENT_TTL_MS = 30_000;

/** TTL for lazy reply threads (ms). */
export const PAGE_COMMENTS_REPLIES_CLIENT_TTL_MS = 30_000;

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const valueCache = new Map<string, CacheEntry<unknown>>();
const inflightRequests = new Map<string, Promise<unknown>>();

/**
 * Build a stable cache key segment from primitive parts.
 *
 * @param parts - Key segments.
 * @returns Joined cache key.
 */
export function buildPageCommentsCacheKey(...parts: Array<string | number>): string {
  return parts.join(":");
}

/**
 * Read a cached value when still fresh.
 *
 * @param key - Cache key.
 * @returns Cached value or null.
 */
export function readPageCommentsCache<T>(key: string): T | null {
  const entry = valueCache.get(key);
  if (!entry) return null;
  if (Date.now() >= entry.expiresAt) {
    valueCache.delete(key);
    return null;
  }
  return entry.value as T;
}

/**
 * Store a value in the browser cache.
 *
 * @param key - Cache key.
 * @param value - Payload to retain.
 * @param ttlMs - Time-to-live in milliseconds.
 */
export function writePageCommentsCache<T>(key: string, value: T, ttlMs: number): void {
  valueCache.set(key, {
    value,
    expiresAt: Date.now() + Math.max(1_000, ttlMs),
  });
}

/**
 * Fetch with in-memory deduplication and TTL caching.
 *
 * @param key - Cache key.
 * @param ttlMs - TTL for successful responses.
 * @param fetcher - Network loader.
 * @returns Cached or freshly loaded value.
 */
export async function fetchPageCommentsCached<T>(
  key: string,
  ttlMs: number,
  fetcher: () => Promise<T>,
): Promise<T> {
  const cached = readPageCommentsCache<T>(key);
  if (cached !== null) return cached;

  const inflight = inflightRequests.get(key);
  if (inflight) {
    return inflight as Promise<T>;
  }

  const promise = fetcher()
    .then((value) => {
      writePageCommentsCache(key, value, ttlMs);
      inflightRequests.delete(key);
      return value;
    })
    .catch((err) => {
      inflightRequests.delete(key);
      throw err;
    });

  inflightRequests.set(key, promise);
  return promise;
}

/**
 * Apply a partial update to one comment node inside a DTO tree.
 *
 * @param comment - Comment row (may include nested replies).
 * @param commentId - Target comment id.
 * @param patch - Fields to merge onto the matching row.
 * @returns Updated tree with the patch applied when matched.
 */
export function applyPageCommentDtoPatch(
  comment: PageCommentDto,
  commentId: string,
  patch: Partial<PageCommentDto>,
): PageCommentDto {
  if (comment.id === commentId) {
    return { ...comment, ...patch };
  }
  if (comment.replies.length === 0) {
    return comment;
  }
  return {
    ...comment,
    replies: comment.replies.map((reply) =>
      applyPageCommentDtoPatch(reply, commentId, patch),
    ),
  };
}

/**
 * Patch a cached comment row in every list/reply payload for one page.
 *
 * Keeps drawer re-open instant while reflecting vote/heart mutations without
 * waiting for a network round-trip.
 *
 * @param pagePath - Normalised page path.
 * @param commentId - Comment id to update.
 * @param patch - Partial DTO fields (votes, author heart, etc.).
 */
export function patchPageCommentsCacheComment(
  pagePath: string,
  commentId: string,
  patch: Partial<PageCommentDto>,
): void {
  const pagePrefix = `${pagePath}:`;
  const repliesPrefix = "replies:";

  for (const [key, entry] of valueCache.entries()) {
    if (Date.now() >= entry.expiresAt) {
      valueCache.delete(key);
      continue;
    }

    const value = entry.value;

    if (key.startsWith(pagePrefix)) {
      if (
        value &&
        typeof value === "object" &&
        "comments" in value &&
        Array.isArray((value as PageCommentListResult).comments)
      ) {
        const list = value as PageCommentListResult;
        entry.value = {
          ...list,
          comments: list.comments.map((row) =>
            applyPageCommentDtoPatch(row, commentId, patch),
          ),
        };
        continue;
      }

      if (Array.isArray(value)) {
        entry.value = (value as PageCommentDto[]).map((row) =>
          applyPageCommentDtoPatch(row, commentId, patch),
        );
      }
      continue;
    }

    if (
      key.startsWith(repliesPrefix) &&
      Array.isArray(value)
    ) {
      entry.value = (value as PageCommentDto[]).map((row) =>
        applyPageCommentDtoPatch(row, commentId, patch),
      );
    }
  }
}

/**
 * Invalidate all cached comment payloads for one page path.
 *
 * @param pagePath - Normalised page path.
 */
export function invalidatePageCommentsClientCache(pagePath: string): void {
  const prefix = `${pagePath}:`;
  for (const key of valueCache.keys()) {
    if (key.startsWith(prefix)) {
      valueCache.delete(key);
    }
  }
  for (const key of inflightRequests.keys()) {
    if (key.startsWith(prefix)) {
      inflightRequests.delete(key);
    }
  }
}

/**
 * Schedule work during browser idle time when available.
 *
 * @param callback - Deferred task.
 */
export function runWhenBrowserIdle(callback: () => void): void {
  if (typeof window !== "undefined" && "requestIdleCallback" in window) {
    window.requestIdleCallback(() => callback(), { timeout: 2_000 });
    return;
  }
  setTimeout(callback, 0);
}

/** Cache key helpers for typed invalidation. */
export const pageCommentsCacheKeys = {
  count: (pagePath: string) => buildPageCommentsCacheKey(pagePath, "count"),
  list: (pagePath: string, page: number, limit: number) =>
    buildPageCommentsCacheKey(pagePath, "list", page, limit),
  topLiked: (pagePath: string, limit: number) =>
    buildPageCommentsCacheKey(pagePath, "top-liked", limit),
  replies: (parentCommentId: string) =>
    buildPageCommentsCacheKey("replies", parentCommentId),
} as const;

export type { PageCommentDto, PageCommentListResult };
