/**
 * @fileoverview Unit tests for institution user search filter helpers.
 *
 * Run: `npm run test:user-search-logic`
 * Registry: `.ai/docs/testing.md`
 *
 * @module tests/shared/lib/userSearchLogic.test
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildUserSearchMongoFilter,
  canSearchUsersByEmail,
  dedupeUserSearchCandidates,
  filterUserSearchCandidates,
  formatUserSearchSubtitle,
} from "@shared/lib/userSearchLogic";

describe("userSearchLogic", () => {
  it("builds filter across name, login, group fields", () => {
    const filter = buildUserSearchMongoFilter("ada", { includeEmail: false });
    assert.ok(Array.isArray((filter as { $or: unknown[] }).$or));
    assert.equal((filter as { $or: unknown[] }).$or.length, 6);
  });

  it("includes email when permitted", () => {
    const filter = buildUserSearchMongoFilter("ada@school.edu", { includeEmail: true });
    assert.equal((filter as { $or: unknown[] }).$or.length, 7);
  });

  it("allows email search for task dispatchers", () => {
    assert.equal(
      canSearchUsersByEmail({
        role: "StudentCouncil",
        accessLevelIndex: 1,
        delegatedPermissions: ["tasks.dispatch"],
        sociumRoles: [],
        studentTitle: null,
        permissions: ["tasks.dispatch"],
      }),
      true,
    );
  });

  it("formats subtitle with login and group", () => {
    const subtitle = formatUserSearchSubtitle(
      {
        login: "ada",
        username: null,
        email: "ada@school.edu",
        group: "SE-42",
        specialty: "Software",
      },
      false,
    );
    assert.match(subtitle ?? "", /@ada/);
    assert.match(subtitle ?? "", /SE-42/);
    assert.doesNotMatch(subtitle ?? "", /ada@school.edu/);
  });

  it("filters excluded user ids", () => {
    const rows = filterUserSearchCandidates(
      [
        { userId: "a", displayName: "A", subtitle: null, avatar: null, login: null },
        { userId: "b", displayName: "B", subtitle: null, avatar: null, login: null },
      ],
      ["a"],
    );
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.userId, "b");
  });

  it("dedupes repeated user ids and shared logins", () => {
    const rows = dedupeUserSearchCandidates([
      { userId: "1", displayName: "admin", subtitle: "@admin", avatar: null, login: "admin" },
      { userId: "2", displayName: "admin", subtitle: "@admin", avatar: null, login: "admin" },
      { userId: "1", displayName: "admin", subtitle: "@admin", avatar: null, login: "admin" },
    ]);
    assert.equal(rows.length, 1);
  });
});
