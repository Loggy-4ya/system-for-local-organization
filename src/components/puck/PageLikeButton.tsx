"use client";

/**
 * @fileoverview Fixed like button for published Puck pages.
 *
 * @module src/components/puck/PageLikeButton
 */

import { useCallback, useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { togglePageLike } from "@/lib/pageEngagementClient";

/** Props for {@link PageLikeButton}. */
export interface PageLikeButtonProps {
  /** MongoDB page path key. */
  pagePath: string;
  /** Initial like count from server. */
  initialLikeCount: number;
  /** Whether the current session user already liked the page. */
  initialLiked: boolean;
  /** True when a session exists (required to like). */
  canLike: boolean;
}

/**
 * Bottom-left heart button for liking a published page.
 *
 * @param props - Page path and initial engagement state.
 * @returns Fixed like control or null when path is empty.
 */
export function PageLikeButton({
  pagePath,
  initialLikeCount,
  initialLiked,
  canLike,
}: PageLikeButtonProps) {
  const [liked, setLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setLiked(initialLiked);
    setLikeCount(initialLikeCount);
  }, [initialLiked, initialLikeCount, pagePath]);

  const handleToggle = useCallback(async () => {
    if (!canLike || busy) return;
    setBusy(true);
    try {
      const result = await togglePageLike(pagePath);
      setLiked(result.liked);
      setLikeCount(result.likeCount);
    } catch (err) {
      console.error("[PageLikeButton]", err);
    } finally {
      setBusy(false);
    }
  }, [busy, canLike, pagePath]);

  if (!pagePath) return null;

  return (
    <div className="nexus-page-like-fab" data-nexus-page-like="">
      <Button
        type="button"
        variant={liked ? "default" : "outline"}
        size="icon-lg"
        className={cn(
          "nexus-page-like-fab__btn shadow-md",
          liked && "nexus-page-like-fab__btn--liked",
        )}
        disabled={!canLike || busy}
        aria-pressed={liked}
        aria-label={liked ? "Unlike this page" : "Like this page"}
        title={canLike ? (liked ? "Unlike" : "Like") : "Sign in to like"}
        onClick={() => void handleToggle()}
      >
        <Heart
          className={cn("size-5", liked && "fill-current")}
          aria-hidden="true"
        />
      </Button>
      <span className="nexus-page-like-fab__count" aria-live="polite">
        {likeCount}
      </span>
    </div>
  );
}

export default PageLikeButton;
