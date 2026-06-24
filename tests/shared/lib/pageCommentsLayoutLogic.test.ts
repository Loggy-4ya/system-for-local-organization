/**
 * @fileoverview Tests for comments band layout helpers.
 *
 * Run: `npm run test:page-comments-layout-logic`
 * Registry: `.ai/docs/testing.md`
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  clampCommentsPreviewIntervalSeconds,
  normalizeCommentsLayoutAlign,
  normalizeCommentsLayoutWidth,
  normalizeCommentsViewMode,
  resolveCommentsBandMaxWidth,
  resolveCommentsBandStyle,
} from "@shared/lib/pageCommentsLayoutLogic";

describe("normalizeCommentsLayoutWidth", () => {
  it("defaults to full", () => {
    assert.equal(normalizeCommentsLayoutWidth(undefined), "full");
    assert.equal(normalizeCommentsLayoutWidth("invalid"), "full");
  });

  it("preserves medium and narrow", () => {
    assert.equal(normalizeCommentsLayoutWidth("medium"), "medium");
    assert.equal(normalizeCommentsLayoutWidth("narrow"), "narrow");
  });
});

describe("normalizeCommentsLayoutAlign", () => {
  it("defaults to center", () => {
    assert.equal(normalizeCommentsLayoutAlign(null), "center");
  });

  it("preserves left and right", () => {
    assert.equal(normalizeCommentsLayoutAlign("left"), "left");
    assert.equal(normalizeCommentsLayoutAlign("right"), "right");
  });
});

describe("normalizeCommentsViewMode", () => {
  it("maps topLiked and defaults to launcher", () => {
    assert.equal(normalizeCommentsViewMode("topLiked"), "topLiked");
    assert.equal(normalizeCommentsViewMode("launcher"), "launcher");
    assert.equal(normalizeCommentsViewMode("other"), "launcher");
  });
});

describe("clampCommentsPreviewIntervalSeconds", () => {
  it("clamps between 3 and 12", () => {
    assert.equal(clampCommentsPreviewIntervalSeconds(1), 3);
    assert.equal(clampCommentsPreviewIntervalSeconds(6), 6);
    assert.equal(clampCommentsPreviewIntervalSeconds(99), 12);
    assert.equal(clampCommentsPreviewIntervalSeconds(undefined), 6);
  });
});

describe("resolveCommentsBandStyle", () => {
  it("returns full width centered band", () => {
    assert.deepEqual(resolveCommentsBandMaxWidth("full"), "100%");
    assert.deepEqual(resolveCommentsBandStyle("narrow", "right"), {
      width: "100%",
      maxWidth: "min(100%, 28rem)",
      marginLeft: "auto",
      marginRight: "0",
    });
  });
});
