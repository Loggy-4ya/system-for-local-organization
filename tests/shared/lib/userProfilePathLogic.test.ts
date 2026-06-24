/**
 * @fileoverview Unit tests for public user profile URL helpers.
 *
 * Module under test: shared/lib/userProfilePathLogic.ts
 * Registry: .ai/docs/testing.md
 * Run: `npm run test:user-profile-path-logic`
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildUserProfileHref,
  isCanonicalUserProfileSegment,
  looksLikeMongoObjectId,
  normalizeUserProfileSegment,
  userProfileHrefToSegment,
} from "@shared/lib/userProfilePathLogic";

describe("looksLikeMongoObjectId", () => {
  it("matches 24-char hex ids", () => {
    assert.equal(looksLikeMongoObjectId("507f1f77bcf86cd799439011"), true);
    assert.equal(looksLikeMongoObjectId("not-an-object-id"), false);
    assert.equal(looksLikeMongoObjectId("507f1f77bcf86cd79943901"), false);
  });
});

describe("buildUserProfileHref", () => {
  it("prefers login over id", () => {
    assert.equal(
      buildUserProfileHref({ id: "507f1f77bcf86cd799439011", login: "anna.k" }),
      "/users/anna.k",
    );
  });

  it("falls back to id when login is missing", () => {
    assert.equal(
      buildUserProfileHref({ id: "507f1f77bcf86cd799439011", login: null }),
      "/users/507f1f77bcf86cd799439011",
    );
  });
});

describe("canonical profile segment", () => {
  it("normalises casing for comparison", () => {
    const href = buildUserProfileHref({ id: "1", login: "anna.k" });
    assert.equal(isCanonicalUserProfileSegment("Anna.K", href), true);
    assert.equal(normalizeUserProfileSegment("Anna.K"), "anna.k");
    assert.equal(userProfileHrefToSegment(href), "anna.k");
  });

  it("detects non-canonical id when login exists", () => {
    const href = buildUserProfileHref({ id: "507f1f77bcf86cd799439011", login: "anna.k" });
    assert.equal(isCanonicalUserProfileSegment("507f1f77bcf86cd799439011", href), false);
  });
});
