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
import { clearTelegramLinkage, seedAdminPasswordNeedsUpdate, seedAdminLoginNeedsUpdate, applySeedAdminEnvSync } from "@shared/lib/seedAdminUserHelpers";
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

describe("seedAdminPasswordNeedsUpdate", () => {
  it("returns true when no hash exists", async () => {
    assert.equal(await seedAdminPasswordNeedsUpdate(null, "secret"), true);
  });

  it("returns false when hash matches env password", async () => {
    const bcrypt = await import("bcryptjs");
    const hash = await bcrypt.hash("secret", 4);
    assert.equal(await seedAdminPasswordNeedsUpdate(hash, "secret"), false);
  });

  it("returns true when env password changed", async () => {
    const bcrypt = await import("bcryptjs");
    const hash = await bcrypt.hash("old-secret", 4);
    assert.equal(await seedAdminPasswordNeedsUpdate(hash, "new-secret"), true);
  });
});

describe("seedAdminLoginNeedsUpdate", () => {
  it("returns false when login matches env", () => {
    assert.equal(seedAdminLoginNeedsUpdate("admin", "admin"), false);
  });

  it("returns true when login differs from env", () => {
    assert.equal(seedAdminLoginNeedsUpdate("admin", "superadmin"), true);
  });

  it("returns true when stored login is missing", () => {
    assert.equal(seedAdminLoginNeedsUpdate(null, "admin"), true);
  });
});

describe("applySeedAdminEnvSync", () => {
  it("updates login and password when both differ from env", async () => {
    const bcrypt = await import("bcryptjs");
    const user = {
      login: "admin",
      passwordHash: await bcrypt.hash("old-secret", 4),
      telegramId: null,
      username: null,
      lastTelegramSyncAt: null,
    };

    const sync = await applySeedAdminEnvSync(user, "superadmin", "new-secret", await bcrypt.hash("new-secret", 4));

    assert.equal(sync.syncedLogin, true);
    assert.equal(sync.syncedPassword, true);
    assert.equal(user.login, "superadmin");
    assert.equal(await bcrypt.compare("new-secret", user.passwordHash), true);
  });

  it("leaves credentials unchanged when env already matches", async () => {
    const bcrypt = await import("bcryptjs");
    const hash = await bcrypt.hash("secret", 4);
    const user = {
      login: "admin",
      passwordHash: hash,
      telegramId: null,
      username: null,
      lastTelegramSyncAt: null,
    };

    const sync = await applySeedAdminEnvSync(user, "admin", "secret", hash);

    assert.equal(sync.syncedLogin, false);
    assert.equal(sync.syncedPassword, false);
    assert.equal(user.passwordHash, hash);
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
