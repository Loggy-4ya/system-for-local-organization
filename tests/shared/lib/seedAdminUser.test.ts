/**
 * @fileoverview Unit tests for admin seed helpers and OAuth link cookie parsing.
 *
 * Module under test: shared/lib/seedAdminUserHelpers.ts, src/lib/oauthLinkCookie.ts
 *
 * Run: `npm run test:seed-admin-user`
 * Registry: `.ai/docs/testing.md`
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { clearTelegramLinkage } from "@shared/lib/seedAdminUserHelpers";
import {
  buildOAuthLinkCookie,
  clearOAuthLinkCookie,
  readOAuthLinkUserId,
} from "@/lib/oauthLinkCookie";

describe("clearTelegramLinkage", () => {
  it("clears telegram fields when telegramId is set", () => {
    const user = {
      telegramId: 12345,
      username: "nexus_admin",
      lastTelegramSyncAt: new Date("2026-01-01T00:00:00.000Z"),
    };

    assert.equal(clearTelegramLinkage(user), true);
    assert.equal(user.telegramId, null);
    assert.equal(user.username, null);
    assert.equal(user.lastTelegramSyncAt, null);
  });

  it("returns false when telegram is not linked", () => {
    const user = {
      telegramId: null,
      username: null,
      lastTelegramSyncAt: null,
    };

    assert.equal(clearTelegramLinkage(user), false);
  });
});

describe("oauthLinkCookie", () => {
  it("builds oauth link cookie with user id", () => {
    const built = buildOAuthLinkCookie("abc123");
    assert.match(built, /nexus_oauth_link=abc123/);
  });

  it("reads user id from a Cookie header fragment", () => {
    const userId = readOAuthLinkUserId("theme=dark; nexus_oauth_link=abc123; session=xyz");
    assert.equal(userId, "abc123");
  });

  it("reads encoded user id from built cookie", () => {
    const built = buildOAuthLinkCookie("507f1f77bcf86cd799439011");
    const userId = readOAuthLinkUserId(built.split(";")[0]);
    assert.equal(userId, "507f1f77bcf86cd799439011");
  });

  it("returns null when cookie is missing", () => {
    assert.equal(readOAuthLinkUserId("theme=dark"), null);
    assert.equal(readOAuthLinkUserId(null), null);
  });

  it("clears the OAuth link cookie", () => {
    assert.match(clearOAuthLinkCookie(), /Max-Age=0/);
  });
});
