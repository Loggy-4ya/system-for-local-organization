"use client";

/**
 * @fileoverview Single comment row with lazy reply threads and like/dislike controls.
 *
 * @module src/components/comments/PageCommentRow
 */

import { useCallback, useEffect, useState, memo } from "react";
import { ChevronDown, ChevronUp, Heart, Loader2, ThumbsDown, ThumbsUp } from "lucide-react";
import type { PageCommentDto } from "@shared/domains/CommentDomain";
import { applyEngagementVoteToggle } from "@shared/lib/engagementVoteLogic";
import type { CommentVotePolarity } from "@shared/models/CommentVote";
import { UserAvatarImage } from "@/components/media/UserAvatarImage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  fetchCommentReplies,
  toggleCommentAuthorHeart,
  voteOnPageComment,
} from "@/lib/pageCommentsClient";
import { NexusRichTextView } from "@/components/editor/NexusRichTextView";
import { PageCommentComposer } from "./PageCommentComposer";

/** Props for {@link PageCommentRow}. */
export interface PageCommentRowProps {
  /** Comment tree node. */
  comment: PageCommentDto;
  /** Whether the viewer is signed in. */
  canInteract: boolean;
  /** Page path for reply submissions. */
  pagePath: string;
  /** Whether the signed-in viewer is the page author (can heart comments). */
  canAuthorHeart?: boolean;
  /** Page author display name for hearted-by label. */
  pageAuthorDisplayName?: string | null;
  /** Nesting depth — replies render indented once. */
  depth?: number;
  /** Called after a successful top-level reply refresh. */
  onReplyPosted?: () => void;
  /** Called after vote counts change for optimistic parent sync. */
  onVoteChange?: (commentId: string, patch: Partial<PageCommentDto>) => void;
}

/**
 * Format a relative/short timestamp for comment metadata.
 *
 * @param iso - ISO timestamp string.
 * @returns Human-readable label.
 */
function formatCommentTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Render one comment with reactions and optional inline reply form.
 *
 * @param props - Comment data and interaction handlers.
 * @returns Comment row JSX.
 */
function PageCommentRowComponent({
  comment,
  canInteract,
  pagePath,
  canAuthorHeart = false,
  pageAuthorDisplayName = null,
  depth = 0,
  onReplyPosted,
  onVoteChange,
}: PageCommentRowProps) {
  const [localComment, setLocalComment] = useState(comment);
  const [replies, setReplies] = useState(comment.replies);
  const [threadOpen, setThreadOpen] = useState(false);
  const [threadLoading, setThreadLoading] = useState(false);
  const [threadError, setThreadError] = useState<string | null>(null);
  const [replyOpen, setReplyOpen] = useState(false);
  const [voteBusy, setVoteBusy] = useState(false);
  const [heartBusy, setHeartBusy] = useState(false);

  useEffect(() => {
    setLocalComment(comment);
    if (comment.replies.length > 0) {
      setReplies(comment.replies);
    }
  }, [comment]);

  const replyCount = Math.max(localComment.replyCount, replies.length);

  const reloadThread = useCallback(async () => {
    if (depth > 0) return;
    setThreadLoading(true);
    setThreadError(null);
    try {
      const loaded = await fetchCommentReplies(localComment.id);
      setReplies(loaded);
      setLocalComment((prev) => ({
        ...prev,
        replyCount: Math.max(prev.replyCount, loaded.length),
        replies: loaded,
      }));
    } catch (err) {
      setThreadError(err instanceof Error ? err.message : "Failed to load replies.");
    } finally {
      setThreadLoading(false);
    }
  }, [depth, localComment.id]);

  const openThread = useCallback(async () => {
    setThreadOpen(true);
    if (replies.length > 0 || replyCount === 0) return;
    await reloadThread();
  }, [reloadThread, replyCount, replies.length]);

  const handleVote = useCallback(
    async (vote: CommentVotePolarity) => {
      if (!canInteract || voteBusy) return;

      const snapshot = { ...localComment };
      const optimistic = applyEngagementVoteToggle(
        {
          userVote: localComment.userVote,
          likeCount: localComment.likeCount,
          dislikeCount: localComment.dislikeCount,
        },
        vote,
      );

      setVoteBusy(true);
      setLocalComment((prev) => ({
        ...prev,
        likeCount: optimistic.likeCount,
        dislikeCount: optimistic.dislikeCount,
        userVote: optimistic.userVote,
      }));

      try {
        const result = await voteOnPageComment(localComment.id, vote);
        const next = {
          ...snapshot,
          likeCount: result.likeCount,
          dislikeCount: result.dislikeCount,
          userVote: result.userVote,
        };
        setLocalComment(next);
        onVoteChange?.(localComment.id, {
          likeCount: result.likeCount,
          dislikeCount: result.dislikeCount,
          userVote: result.userVote,
        });
      } catch (err) {
        console.error("[PageCommentRow]", err);
        setLocalComment(snapshot);
      } finally {
        setVoteBusy(false);
      }
    },
    [canInteract, localComment, onVoteChange, voteBusy],
  );

  const handleAuthorHeart = useCallback(async () => {
    if (!canAuthorHeart || heartBusy) return;

    const snapshot = localComment.authorHearted;
    setHeartBusy(true);
    setLocalComment((prev) => ({ ...prev, authorHearted: !prev.authorHearted }));
    onVoteChange?.(localComment.id, { authorHearted: !snapshot });

    try {
      const result = await toggleCommentAuthorHeart(localComment.id);
      setLocalComment((prev) => ({ ...prev, authorHearted: result.authorHearted }));
      onVoteChange?.(localComment.id, { authorHearted: result.authorHearted });
    } catch (err) {
      console.error("[PageCommentRow]", err);
      setLocalComment((prev) => ({ ...prev, authorHearted: snapshot }));
      onVoteChange?.(localComment.id, { authorHearted: snapshot });
    } finally {
      setHeartBusy(false);
    }
  }, [canAuthorHeart, heartBusy, localComment.authorHearted, localComment.id, onVoteChange]);

  const authorHeartLabel = pageAuthorDisplayName?.trim() || "Author";

  return (
    <article
      className={cn(
        "nexus-page-comment-row",
        depth > 0 && "nexus-page-comment-row--reply",
        localComment.authorHearted && "nexus-page-comment-row--author-hearted",
      )}
    >
      <div className="nexus-page-comment-row__main">
        <UserAvatarImage
          src={localComment.author.avatar}
          alt={localComment.author.displayName}
          size={depth > 0 ? 28 : 36}
        />
        <div className="nexus-page-comment-row__body">
          <div className="nexus-page-comment-row__meta">
            <span
              className={cn(
                "nexus-page-comment-row__author",
                localComment.isPageAuthorComment && "nexus-page-comment-row__author--page-author",
              )}
            >
              {localComment.author.displayName}
            </span>
            {localComment.isPageAuthorComment ? (
              <Badge
                variant="secondary"
                className="nexus-page-comment-row__author-badge"
              >
                Author
              </Badge>
            ) : null}
            <time
              className="nexus-page-comment-row__time"
              dateTime={localComment.createdAt}
            >
              {formatCommentTimestamp(localComment.createdAt)}
            </time>
          </div>
          <NexusRichTextView
            html={localComment.body}
            className="nexus-page-comment-row__text"
            enablePagePreviews
          />
          <div className="nexus-page-comment-row__actions">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={cn(
                "nexus-page-comment-row__vote",
                localComment.userVote === "like" && "nexus-page-comment-row__vote--active",
                localComment.userVote === "dislike" && "nexus-page-comment-row__vote--inactive",
              )}
              disabled={!canInteract || voteBusy}
              aria-pressed={localComment.userVote === "like"}
              onClick={() => void handleVote("like")}
            >
              <ThumbsUp className="size-3.5" aria-hidden="true" />
              <span>{localComment.likeCount}</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={cn(
                "nexus-page-comment-row__vote",
                localComment.userVote === "dislike" && "nexus-page-comment-row__vote--active",
                localComment.userVote === "like" && "nexus-page-comment-row__vote--inactive",
              )}
              disabled={!canInteract || voteBusy}
              aria-pressed={localComment.userVote === "dislike"}
              onClick={() => void handleVote("dislike")}
            >
              <ThumbsDown className="size-3.5" aria-hidden="true" />
              <span>{localComment.dislikeCount}</span>
            </Button>
            {depth === 0 && canInteract ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="nexus-page-comment-row__reply-btn"
                onClick={() => setReplyOpen((open) => !open)}
              >
                Reply
              </Button>
            ) : null}
            {canAuthorHeart ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={cn(
                  "nexus-page-comment-row__author-heart-btn",
                  localComment.authorHearted && "nexus-page-comment-row__author-heart-btn--active",
                )}
                disabled={heartBusy}
                aria-pressed={localComment.authorHearted}
                aria-label={
                  localComment.authorHearted
                    ? "Remove author heart from comment"
                    : "Heart comment as page author"
                }
                title={
                  localComment.authorHearted
                    ? "Remove your heart"
                    : "Heart this comment"
                }
                onClick={() => void handleAuthorHeart()}
              >
                <Heart
                  className={cn("size-3.5", localComment.authorHearted && "fill-current")}
                  aria-hidden="true"
                />
              </Button>
            ) : null}
          </div>

          {localComment.authorHearted ? (
            <p className="nexus-page-comment-row__author-hearted-label">
              <Heart className="size-3 fill-current" aria-hidden="true" />
              <span>Loved by {authorHeartLabel}</span>
            </p>
          ) : null}

          {depth === 0 && replyCount > 0 ? (
            <div className="nexus-page-comment-row__thread-controls">
              {!threadOpen ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="nexus-page-comment-row__thread-toggle"
                  onClick={() => void openThread()}
                  disabled={threadLoading}
                >
                  {threadLoading ? (
                    <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                  ) : (
                    <ChevronDown className="size-3.5" aria-hidden="true" />
                  )}
                  <span>
                    View {replyCount} {replyCount === 1 ? "reply" : "replies"}
                  </span>
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="nexus-page-comment-row__thread-toggle"
                  onClick={() => setThreadOpen(false)}
                >
                  <ChevronUp className="size-3.5" aria-hidden="true" />
                  <span>Hide replies</span>
                </Button>
              )}
            </div>
          ) : null}

          {threadError ? (
            <p className="nexus-page-comment-row__thread-error" role="alert">
              {threadError}
            </p>
          ) : null}

          {replyOpen ? (
            <PageCommentComposer
              pagePath={pagePath}
              parentCommentId={localComment.id}
              placeholder="Add a reply…"
              onPosted={() => {
                setReplyOpen(false);
                setThreadOpen(true);
                void reloadThread();
                onReplyPosted?.();
              }}
              onCancel={() => setReplyOpen(false)}
            />
          ) : null}
        </div>
      </div>

      {threadOpen && replies.length > 0 ? (
        <div className="nexus-page-comment-row__replies">
          {replies.map((reply) => (
            <PageCommentRow
              key={reply.id}
              comment={reply}
              canInteract={canInteract}
              pagePath={pagePath}
              canAuthorHeart={canAuthorHeart}
              pageAuthorDisplayName={pageAuthorDisplayName}
              depth={depth + 1}
              onVoteChange={onVoteChange}
            />
          ))}
        </div>
      ) : null}

      {threadOpen && threadLoading && replies.length === 0 ? (
        <p className="nexus-page-comment-row__thread-loading">Loading replies…</p>
      ) : null}
    </article>
  );
}

/** Memoized comment row to limit re-renders during infinite scroll. */
export const PageCommentRow = memo(PageCommentRowComponent);

export default PageCommentRow;
