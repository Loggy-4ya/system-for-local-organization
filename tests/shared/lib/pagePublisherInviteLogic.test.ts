/**
 * @fileoverview Unit tests for page publisher invite link helpers.
 *
 * Module under test: shared/lib/pagePublisherInviteLogic.ts
 * Registry: .ai/docs/testing.md
 * Run: `npm run test:page-publisher-invite-logic`
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildPagePublisherInvitePath,
  buildPagePublisherInviteUrl,
  canRedeemPagePublisherInvite,
  computePagePublisherInviteExpiry,
  generatePagePublisherInviteToken,
  hashPagePublisherInviteToken,
  hasPagePublisherAccess,
  isPagePublisherInviteActive,
  validatePagePublisherInviteToken,
} from "@shared/lib/pagePublisherInviteLogic";
import { PAGE_PUBLISHER_INVITE_TTL_MS } from "@shared/constants/pagePublisherInvite";

describe("pagePublisherInviteLogic", () => {
  it("generates stable-length tokens and matching hashes", () => {
    const token = generatePagePublisherInviteToken();
    assert.ok(token.length >= 24);
    assert.equal(hashPagePublisherInviteToken(token), hashPagePublisherInviteToken(` ${token} `));
  });

  it("builds invite paths and absolute URLs", () => {
    const token = "abc123";
    assert.equal(buildPagePublisherInvitePath(token), "/pages/join/abc123");
    assert.equal(
      buildPagePublisherInviteUrl("https://example.com", token),
      "https://example.com/pages/join/abc123",
    );
  });

  it("computes expiry from TTL constant", () => {
    const now = Date.UTC(2026, 0, 1, 12, 0, 0);
    const expiry = computePagePublisherInviteExpiry(now);
    assert.equal(expiry.getTime(), now + PAGE_PUBLISHER_INVITE_TTL_MS);
  });

  it("validates active and expired invite tokens", () => {
    const token = "invite-token";
    const invite = {
      tokenHash: hashPagePublisherInviteToken(token),
      expiresAt: new Date(Date.now() + 60_000),
      createdBy: "creator-1",
    };

    assert.equal(validatePagePublisherInviteToken(token, invite).ok, true);
    assert.equal(
      validatePagePublisherInviteToken("wrong", invite).ok,
      false,
    );
    assert.equal(
      validatePagePublisherInviteToken(
        token,
        { ...invite, expiresAt: new Date(Date.now() - 1) },
      ).reason,
      "expired",
    );
  });

  it("detects active invites and publisher access", () => {
    assert.equal(
      isPagePublisherInviteActive({ expiresAt: new Date(Date.now() + 10_000) }),
      true,
    );
    assert.equal(hasPagePublisherAccess("author-1", "author-1", []), true);
    assert.equal(hasPagePublisherAccess("delegate-1", "author-1", ["delegate-1"]), true);
    assert.equal(canRedeemPagePublisherInvite("delegate-2", "author-1", [
      { userId: "delegate-1", displayName: "One" },
    ]), true);
    assert.equal(canRedeemPagePublisherInvite("author-1", "author-1", []), false);
  });
});
