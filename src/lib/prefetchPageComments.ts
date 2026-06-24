/**
 * @fileoverview Warm comment APIs before the drawer opens (hover / idle prefetch).
 *
 * @module src/lib/prefetchPageComments
 */

import type { CommentsViewMode } from "@shared/lib/pageCommentsLayoutLogic";
import {
  fetchPageCommentCount,
  fetchPageComments,
  fetchTopLikedPageComments,
  PAGE_COMMENTS_BATCH_SIZE,
} from "@/lib/pageCommentsClient";
import { runWhenBrowserIdle } from "@/lib/pageCommentsClientCache";

/** Options for {@link prefetchPageCommentsRegion}. */
export interface PrefetchPageCommentsOptions {
  /** Surface style controlling which endpoints to warm. */
  viewMode?: CommentsViewMode;
  /** Whether the count badge still needs hydration. */
  needsCount?: boolean;
}

/**
 * Prefetch comment data for a page during idle time or pointer hover.
 *
 * @param pagePath - Normalised page path.
 * @param options - Region flags.
 */
export function prefetchPageCommentsRegion(
  pagePath: string,
  options: PrefetchPageCommentsOptions = {},
): void {
  if (!pagePath) return;

  const viewMode = options.viewMode ?? "launcher";
  const needsCount = options.needsCount ?? true;

  runWhenBrowserIdle(() => {
    const tasks: Array<Promise<unknown>> = [];

    if (needsCount) {
      tasks.push(fetchPageCommentCount(pagePath));
    }

    if (viewMode === "topLiked") {
      tasks.push(fetchTopLikedPageComments(pagePath, 5));
    } else {
      tasks.push(
        fetchPageComments(pagePath, {
          page: 1,
          limit: PAGE_COMMENTS_BATCH_SIZE,
          includeReplies: false,
        }),
      );
    }

    void Promise.allSettled(tasks);
  });
}

export default prefetchPageCommentsRegion;
