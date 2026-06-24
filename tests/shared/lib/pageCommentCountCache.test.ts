/**
 * @fileoverview Tests for server comment count cache.
 *
 * Run: `npm run test:page-comment-count-cache`
 * Registry: `.ai/docs/testing.md`
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  clearPageCommentCountCache,
  getCachedPageCommentCount,
  invalidatePageCommentCountCache,
  setCachedPageCommentCount,
} from "@shared/lib/pageCommentCountCache";

describe("pageCommentCountCache", () => {
  it("stores and reads counts within TTL", () => {
    clearPageCommentCountCache();
    setCachedPageCommentCount("/news/a", 12, 60_000);
    assert.equal(getCachedPageCommentCount("/news/a"), 12);
    assert.equal(getCachedPageCommentCount("/news/b"), null);
  });

  it("invalidates a page entry", () => {
    clearPageCommentCountCache();
    setCachedPageCommentCount("/news/a", 3);
    invalidatePageCommentCountCache("/news/a");
    assert.equal(getCachedPageCommentCount("/news/a"), null);
  });
});
