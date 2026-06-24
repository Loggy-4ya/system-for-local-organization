/**
 * @fileoverview Unit tests for page @mention go-live notification helpers.
 *
 * Module under test: shared/lib/pageMentionNotificationLogic.ts
 * Registry: `.ai/docs/testing.md`
 * Run: `npm run test:page-mention-notification`
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildPageMentionNotificationCopy,
  buildPageMentionTelegramMessage,
  collectUserMentionIdsFromPuckData,
  extractUserMentionIdsFromHtml,
  resolvePageMentionNotificationRecipients,
  shouldDispatchPageMentionNotifications,
} from "@shared/lib/pageMentionNotificationLogic";
import { serializeMentionAnchor } from "@shared/lib/nexusRichTextSanitize";

const userMentionHtml = (id: string, label: string) =>
  `<p>Hello ${serializeMentionAnchor({
    mentionType: "user",
    id,
    label,
    href: `/users/${label}`,
  })}!</p>`;

const pageMentionHtml = (id: string, path: string, label: string) =>
  `<p>See ${serializeMentionAnchor({
    mentionType: "page",
    id,
    label,
    href: path,
  })}.</p>`;

describe("extractUserMentionIdsFromHtml", () => {
  it("collects user mention ids and ignores page mentions", () => {
    const html = [
      userMentionHtml("user-a", "alice"),
      pageMentionHtml("page-1", "/news", "News"),
      userMentionHtml("user-b", "bob"),
    ].join("");

    assert.deepEqual(extractUserMentionIdsFromHtml(html), ["user-a", "user-b"]);
  });

  it("dedupes repeated user mentions", () => {
    const html = userMentionHtml("user-a", "alice") + userMentionHtml("user-a", "alice");
    assert.deepEqual(extractUserMentionIdsFromHtml(html), ["user-a"]);
  });

  it("returns empty for plain text", () => {
    assert.deepEqual(extractUserMentionIdsFromHtml("Hello world"), []);
  });
});

describe("collectUserMentionIdsFromPuckData", () => {
  it("walks nested Puck blocks and list items", () => {
    const puckData = {
      content: [
        {
          type: "NexusText",
          props: { text: userMentionHtml("user-a", "alice") },
        },
        {
          type: "NexusList",
          props: {
            items: [{ text: userMentionHtml("user-b", "bob") }],
          },
        },
      ],
    };

    assert.deepEqual(collectUserMentionIdsFromPuckData(puckData).sort(), ["user-a", "user-b"]);
  });
});

describe("resolvePageMentionNotificationRecipients", () => {
  it("excludes the page author", () => {
    assert.deepEqual(
      resolvePageMentionNotificationRecipients(["author-1", "user-2", "author-1"], "author-1"),
      ["user-2"],
    );
  });
});

describe("shouldDispatchPageMentionNotifications", () => {
  const now = new Date("2026-06-21T12:00:00.000Z");

  it("fires on first go-live", () => {
    assert.equal(
      shouldDispatchPageMentionNotifications({ published: false, publishAt: null }, now),
      true,
    );
  });

  it("skips when the page was already public", () => {
    assert.equal(
      shouldDispatchPageMentionNotifications({ published: true, publishAt: null }, now),
      false,
    );
  });
});

describe("buildPageMentionNotificationCopy", () => {
  it("includes author name when provided", () => {
    assert.deepEqual(buildPageMentionNotificationCopy("Campus News", "Ada Admin"), {
      title: "You were mentioned on: Campus News",
      body: "Ada Admin mentioned you on a newly published page.",
    });
  });

  it("falls back when author name is missing", () => {
    assert.deepEqual(buildPageMentionNotificationCopy("Campus News", null), {
      title: "You were mentioned on: Campus News",
      body: "You were mentioned on a newly published page.",
    });
  });
});

describe("buildPageMentionTelegramMessage", () => {
  it("includes title, body, and link", () => {
    const text = buildPageMentionTelegramMessage(
      "You were mentioned on: News",
      "Ada mentioned you.",
      "https://nexus.example.com/news",
    );
    assert.match(text, /You were mentioned on: News/);
    assert.match(text, /Ada mentioned you\./);
    assert.match(text, /https:\/\/nexus\.example\.com\/news/);
  });
});
