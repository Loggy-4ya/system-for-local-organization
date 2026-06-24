/**
 * @fileoverview Top-liked comments preview strip (YouTube-style auto-rotate).
 *
 * @module src/components/comments/PageCommentsTopLikedStrip
 */

"use client";

import { useEffect, useState } from "react";
import { ChevronRight, MessageSquareText, ThumbsUp } from "lucide-react";
import type { PageCommentDto } from "@shared/domains/CommentDomain";
import { clampCommentsPreviewIntervalSeconds } from "@shared/lib/pageCommentsLayoutLogic";
import { NexusRichTextView } from "@/components/editor/NexusRichTextView";
import { UserAvatarImage } from "@/components/media/UserAvatarImage";
import { cn } from "@/lib/utils";

/** Editor preview rows when no live data is available. */
const EDITOR_PREVIEW_COMMENTS: Array<{
  author: string;
  body: string;
  likeCount: number;
  isPageAuthorComment: boolean;
}> = [
  {
    author: "Alex Rivera",
    body: "This breakdown helped our team align before the council meeting.",
    likeCount: 48,
    isPageAuthorComment: false,
  },
  {
    author: "Page Author",
    body: "Thanks everyone — we'll publish the follow-up notes tomorrow.",
    likeCount: 31,
    isPageAuthorComment: true,
  },
  {
    author: "Morgan Lee",
    body: "Clear write-up. The timeline section was especially useful.",
    likeCount: 19,
    isPageAuthorComment: false,
  },
];

/** Props for {@link PageCommentsTopLikedStrip}. */
export interface PageCommentsTopLikedStripProps {
  /** Launcher label shown in the header row. */
  launcherLabel: string;
  /** Total comment count for the badge. */
  countLabel: string;
  /** Top liked rows to cycle through. */
  comments: PageCommentDto[];
  /** Seconds between preview rotations. */
  previewIntervalSeconds: number;
  /** Puck editor / static preview — uses sample rows, no timers. */
  preview?: boolean;
  /** Opens the full discussion drawer. */
  onOpen: () => void;
}

/**
 * Render one preview row for live or editor sample data.
 *
 * @param props - Row content and styling flags.
 * @returns Preview row JSX.
 */
function TopLikedPreviewRow({
  author,
  body,
  likeCount,
  isPageAuthorComment,
  avatar,
}: {
  author: string;
  body: string;
  likeCount: number;
  isPageAuthorComment: boolean;
  avatar?: string | null;
}) {
  return (
    <div className="nexus-page-comments-top-liked__slide">
      <UserAvatarImage src={avatar ?? null} alt={author} size={32} />
      <div className="nexus-page-comments-top-liked__slide-body">
        <div className="nexus-page-comments-top-liked__slide-meta">
          <span
            className={cn(
              "nexus-page-comments-top-liked__author",
              isPageAuthorComment && "nexus-page-comments-top-liked__author--page-author",
            )}
          >
            {author}
          </span>
          {isPageAuthorComment ? (
            <span className="nexus-page-comments-top-liked__author-badge">Author</span>
          ) : null}
          <span className="nexus-page-comments-top-liked__likes" aria-label={`${likeCount} likes`}>
            <ThumbsUp className="size-3" aria-hidden="true" />
            {likeCount}
          </span>
        </div>
        <NexusRichTextView
          html={body}
          className="nexus-page-comments-top-liked__text"
        />
      </div>
    </div>
  );
}

/**
 * Auto-rotating top-liked comment preview (non-scrollable, click opens drawer).
 *
 * @param props - Preview data and open handler.
 * @returns Interactive preview strip JSX.
 */
export function PageCommentsTopLikedStrip({
  launcherLabel,
  countLabel,
  comments,
  previewIntervalSeconds,
  preview = false,
  onOpen,
}: PageCommentsTopLikedStripProps) {
  const intervalSeconds = clampCommentsPreviewIntervalSeconds(previewIntervalSeconds);
  const [activeIndex, setActiveIndex] = useState(0);

  const liveSlides = comments.length > 0 ? comments : [];
  const slideCount = preview ? EDITOR_PREVIEW_COMMENTS.length : liveSlides.length;

  useEffect(() => {
    setActiveIndex(0);
  }, [slideCount, preview]);

  useEffect(() => {
    if (preview || slideCount <= 1) return;
    const timer = window.setInterval(() => {
      setActiveIndex((index) => (index + 1) % slideCount);
    }, intervalSeconds * 1000);
    return () => window.clearInterval(timer);
  }, [intervalSeconds, preview, slideCount]);

  const emptyLive = !preview && liveSlides.length === 0;

  return (
    <button
      type="button"
      className="nexus-page-comments-top-liked glass-panel"
      aria-expanded="false"
      onClick={onOpen}
    >
      <div className="nexus-page-comments-top-liked__header">
        <MessageSquareText className="size-4 shrink-0" aria-hidden="true" />
        <span className="nexus-page-comments-top-liked__label">{launcherLabel}</span>
        <span className="nexus-page-comments-top-liked__count">{countLabel}</span>
        <ChevronRight className="nexus-page-comments-top-liked__chevron size-4 shrink-0" aria-hidden="true" />
      </div>

      <div
        className="nexus-page-comments-top-liked__viewport"
        aria-live={preview ? "off" : "polite"}
        aria-atomic="true"
      >
        {emptyLive ? (
          <p className="nexus-page-comments-top-liked__empty">
            No comments yet. Be the first to share your thoughts.
          </p>
        ) : null}

        {!emptyLive && preview
          ? EDITOR_PREVIEW_COMMENTS.map((row, index) => (
              <div
                key={row.author}
                className={cn(
                  "nexus-page-comments-top-liked__slide-layer",
                  index === activeIndex && "nexus-page-comments-top-liked__slide-layer--active",
                )}
                aria-hidden={index !== activeIndex}
              >
                <TopLikedPreviewRow
                  author={row.author}
                  body={row.body}
                  likeCount={row.likeCount}
                  isPageAuthorComment={row.isPageAuthorComment}
                />
              </div>
            ))
          : null}

        {!emptyLive && !preview
          ? liveSlides.map((row, index) => (
              <div
                key={row.id}
                className={cn(
                  "nexus-page-comments-top-liked__slide-layer",
                  index === activeIndex && "nexus-page-comments-top-liked__slide-layer--active",
                )}
                aria-hidden={index !== activeIndex}
              >
                <TopLikedPreviewRow
                  author={row.author.displayName}
                  body={row.body}
                  likeCount={row.likeCount}
                  isPageAuthorComment={row.isPageAuthorComment}
                  avatar={row.author.avatar}
                />
              </div>
            ))
          : null}
      </div>

      <span className="nexus-page-comments-top-liked__action">Open discussion</span>
    </button>
  );
}

export default PageCommentsTopLikedStrip;
