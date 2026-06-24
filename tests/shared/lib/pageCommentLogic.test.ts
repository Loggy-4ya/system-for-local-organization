/**
 * @fileoverview Unit tests for page comment body normalization.
 *
 * Module under test: shared/lib/pageCommentLogic.ts
 * Registry: .ai/docs/testing.md
 * Run: `npm run test:page-comment-logic`
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  extractPageCommentPlainText,
  getPageCommentValidationError,
  isNonEmptyPageCommentBody,
  normalizePageCommentBody,
  MAX_PAGE_COMMENT_LENGTH,
} from "@shared/lib/pageCommentLogic";

describe("extractPageCommentPlainText", () => {
  it("strips HTML and collapses whitespace", () => {
    assert.equal(extractPageCommentPlainText("  <b>Hello</b>   world  "), "Hello world");
  });

  it("treats legacy plain text as visible prose", () => {
    assert.equal(extractPageCommentPlainText("  Thanks!  "), "Thanks!");
  });
});

describe("normalizePageCommentBody", () => {
  it("sanitizes rich text HTML for storage", () => {
    assert.equal(
      normalizePageCommentBody('<p>Hello <strong>world</strong></p><script>alert(1)</script>'),
      "<p>Hello <strong>world</strong></p>",
    );
  });

  it("caps legacy plain text at MAX_PAGE_COMMENT_LENGTH", () => {
    const long = "a".repeat(MAX_PAGE_COMMENT_LENGTH + 50);
    assert.equal(normalizePageCommentBody(long).length, MAX_PAGE_COMMENT_LENGTH);
  });
});

describe("isNonEmptyPageCommentBody", () => {
  it("rejects whitespace-only bodies", () => {
    assert.equal(isNonEmptyPageCommentBody("   "), false);
    assert.equal(isNonEmptyPageCommentBody("<p></p>"), false);
    assert.equal(isNonEmptyPageCommentBody("Hi"), true);
    assert.equal(isNonEmptyPageCommentBody("<p>Hi</p>"), true);
  });
});

describe("getPageCommentValidationError", () => {
  it("rejects empty comments", () => {
    assert.equal(getPageCommentValidationError("   "), "Comment cannot be empty.");
    assert.equal(getPageCommentValidationError("<p><br></p>"), "Comment cannot be empty.");
  });

  it("rejects blocked language using override blocklist", () => {
    assert.equal(
      getPageCommentValidationError("what the fuck", {
        blockedWords: [{ term: "fuck", category: "profanity" }],
        blockedWordMessage: "Language not allowed.",
      }),
      "Language not allowed.",
    );
    assert.equal(
      getPageCommentValidationError("<p>what the <strong>fuck</strong></p>", {
        blockedWords: [{ term: "fuck", category: "profanity" }],
        blockedWordMessage: "Language not allowed.",
      }),
      "Language not allowed.",
    );
  });

  it("accepts clean prose", () => {
    assert.equal(
      getPageCommentValidationError("Thanks for the update!", {
        blockedWords: [{ term: "fuck", category: "profanity" }],
        blockedWordMessage: "Language not allowed.",
      }),
      null,
    );
    assert.equal(
      getPageCommentValidationError("<p>Thanks for the <em>update</em>!</p>", {
        blockedWords: [{ term: "fuck", category: "profanity" }],
        blockedWordMessage: "Language not allowed.",
      }),
      null,
    );
  });
});
