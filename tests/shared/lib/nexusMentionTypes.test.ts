/**
 * @fileoverview Unit tests for mention search DTO helpers.
 *
 * Run: `npm run test:nexus-mention-types`
 * Registry: `.ai/docs/testing.md`
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { flattenMentionSearchResult, normalizeMentionLabel, dedupeNexusMentionItems } from "@shared/lib/nexusMentionTypes";

describe("normalizeMentionLabel", () => {
  it("strips leading @ characters", () => {
    assert.equal(normalizeMentionLabel("@admin"), "admin");
    assert.equal(normalizeMentionLabel("@@admin"), "admin");
  });
});

describe("dedupeNexusMentionItems", () => {
  it("collapses duplicate ids and shared profile logins", () => {
    const rows = dedupeNexusMentionItems([
      {
        mentionType: "user",
        id: "mongo-1",
        label: "admin",
        href: "/users/admin",
      },
      {
        mentionType: "user",
        id: "mongo-2",
        label: "admin",
        href: "/users/admin",
      },
      {
        mentionType: "user",
        id: "mongo-1",
        label: "admin",
        href: "/users/admin",
      },
    ]);

    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.href, "/users/admin");
  });
});

describe("flattenMentionSearchResult", () => {
  it("deduplicates users and pages by id", () => {
    const rows = flattenMentionSearchResult({
      users: [
        {
          mentionType: "user",
          id: "u1",
          label: "admin",
          href: "/users/admin",
        },
        {
          mentionType: "user",
          id: "u1",
          label: "admin",
          href: "/users/admin",
        },
      ],
      pages: [
        {
          mentionType: "page",
          id: "p1",
          label: "News",
          href: "/news",
        },
        {
          mentionType: "page",
          id: "p1",
          label: "News",
          href: "/news",
        },
      ],
    });

    assert.equal(rows.length, 2);
    assert.equal(rows[0]?.section, "users");
    assert.equal(rows[1]?.section, "pages");
  });
});
