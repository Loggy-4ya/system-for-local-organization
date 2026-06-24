/**
 * @fileoverview Client comment cache patch helpers.
 *
 * Run: `npx tsx --test tests/src/lib/pageCommentsClientCache.test.ts`
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { PageCommentDto } from "@shared/domains/CommentDomain";
import {
  applyPageCommentDtoPatch,
  buildPageCommentsCacheKey,
  patchPageCommentsCacheComment,
  readPageCommentsCache,
  writePageCommentsCache,
} from "@/lib/pageCommentsClientCache";

function sampleComment(
  id: string,
  overrides: Partial<PageCommentDto> = {},
): PageCommentDto {
  return {
    id,
    body: "Hello",
    createdAt: "2026-01-01T00:00:00.000Z",
    author: { userId: "u-1", displayName: "Ada", avatar: null },
    likeCount: 0,
    dislikeCount: 0,
    userVote: null,
    isPageAuthorComment: false,
    authorHearted: false,
    replyCount: 0,
    replies: [],
    ...overrides,
  };
}

describe("applyPageCommentDtoPatch", () => {
  it("patches a top-level comment", () => {
    const row = sampleComment("c-1");
    const next = applyPageCommentDtoPatch(row, "c-1", { authorHearted: true });
    assert.equal(next.authorHearted, true);
  });

  it("patches a nested reply", () => {
    const row = sampleComment("c-1", {
      replies: [sampleComment("c-2")],
      replyCount: 1,
    });
    const next = applyPageCommentDtoPatch(row, "c-2", { authorHearted: true });
    assert.equal(next.replies[0]?.authorHearted, true);
  });
});

describe("patchPageCommentsCacheComment", () => {
  it("updates cached list payloads for the page", () => {
    const pagePath = "/demo";
    const key = buildPageCommentsCacheKey(pagePath, "list", 1, 15);
    writePageCommentsCache(
      key,
      {
        comments: [sampleComment("c-1")],
        meta: { page: 1, limit: 15, totalCount: 1, totalPages: 1 },
      },
      30_000,
    );

    patchPageCommentsCacheComment(pagePath, "c-1", { authorHearted: true });

    const cached = readPageCommentsCache<{ comments: PageCommentDto[] }>(key);
    assert.equal(cached?.comments[0]?.authorHearted, true);
  });
});
