/**
 * @fileoverview Unit tests for mutually exclusive engagement vote helpers.
 *
 * Module under test: shared/lib/engagementVoteLogic.ts
 * Registry: .ai/docs/testing.md
 * Run: `npm run test:engagement-vote-logic`
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyEngagementVoteToggle } from "@shared/lib/engagementVoteLogic";

describe("applyEngagementVoteToggle", () => {
  it("adds a like from neutral", () => {
    const next = applyEngagementVoteToggle(
      { userVote: null, likeCount: 2, dislikeCount: 1 },
      "like",
    );
    assert.deepEqual(next, { userVote: "like", likeCount: 3, dislikeCount: 1 });
  });

  it("removes an active like", () => {
    const next = applyEngagementVoteToggle(
      { userVote: "like", likeCount: 3, dislikeCount: 1 },
      "like",
    );
    assert.deepEqual(next, { userVote: null, likeCount: 2, dislikeCount: 1 });
  });

  it("switches from dislike to like", () => {
    const next = applyEngagementVoteToggle(
      { userVote: "dislike", likeCount: 2, dislikeCount: 4 },
      "like",
    );
    assert.deepEqual(next, { userVote: "like", likeCount: 3, dislikeCount: 3 });
  });

  it("switches from like to dislike", () => {
    const next = applyEngagementVoteToggle(
      { userVote: "like", likeCount: 5, dislikeCount: 0 },
      "dislike",
    );
    assert.deepEqual(next, { userVote: "dislike", likeCount: 4, dislikeCount: 1 });
  });
});
