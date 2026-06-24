/**
 * @fileoverview Consolidated comment domain for Puck news pages.
 *
 * Handles threaded comments on pages (`targetType: news`, `targetId: page path`),
 * including replies and per-comment like/dislike votes.
 *
 * @module shared/domains/CommentDomain
 *
 * Tests: `npm run test:page-comment-logic`
 * Registry: `.ai/docs/testing.md`
 */

import connectDB from "@shared/lib/db";
import {
  clampListPageSize,
  pageToSkip,
} from "@shared/lib/listPaginationLogic";
import { GeneralRulesDomain } from "@shared/domains/GeneralRulesDomain";
import {
  DEFAULT_LIST_PAGE_SIZE,
  type PaginatedListMeta,
} from "@shared/constants/listPagination";
import {
  getPageCommentValidationError,
  isNonEmptyPageCommentBody,
  normalizePageCommentBody,
} from "@shared/lib/pageCommentLogic";
import {
  getCachedPageCommentCount,
  invalidatePageCommentCountCache,
  setCachedPageCommentCount,
} from "@shared/lib/pageCommentCountCache";
import { isPagePubliclyVisible } from "@shared/lib/pagePublicationLogic";
import { resolveUserDisplayLabel } from "@shared/lib/userSociumHelpers";
import CommentVote, { type CommentVotePolarity } from "@shared/models/CommentVote";
import Page from "@shared/models/Page";
import User from "@shared/models/User";
import { UserComment } from "@shared/models/UserEngagement";
import { Types } from "mongoose";
import { PageDomain, PageDomainError } from "@shared/domains/PageDomain";

/** Lean projection for comment list/read DTO mapping. */
const COMMENT_LIST_PROJECTION =
  "_id userId body likeCount dislikeCount authorHearted createdAt parentCommentId";

/** Serializable comment author slice. */
export interface CommentAuthorDto {
  /** Author user id. */
  userId: string;
  /** Resolved display label. */
  displayName: string;
  /** Avatar URL or null. */
  avatar: string | null;
}

/** Serializable comment row returned to clients. */
export interface PageCommentDto {
  /** Comment document id. */
  id: string;
  /** Sanitized HTML or legacy plain-text body. */
  body: string;
  /** ISO creation timestamp. */
  createdAt: string;
  /** Hydrated author profile. */
  author: CommentAuthorDto;
  /** Denormalized like count. */
  likeCount: number;
  /** Denormalized dislike count. */
  dislikeCount: number;
  /** Current session user's vote, if any. */
  userVote: CommentVotePolarity | null;
  /** Whether the commenter is the page author (distinct label styling). */
  isPageAuthorComment: boolean;
  /** Whether the page author hearted this comment. */
  authorHearted: boolean;
  /** Total direct replies (may exceed {@link replies} length until expanded). */
  replyCount: number;
  /** Direct replies nested under this top-level comment. */
  replies: PageCommentDto[];
}

/** Options for {@link CommentDomain.listPageComments}. */
export interface ListPageCommentsOptions {
  /** When true, hydrate nested replies in the same request (heavier). */
  includeReplies?: boolean;
}

/** Paginated comment list payload. */
export interface PageCommentListResult {
  /** Top-level comments for the requested page. */
  comments: PageCommentDto[];
  /** Pagination metadata. */
  meta: PaginatedListMeta;
}

/**
 * Domain-level error with an HTTP status hint for API routes.
 */
export class CommentDomainError extends Error {
  /** Suggested HTTP status for API responses. */
  readonly httpStatus: number;

  /**
   * @param message - User-facing error message.
   * @param httpStatus - Suggested HTTP status code.
   */
  constructor(message: string, httpStatus: number) {
    super(message);
    this.name = "CommentDomainError";
    this.httpStatus = httpStatus;
  }
}

/**
 * Consolidated engine for page comment reads and mutations.
 */
export class CommentDomain {
  /**
   * Assert that comments are enabled and the page is publicly visible.
   *
   * @param pagePath - Normalised MongoDB page path.
   * @throws {@link CommentDomainError} When comments are unavailable.
   */
  public static async assertCommentsAvailable(pagePath: string): Promise<void> {
    await connectDB();
    const doc = await Page.findOne({ path: pagePath }).lean();
    if (!doc || !PageDomain.isPubliclyVisible(doc)) {
      throw new CommentDomainError("Page not found.", 404);
    }
    if (!doc.commentsEnabled) {
      throw new CommentDomainError("Comments are disabled for this page.", 403);
    }
  }

  /**
   * Count top-level comments on a page (for launcher badges).
   *
   * @param pagePath - Normalised page path.
   * @returns Total top-level comment count.
   */
  public static async countTopLevelComments(pagePath: string): Promise<number> {
    const cached = getCachedPageCommentCount(pagePath);
    if (cached !== null) return cached;

    await connectDB();
    const count = await UserComment.countDocuments({
      targetType: "news",
      targetId: pagePath,
      parentCommentId: null,
    });
    setCachedPageCommentCount(pagePath, count);
    return count;
  }

  /**
   * List top-level comments ranked by likes for the YouTube-style preview strip.
   *
   * Falls back to newest comments when no liked rows exist yet.
   *
   * @param pagePath - Normalised page path.
   * @param viewerUserId - Optional session user for vote hydration.
   * @param limit - Maximum rows (clamped 1–10).
   * @returns Top liked comment DTOs without nested replies.
   */
  public static async listTopLikedComments(
    pagePath: string,
    viewerUserId: string | null,
    limit = 5,
  ): Promise<PageCommentDto[]> {
    await CommentDomain.assertCommentsAvailable(pagePath);

    const safeLimit = Math.min(10, Math.max(1, limit));
    const filter = {
      targetType: "news" as const,
      targetId: pagePath,
      parentCommentId: null,
    };

    const [pageAuthorUserId, likedRows] = await Promise.all([
      CommentDomain.resolvePageAuthorUserId(pagePath),
      UserComment.find({ ...filter, likeCount: { $gt: 0 } })
        .select(COMMENT_LIST_PROJECTION)
        .sort({ likeCount: -1, createdAt: -1 })
        .limit(safeLimit)
        .lean(),
    ]);

    const topLevelRows =
      likedRows.length > 0
        ? likedRows
        : await UserComment.find(filter)
            .select(COMMENT_LIST_PROJECTION)
            .sort({ createdAt: -1 })
            .limit(safeLimit)
            .lean();

    const authorMap = await CommentDomain.resolveAuthors(
      topLevelRows.map((row) => String(row.userId)),
    );
    const voteMap = await CommentDomain.resolveUserVotes(
      topLevelRows.map((row) => String(row._id)),
      viewerUserId,
    );

    return topLevelRows.map((row) =>
      CommentDomain.toDto(row, authorMap, voteMap, [], 0, pageAuthorUserId),
    );
  }

  /**
   * List top-level comments with nested replies for a page.
   *
   * @param pagePath - Normalised page path.
   * @param viewerUserId - Optional session user for vote hydration.
   * @param page - 1-based page index.
   * @param limit - Rows per page (clamped).
   * @returns Paginated comment tree.
   */
  public static async listPageComments(
    pagePath: string,
    viewerUserId: string | null,
    page = 1,
    limit = DEFAULT_LIST_PAGE_SIZE,
    options: ListPageCommentsOptions = {},
  ): Promise<PageCommentListResult> {
    await CommentDomain.assertCommentsAvailable(pagePath);

    const includeReplies = options.includeReplies ?? false;
    const safeLimit = clampListPageSize(limit, DEFAULT_LIST_PAGE_SIZE);
    const safePage = Math.max(1, page);
    const skip = pageToSkip(safePage, safeLimit);

    const filter = {
      targetType: "news" as const,
      targetId: pagePath,
      parentCommentId: null,
    };

    const [totalCount, topLevelRows, pageAuthorUserId] = await Promise.all([
      CommentDomain.countTopLevelComments(pagePath),
      UserComment.find(filter)
        .select(COMMENT_LIST_PROJECTION)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(safeLimit)
        .lean(),
      CommentDomain.resolvePageAuthorUserId(pagePath),
    ]);

    const topLevelIds = topLevelRows.map((row) => row._id);
    const replyCountByParent = await CommentDomain.countRepliesByParent(topLevelIds);

    type LeanCommentRow = {
      _id: Types.ObjectId;
      userId: Types.ObjectId;
      body: string;
      likeCount?: number;
      dislikeCount?: number;
      authorHearted?: boolean;
      createdAt: Date;
      parentCommentId?: Types.ObjectId | null;
    };

    let replyRows: LeanCommentRow[] = [];

    if (includeReplies && topLevelIds.length > 0) {
      replyRows = (await UserComment.find({
        parentCommentId: { $in: topLevelIds },
      })
        .select(COMMENT_LIST_PROJECTION)
        .sort({ createdAt: 1 })
        .lean()) as LeanCommentRow[];
    }

    const allRows: LeanCommentRow[] = includeReplies
      ? [...(topLevelRows as LeanCommentRow[]), ...replyRows]
      : (topLevelRows as LeanCommentRow[]);
    const authorMap = await CommentDomain.resolveAuthors(allRows.map((row) => String(row.userId)));
    const voteMap = await CommentDomain.resolveUserVotes(
      allRows.map((row) => String(row._id)),
      viewerUserId,
    );

    const repliesByParent = new Map<string, LeanCommentRow[]>();
    if (includeReplies) {
      for (const reply of replyRows) {
        const parentId = String(reply.parentCommentId);
        const bucket = repliesByParent.get(parentId) ?? [];
        bucket.push(reply);
        repliesByParent.set(parentId, bucket);
      }
    }

    const comments = topLevelRows.map((row) => {
      const id = String(row._id);
      return CommentDomain.toDto(
        row,
        authorMap,
        voteMap,
        repliesByParent.get(id) ?? [],
        replyCountByParent.get(id) ?? 0,
        pageAuthorUserId,
      );
    });

    const totalPages = Math.max(1, Math.ceil(totalCount / safeLimit));

    return {
      comments,
      meta: {
        page: safePage,
        limit: safeLimit,
        totalCount,
        totalPages,
      },
    };
  }

  /**
   * List replies for a single top-level comment (lazy thread expansion).
   *
   * @param parentCommentId - Parent comment document id.
   * @param viewerUserId - Optional session user for vote hydration.
   * @returns Reply rows oldest-first.
   */
  public static async listCommentReplies(
    parentCommentId: string,
    viewerUserId: string | null,
  ): Promise<PageCommentDto[]> {
    await connectDB();
    const parent = await UserComment.findById(parentCommentId).lean();
    if (!parent || parent.parentCommentId) {
      throw new CommentDomainError("Comment thread not found.", 404);
    }

    await CommentDomain.assertCommentsAvailable(parent.targetId);

    const [replyRows, pageAuthorUserId] = await Promise.all([
      UserComment.find({
        parentCommentId: parent._id,
      })
        .select(COMMENT_LIST_PROJECTION)
        .sort({ createdAt: 1 })
        .lean(),
      CommentDomain.resolvePageAuthorUserId(parent.targetId),
    ]);

    const authorMap = await CommentDomain.resolveAuthors(
      replyRows.map((row) => String(row.userId)),
    );
    const voteMap = await CommentDomain.resolveUserVotes(
      replyRows.map((row) => String(row._id)),
      viewerUserId,
    );

    return replyRows.map((row) =>
      CommentDomain.toDto(row, authorMap, voteMap, [], 0, pageAuthorUserId),
    );
  }

  /**
   * Count direct replies for a batch of parent comment ids.
   *
   * @param parentIds - Parent comment ObjectIds.
   * @returns Map keyed by parent id string.
   */
  private static async countRepliesByParent(
    parentIds: Types.ObjectId[],
  ): Promise<Map<string, number>> {
    const map = new Map<string, number>();
    if (parentIds.length === 0) {
      return map;
    }

    const rows = await UserComment.aggregate<{ _id: Types.ObjectId; count: number }>([
      { $match: { parentCommentId: { $in: parentIds } } },
      { $group: { _id: "$parentCommentId", count: { $sum: 1 } } },
    ]);

    for (const row of rows) {
      map.set(String(row._id), row.count);
    }
    return map;
  }

  /**
   * Create a top-level comment or reply on a page.
   *
   * @param pagePath - Normalised page path.
   * @param userId - Authenticated author id.
   * @param rawBody - Submitted comment text.
   * @param parentCommentId - Optional parent id for replies.
   * @returns Created comment DTO without nested replies.
   */
  public static async createPageComment(
    pagePath: string,
    userId: string,
    rawBody: string,
    parentCommentId?: string | null,
  ): Promise<PageCommentDto> {
    await CommentDomain.assertCommentsAvailable(pagePath);
    await GeneralRulesDomain.ensureLoaded();

    const policyError = getPageCommentValidationError(rawBody);
    if (policyError) {
      throw new CommentDomainError(policyError, 400);
    }

    const body = normalizePageCommentBody(rawBody);
    if (!isNonEmptyPageCommentBody(body)) {
      throw new CommentDomainError("Comment cannot be empty.", 400);
    }

    let parentId: Types.ObjectId | null = null;
    if (parentCommentId?.trim()) {
      const parent = await UserComment.findById(parentCommentId).lean();
      if (
        !parent ||
        parent.targetType !== "news" ||
        parent.targetId !== pagePath ||
        parent.parentCommentId
      ) {
        throw new CommentDomainError("Parent comment not found.", 404);
      }
      parentId = parent._id as Types.ObjectId;
    }

    const created = await UserComment.create({
      userId,
      targetType: "news",
      targetId: pagePath,
      parentCommentId: parentId,
      body,
      likeCount: 0,
      dislikeCount: 0,
      authorHearted: false,
    });

    invalidatePageCommentCountCache(pagePath);

    const [authorMap, pageAuthorUserId] = await Promise.all([
      CommentDomain.resolveAuthors([userId]),
      CommentDomain.resolvePageAuthorUserId(pagePath),
    ]);
    return CommentDomain.toDto(
      created.toObject(),
      authorMap,
      new Map(),
      [],
      0,
      pageAuthorUserId,
    );
  }

  /**
   * Toggle or switch the current user's vote on a comment.
   *
   * @param commentId - Target comment id.
   * @param userId - Authenticated voter id.
   * @param vote - Requested like or dislike polarity.
   * @returns Updated counts and the user's active vote.
   */
  public static async setCommentVote(
    commentId: string,
    userId: string,
    vote: CommentVotePolarity,
  ): Promise<{ likeCount: number; dislikeCount: number; userVote: CommentVotePolarity | null }> {
    await connectDB();
    const comment = await UserComment.findById(commentId);
    if (!comment) {
      throw new CommentDomainError("Comment not found.", 404);
    }

    const page = await Page.findOne({
      path: comment.targetId,
      commentsEnabled: true,
    }).lean();
    if (!page || !isPagePubliclyVisible(page)) {
      throw new CommentDomainError("Comments are not available.", 403);
    }

    const existing = await CommentVote.findOne({
      commentId: comment._id,
      userId,
    });

    if (!existing) {
      await CommentVote.create({ commentId: comment._id, userId, vote });
      if (vote === "like") {
        comment.likeCount += 1;
      } else {
        comment.dislikeCount += 1;
      }
      await comment.save();
      return {
        likeCount: comment.likeCount,
        dislikeCount: comment.dislikeCount,
        userVote: vote,
      };
    }

    if (existing.vote === vote) {
      await CommentVote.deleteOne({ _id: existing._id });
      if (vote === "like") {
        comment.likeCount = Math.max(0, comment.likeCount - 1);
      } else {
        comment.dislikeCount = Math.max(0, comment.dislikeCount - 1);
      }
      await comment.save();
      return {
        likeCount: comment.likeCount,
        dislikeCount: comment.dislikeCount,
        userVote: null,
      };
    }

    const previousVote = existing.vote;
    existing.vote = vote;
    await existing.save();

    if (previousVote === "like") {
      comment.likeCount = Math.max(0, comment.likeCount - 1);
      comment.dislikeCount += 1;
    } else {
      comment.dislikeCount = Math.max(0, comment.dislikeCount - 1);
      comment.likeCount += 1;
    }
    await comment.save();

    return {
      likeCount: comment.likeCount,
      dislikeCount: comment.dislikeCount,
      userVote: vote,
    };
  }

  /**
   * Toggle the page author's heart on a comment (YouTube-style creator love).
   *
   * @param commentId - Target comment id.
   * @param actorUserId - Authenticated user id (must match page author).
   * @returns Whether the comment is now hearted by the author.
   */
  public static async toggleAuthorHeart(
    commentId: string,
    actorUserId: string,
  ): Promise<{ authorHearted: boolean }> {
    await connectDB();
    const comment = await UserComment.findById(commentId);
    if (!comment) {
      throw new CommentDomainError("Comment not found.", 404);
    }

    const page = await Page.findOne({
      path: comment.targetId,
      commentsEnabled: true,
    }).lean();
    if (!page || !isPagePubliclyVisible(page)) {
      throw new CommentDomainError("Comments are not available.", 403);
    }

    if (!page.authorUserId || String(page.authorUserId) !== actorUserId) {
      throw new CommentDomainError("Only the page author can heart comments.", 403);
    }

    comment.authorHearted = !comment.authorHearted;
    await comment.save();

    return { authorHearted: comment.authorHearted };
  }

  /**
   * Map a lean comment document to a client DTO.
   *
   * @param row - MongoDB comment document.
   * @param authorMap - Pre-resolved author profiles keyed by user id.
   * @param voteMap - Pre-resolved viewer votes keyed by comment id.
   * @param replyRows - Nested reply documents.
   * @param replyCount - Total replies when {@link replyRows} is not fully hydrated.
   * @returns Serializable comment tree node.
   */
  private static toDto(
    row: {
      _id: Types.ObjectId | string;
      userId: Types.ObjectId | string;
      body: string;
      likeCount?: number;
      dislikeCount?: number;
      authorHearted?: boolean;
      createdAt: Date;
    },
    authorMap: Map<string, CommentAuthorDto>,
    voteMap: Map<string, CommentVotePolarity>,
    replyRows: Array<{
      _id: Types.ObjectId | string;
      userId: Types.ObjectId | string;
      body: string;
      likeCount?: number;
      dislikeCount?: number;
      authorHearted?: boolean;
      createdAt: Date;
    }>,
    replyCount = replyRows.length,
    pageAuthorUserId: string | null = null,
  ): PageCommentDto {
    const id = String(row._id);
    const authorUserId = String(row.userId);
    const author =
      authorMap.get(authorUserId) ??
      ({
        userId: authorUserId,
        displayName: "Member",
        avatar: null,
      } satisfies CommentAuthorDto);

    return {
      id,
      body: row.body,
      createdAt: new Date(row.createdAt).toISOString(),
      author,
      likeCount: row.likeCount ?? 0,
      dislikeCount: row.dislikeCount ?? 0,
      userVote: voteMap.get(id) ?? null,
      isPageAuthorComment:
        pageAuthorUserId !== null && authorUserId === pageAuthorUserId,
      authorHearted: row.authorHearted ?? false,
      replyCount,
      replies: replyRows.map((reply) =>
        CommentDomain.toDto(reply, authorMap, voteMap, [], 0, pageAuthorUserId),
      ),
    };
  }

  /**
   * Resolve the page author's user id for comment author badges.
   *
   * @param pagePath - Normalised page path.
   * @returns Author user id string or null when unset.
   */
  private static async resolvePageAuthorUserId(pagePath: string): Promise<string | null> {
    const page = await Page.findOne({ path: pagePath }).select("authorUserId").lean();
    return page?.authorUserId ? String(page.authorUserId) : null;
  }

  /**
   * Resolve author display data for a set of user ids.
   *
   * @param userIds - Unique user id strings.
   * @returns Map keyed by user id.
   */
  private static async resolveAuthors(
    userIds: string[],
  ): Promise<Map<string, CommentAuthorDto>> {
    const uniqueIds = [...new Set(userIds.filter(Boolean))];
    if (uniqueIds.length === 0) {
      return new Map();
    }

    const users = await User.find({ _id: { $in: uniqueIds } })
      .select("name surname login avatar")
      .lean();
    const map = new Map<string, CommentAuthorDto>();
    for (const user of users) {
      map.set(String(user._id), {
        userId: String(user._id),
        displayName:
          resolveUserDisplayLabel({
            name: user.name,
            surname: user.surname,
            login: user.login,
          }) || "Member",
        avatar: user.avatar?.trim() || null,
      });
    }
    return map;
  }

  /**
   * Resolve the viewer's votes for a batch of comment ids.
   *
   * @param commentIds - Comment id strings.
   * @param viewerUserId - Session user id or null.
   * @returns Map keyed by comment id.
   */
  private static async resolveUserVotes(
    commentIds: string[],
    viewerUserId: string | null,
  ): Promise<Map<string, CommentVotePolarity>> {
    const map = new Map<string, CommentVotePolarity>();
    if (!viewerUserId || commentIds.length === 0) {
      return map;
    }

    const votes = await CommentVote.find({
      commentId: { $in: commentIds },
      userId: viewerUserId,
    }).lean();

    for (const vote of votes) {
      map.set(String(vote.commentId), vote.vote);
    }
    return map;
  }
}

export default CommentDomain;
