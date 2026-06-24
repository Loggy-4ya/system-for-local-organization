/**
 * @fileoverview Pure helpers for mutually exclusive like/dislike engagement votes.
 *
 * Tests: `npm run test:engagement-vote-logic`
 * Registry: `.ai/docs/testing.md`
 *
 * @module shared/lib/engagementVoteLogic
 */

/** Like or dislike polarity. */
export type EngagementPolarity = "like" | "dislike";

/** User vote plus denormalized counters. */
export interface EngagementVoteState {
  /** Active vote, if any. */
  userVote: EngagementPolarity | null;
  /** Public like count. */
  likeCount: number;
  /** Public dislike count. */
  dislikeCount: number;
}

/**
 * Apply a like/dislike click while enforcing a single active vote per user.
 *
 * - Clicking the active vote removes it.
 * - Clicking the opposite vote switches polarity and moves one count.
 * - Clicking when neutral adds the chosen vote.
 *
 * @param current - Existing vote state and counts.
 * @param nextVote - Requested polarity from the user action.
 * @returns Next vote state and counts.
 */
export function applyEngagementVoteToggle(
  current: EngagementVoteState,
  nextVote: EngagementPolarity,
): EngagementVoteState {
  const { userVote, likeCount, dislikeCount } = current;

  if (userVote === nextVote) {
    return {
      userVote: null,
      likeCount: nextVote === "like" ? Math.max(0, likeCount - 1) : likeCount,
      dislikeCount: nextVote === "dislike" ? Math.max(0, dislikeCount - 1) : dislikeCount,
    };
  }

  if (userVote === null) {
    return {
      userVote: nextVote,
      likeCount: nextVote === "like" ? likeCount + 1 : likeCount,
      dislikeCount: nextVote === "dislike" ? dislikeCount + 1 : dislikeCount,
    };
  }

  return {
    userVote: nextVote,
    likeCount: nextVote === "like" ? likeCount + 1 : Math.max(0, likeCount - 1),
    dislikeCount: nextVote === "dislike" ? dislikeCount + 1 : Math.max(0, dislikeCount - 1),
  };
}

/**
 * Whether the user currently has both polarities active (invalid state).
 *
 * @param liked - Page-level like flag.
 * @param disliked - Page-level dislike flag.
 * @returns True when both flags are set.
 */
export function hasConflictingEngagementVotes(liked: boolean, disliked: boolean): boolean {
  return liked && disliked;
}
