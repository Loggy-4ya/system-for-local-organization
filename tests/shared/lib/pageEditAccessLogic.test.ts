/**
 * @fileoverview Tests for page ownership edit access rules.
 *
 * Module under test: shared/lib/pageEditAccessLogic.ts
 * Registry: .ai/docs/testing.md
 * Run: `npm run test:page-edit-access-logic`
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canUserCreatePages,
  canUserEditPage,
  hasGlobalPageEditAuthority,
} from "@shared/lib/pageEditAccessLogic";

const authorActor = {
  userId: "author-1",
  role: "Student" as const,
  accessLevelIndex: 6 as const,
  permissions: ["pages.create", "pages.edit_own"] as const,
};

describe("hasGlobalPageEditAuthority", () => {
  it("grants system and self-gov admins", () => {
    assert.equal(hasGlobalPageEditAuthority(0, "Admin"), true);
    assert.equal(hasGlobalPageEditAuthority(1, "Student"), true);
    assert.equal(hasGlobalPageEditAuthority(6, "Student"), false);
  });
});

describe("canUserEditPage", () => {
  it("allows authors with pages.edit_own", () => {
    assert.equal(
      canUserEditPage(authorActor, { authorUserId: "author-1", delegatedEditorUserIds: [] }),
      true,
    );
    assert.equal(
      canUserEditPage(authorActor, { authorUserId: "other-user", delegatedEditorUserIds: [] }),
      false,
    );
  });

  it("allows delegated editors", () => {
    assert.equal(
      canUserEditPage(
        { ...authorActor, userId: "delegate-1", permissions: [] },
        { authorUserId: "author-1", delegatedEditorUserIds: ["delegate-1"] },
      ),
      true,
    );
  });
});

describe("canUserCreatePages", () => {
  it("requires pages.create unless global admin", () => {
    assert.equal(canUserCreatePages(authorActor), true);
    assert.equal(
      canUserCreatePages({ ...authorActor, permissions: [], accessLevelIndex: 6 }),
      false,
    );
    assert.equal(
      canUserCreatePages({ ...authorActor, permissions: [], accessLevelIndex: 1 }),
      true,
    );
  });
});
