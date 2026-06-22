/**
 * @fileoverview Unit tests for page access grant helpers.
 *
 * Module under test: shared/lib/pageAccessLogic.ts
 * Registry: .ai/docs/testing.md
 * Run: `npm run test:page-access-logic`
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canAddPageAccessEditor,
  canManagePageAccess,
  filterPageAccessEditorCandidates,
  hydratePageAccessEditors,
  normalizeDelegatedEditorsForStorage,
} from "@shared/lib/pageAccessLogic";

const adminActor = {
  userId: "admin-1",
  role: "Admin" as const,
  accessLevelIndex: 0 as const,
  permissions: [] as const,
};

const authorActor = {
  userId: "author-1",
  role: "Student" as const,
  accessLevelIndex: 6 as const,
  permissions: ["pages.edit_own"] as const,
};

describe("canManagePageAccess", () => {
  it("allows global administrators", () => {
    assert.equal(canManagePageAccess(adminActor, { authorUserId: "other", delegatedEditorUserIds: [] }), true);
  });

  it("allows the page author with pages.edit_own", () => {
    assert.equal(
      canManagePageAccess(authorActor, { authorUserId: "author-1", delegatedEditorUserIds: [] }),
      true,
    );
  });

  it("allows page creators on unsaved pages", () => {
    assert.equal(
      canManagePageAccess(
        { ...authorActor, permissions: ["pages.create"] },
        null,
      ),
      true,
    );
  });

  it("denies delegated-only editors", () => {
    assert.equal(
      canManagePageAccess(
        { ...authorActor, userId: "delegate-1", permissions: [] },
        { authorUserId: "author-1", delegatedEditorUserIds: ["delegate-1"] },
      ),
      false,
    );
  });

  it("denies users who cannot edit the page", () => {
    assert.equal(
      canManagePageAccess(
        { ...authorActor, userId: "stranger-1" },
        { authorUserId: "author-1", delegatedEditorUserIds: [] },
      ),
      false,
    );
  });
});

describe("canAddPageAccessEditor", () => {
  it("rejects the author and duplicates", () => {
    assert.equal(canAddPageAccessEditor([], "author-1", "author-1"), false);
    assert.equal(
      canAddPageAccessEditor([{ userId: "u-1", displayName: "One" }], "u-1", "author-1"),
      false,
    );
    assert.equal(canAddPageAccessEditor([], "u-2", "author-1"), true);
  });
});

describe("normalizeDelegatedEditorsForStorage", () => {
  it("dedupes and excludes the author", () => {
    assert.deepEqual(
      normalizeDelegatedEditorsForStorage(
        [
          { userId: "author-1", displayName: "Author" },
          { userId: "u-1", displayName: "One" },
          { userId: "u-1", displayName: "One again" },
        ],
        "author-1",
      ),
      ["u-1"],
    );
  });
});

describe("filterPageAccessEditorCandidates", () => {
  it("removes selected users and matches query", () => {
    const rows = filterPageAccessEditorCandidates(
      "ada",
      [
        {
          userId: "u-1",
          displayName: "Ada Lovelace",
          subtitle: "@ada",
          avatar: null,
        },
        {
          userId: "u-2",
          displayName: "Grace Hopper",
          subtitle: "@grace",
          avatar: null,
        },
      ],
      [{ userId: "u-2", displayName: "Grace Hopper" }],
      "author-1",
    );
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.userId, "u-1");
  });
});

describe("hydratePageAccessEditors", () => {
  it("maps ids to labels", () => {
    assert.deepEqual(hydratePageAccessEditors(["u-1"], { "u-1": "Ada Lovelace" }), [
      { userId: "u-1", displayName: "Ada Lovelace" },
    ]);
  });
});
