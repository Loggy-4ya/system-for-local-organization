"use client";

/**
 * @fileoverview Fixed like/dislike controls for published Puck pages.
 *
 * Like and dislike are mutually exclusive — activating one clears the other.
 *
 * @module src/components/puck/PageLikeButton
 */

import { useCallback, useEffect, useState } from "react";
import { Heart, ThumbsDown, X } from "lucide-react";
import { applyEngagementVoteToggle } from "@shared/lib/engagementVoteLogic";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { togglePageDislike, togglePageLike } from "@/lib/pageEngagementClient";

/** Props for {@link PageLikeButton}. */
export interface PageLikeButtonProps {
  /** MongoDB page path key. */
  pagePath: string;
  /** Initial like count from server. */
  initialLikeCount: number;
  /** Initial dislike count from server. */
  initialDislikeCount: number;
  /** Whether the current session user already liked the page. */
  initialLiked: boolean;
  /** Whether the current session user already disliked the page. */
  initialDisliked: boolean;
  /** True when a session exists (required to like or dislike). */
  canEngage: boolean;
  /** Lift the control when the page edit FAB occupies the same corner. */
  stackAboveChrome?: boolean;
}

/**
 * Apply server engagement snapshot to component state setters.
 *
 * @param result - API payload.
 * @param apply - State updater callbacks.
 */
function applyEngagementSnapshot(
  result: {
    liked: boolean;
    likeCount: number;
    disliked: boolean;
    dislikeCount: number;
  },
  apply: {
    setLiked: (value: boolean) => void;
    setDisliked: (value: boolean) => void;
    setLikeCount: (value: number) => void;
    setDislikeCount: (value: number) => void;
  },
): void {
  apply.setLiked(result.liked);
  apply.setDisliked(result.disliked);
  apply.setLikeCount(result.likeCount);
  apply.setDislikeCount(result.dislikeCount);
}

/**
 * Bottom-right engagement control for signed-in viewers — collapsed launcher opens a like/dislike toolbar.
 *
 * @param props - Page path and initial engagement state.
 * @returns Reaction launcher + toolbar, or null when path is empty.
 */
export function PageLikeButton({
  pagePath,
  initialLikeCount,
  initialDislikeCount,
  initialLiked,
  initialDisliked,
  canEngage,
  stackAboveChrome = false,
}: PageLikeButtonProps) {
  const [liked, setLiked] = useState(initialLiked);
  const [disliked, setDisliked] = useState(initialDisliked);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [dislikeCount, setDislikeCount] = useState(initialDislikeCount);
  const [busy, setBusy] = useState<"like" | "dislike" | null>(null);
  const [toolbarOpen, setToolbarOpen] = useState(false);

  useEffect(() => {
    setLiked(initialLiked);
    setDisliked(initialDisliked);
    setLikeCount(initialLikeCount);
    setDislikeCount(initialDislikeCount);
  }, [
    initialDisliked,
    initialDislikeCount,
    initialLiked,
    initialLikeCount,
    pagePath,
  ]);

  const syncEngagement = useCallback(
    (result: {
      liked: boolean;
      likeCount: number;
      disliked: boolean;
      dislikeCount: number;
    }) => {
      applyEngagementSnapshot(result, {
        setLiked,
        setDisliked,
        setLikeCount,
        setDislikeCount,
      });
    },
    [],
  );

  const handleToggleLike = useCallback(async () => {
    if (!canEngage || busy) return;

    const snapshot = {
      liked,
      disliked,
      likeCount,
      dislikeCount,
    };
    const optimistic = applyEngagementVoteToggle(
      {
        userVote: disliked ? "dislike" : liked ? "like" : null,
        likeCount,
        dislikeCount,
      },
      "like",
    );

    setBusy("like");
    setLiked(optimistic.userVote === "like");
    setDisliked(false);
    setLikeCount(optimistic.likeCount);
    setDislikeCount(optimistic.dislikeCount);

    try {
      const result = await togglePageLike(pagePath);
      syncEngagement(result);
    } catch (err) {
      console.error("[PageLikeButton] like", err);
      setLiked(snapshot.liked);
      setDisliked(snapshot.disliked);
      setLikeCount(snapshot.likeCount);
      setDislikeCount(snapshot.dislikeCount);
    } finally {
      setBusy(null);
    }
  }, [busy, canEngage, disliked, dislikeCount, likeCount, liked, pagePath, syncEngagement]);

  const handleToggleDislike = useCallback(async () => {
    if (!canEngage || busy) return;

    const snapshot = {
      liked,
      disliked,
      likeCount,
      dislikeCount,
    };
    const optimistic = applyEngagementVoteToggle(
      {
        userVote: disliked ? "dislike" : liked ? "like" : null,
        likeCount,
        dislikeCount,
      },
      "dislike",
    );

    setBusy("dislike");
    setLiked(false);
    setDisliked(optimistic.userVote === "dislike");
    setLikeCount(optimistic.likeCount);
    setDislikeCount(optimistic.dislikeCount);

    try {
      const result = await togglePageDislike(pagePath);
      syncEngagement(result);
    } catch (err) {
      console.error("[PageLikeButton] dislike", err);
      setLiked(snapshot.liked);
      setDisliked(snapshot.disliked);
      setLikeCount(snapshot.likeCount);
      setDislikeCount(snapshot.dislikeCount);
    } finally {
      setBusy(null);
    }
  }, [busy, canEngage, disliked, dislikeCount, likeCount, liked, pagePath, syncEngagement]);

  if (!pagePath) return null;

  const userHasReaction = liked || disliked;

  return (
    <div
      className={cn(
        "nexus-page-engagement-fab",
        stackAboveChrome && "nexus-page-engagement-fab--stacked",
      )}
      data-nexus-page-engagement=""
    >
      {toolbarOpen ? (
        <div
          id="nexus-page-engagement-toolbar"
          className="nexus-page-engagement-fab__toolbar glass-panel"
        >
          <div className="nexus-page-engagement-fab__toolbar-header">
            <span className="nexus-page-engagement-fab__toolbar-title">Reactions</span>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="nexus-page-engagement-fab__close"
              aria-label="Hide reactions"
              title="Hide reactions"
              onClick={() => setToolbarOpen(false)}
            >
              <X className="size-4" aria-hidden="true" />
            </Button>
          </div>

          <div className="nexus-page-engagement-fab__toolbar-actions">
            <div className="nexus-page-engagement-fab__group">
              <Button
                type="button"
                variant={liked ? "default" : "outline"}
                size="icon-lg"
                className={cn(
                  "nexus-page-engagement-fab__btn shadow-md",
                  liked && "nexus-page-engagement-fab__btn--liked",
                  disliked && "nexus-page-engagement-fab__btn--muted",
                )}
                disabled={!canEngage || busy !== null}
                aria-pressed={liked}
                aria-label={liked ? "Unlike this page" : "Like this page"}
                title={canEngage ? (liked ? "Unlike" : "Like") : "Sign in to like"}
                onClick={() => void handleToggleLike()}
              >
                <Heart
                  className={cn("size-5", liked && "fill-current")}
                  aria-hidden="true"
                />
              </Button>
              <span className="nexus-page-engagement-fab__count" aria-live="polite">
                {likeCount}
              </span>
            </div>

            <div className="nexus-page-engagement-fab__group">
              <Button
                type="button"
                variant={disliked ? "default" : "outline"}
                size="icon-lg"
                className={cn(
                  "nexus-page-engagement-fab__btn shadow-md",
                  disliked && "nexus-page-engagement-fab__btn--disliked",
                  liked && "nexus-page-engagement-fab__btn--muted",
                )}
                disabled={!canEngage || busy !== null}
                aria-pressed={disliked}
                aria-label={disliked ? "Remove dislike from this page" : "Dislike this page"}
                title={canEngage ? (disliked ? "Remove dislike" : "Dislike") : "Sign in to dislike"}
                onClick={() => void handleToggleDislike()}
              >
                <ThumbsDown className="size-5" aria-hidden="true" />
              </Button>
              <span className="nexus-page-engagement-fab__count" aria-live="polite">
                {dislikeCount}
              </span>
            </div>
          </div>
        </div>
      ) : null}

      <Button
        type="button"
        variant={userHasReaction ? "default" : "outline"}
        size="icon-lg"
        className={cn(
          "nexus-page-engagement-fab__launcher shadow-md",
          liked && "nexus-page-engagement-fab__launcher--liked",
          disliked && "nexus-page-engagement-fab__launcher--disliked",
        )}
        aria-expanded={toolbarOpen}
        aria-controls="nexus-page-engagement-toolbar"
        aria-label={toolbarOpen ? "Reactions open" : "Open reactions"}
        title={toolbarOpen ? "Reactions" : "React to this page"}
        onClick={() => setToolbarOpen((open) => !open)}
      >
        <Heart
          className={cn("size-5", liked && "fill-current")}
          aria-hidden="true"
        />
      </Button>
    </div>
  );
}

export default PageLikeButton;
