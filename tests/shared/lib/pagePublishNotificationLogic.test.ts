/**
 * @fileoverview Unit tests for page go-live notification helpers.
 *
 * Module under test: shared/lib/pagePublishNotificationLogic.ts
 * Registry: `.ai/docs/testing.md`
 * Run: `npm run test:page-publish-notification`
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildPagePublishActionHref,
  buildPagePublishNotificationCopy,
  resolvePageNotifyOnPublish,
  resolvePageNotifyTelegramOnPublish,
  resolvePageNotifyWebOnPublish,
  buildPagePublishTelegramPreview,
  shouldDispatchPageGoLiveNotifications,
  shouldReceivePageGoLiveNotification,
  wasPagePubliclyVisibleBefore,
} from "@shared/lib/pagePublishNotificationLogic";

describe("shouldDispatchPageGoLiveNotifications", () => {
  const now = new Date("2026-06-21T12:00:00.000Z");

  it("fires on first go-live when notifications are enabled", () => {
    assert.equal(
      shouldDispatchPageGoLiveNotifications(
        {
          notifyOnPublish: true,
          priorPublication: { published: false, publishAt: null },
        },
        now,
      ),
      true,
    );
  });

  it("skips when the editor disabled notifications", () => {
    assert.equal(
      shouldDispatchPageGoLiveNotifications(
        {
          notifyOnPublish: false,
          priorPublication: { published: false, publishAt: null },
        },
        now,
      ),
      false,
    );
  });

  it("skips when the page was already public", () => {
    assert.equal(
      shouldDispatchPageGoLiveNotifications(
        {
          notifyOnPublish: true,
          priorPublication: { published: true, publishAt: null },
        },
        now,
      ),
      false,
    );
  });

  it("skips scheduled pages that were already live before reschedule", () => {
    assert.equal(
      shouldDispatchPageGoLiveNotifications(
        {
          notifyOnPublish: true,
          priorPublication: {
            published: true,
            publishAt: "2026-06-20T12:00:00.000Z",
          },
        },
        now,
      ),
      false,
    );
  });
});

describe("wasPagePubliclyVisibleBefore", () => {
  it("delegates to publication visibility rules", () => {
    const now = new Date("2026-06-21T12:00:00.000Z");
    assert.equal(
      wasPagePubliclyVisibleBefore({ published: false, publishAt: null }, now),
      false,
    );
    assert.equal(
      wasPagePubliclyVisibleBefore({ published: true, publishAt: null }, now),
      true,
    );
  });
});

describe("resolvePageNotifyOnPublish", () => {
  it("prefers editor value, then stored value, then default", () => {
    assert.equal(resolvePageNotifyOnPublish(false, true), false);
    assert.equal(resolvePageNotifyOnPublish(undefined, false), false);
    assert.equal(resolvePageNotifyOnPublish(undefined, undefined), true);
  });
});

describe("resolvePageNotifyWebOnPublish", () => {
  it("returns false when master notify is disabled", () => {
    assert.equal(resolvePageNotifyWebOnPublish(true, true, false), false);
  });

  it("prefers editor value when master notify is enabled", () => {
    assert.equal(resolvePageNotifyWebOnPublish(false, true, true), false);
    assert.equal(resolvePageNotifyWebOnPublish(undefined, undefined, true), true);
  });
});

describe("resolvePageNotifyTelegramOnPublish", () => {
  it("returns false when master notify is disabled", () => {
    assert.equal(resolvePageNotifyTelegramOnPublish(true, true, false), false);
  });

  it("prefers editor value when master notify is enabled", () => {
    assert.equal(resolvePageNotifyTelegramOnPublish(false, true, true), false);
    assert.equal(resolvePageNotifyTelegramOnPublish(undefined, undefined, true), true);
  });
});

describe("buildPagePublishTelegramPreview", () => {
  it("interpolates institutional template placeholders", () => {
    const preview = buildPagePublishTelegramPreview(
      "📰 {title}\n\n{body}\n\nOpen: {url}",
      "Spring News",
      "Campus festival details",
      "https://nexus.example.com/news/spring",
    );
    assert.match(preview, /Spring News/);
    assert.match(preview, /Campus festival details/);
    assert.match(preview, /https:\/\/nexus\.example\.com\/news\/spring/);
  });
});

describe("buildPagePublishNotificationCopy", () => {
  it("uses description when present", () => {
    assert.deepEqual(buildPagePublishNotificationCopy("News", "Campus update"), {
      title: "New page: News",
      body: "Campus update",
    });
  });

  it("falls back when description is empty", () => {
    assert.deepEqual(buildPagePublishNotificationCopy("  ", ""), {
      title: "New page: New page",
      body: "A new page is available on Nexus.",
    });
  });
});

describe("buildPagePublishActionHref", () => {
  it("joins base URL and path", () => {
    assert.equal(
      buildPagePublishActionHref("https://nexus.example.com/", "/news/post"),
      "https://nexus.example.com/news/post",
    );
    assert.equal(buildPagePublishActionHref("", "/news/post"), "/news/post");
  });
});

describe("shouldReceivePageGoLiveNotification", () => {
  it("excludes the page author", () => {
    assert.equal(shouldReceivePageGoLiveNotification("author-1", "author-1"), false);
    assert.equal(shouldReceivePageGoLiveNotification("member-2", "author-1"), true);
  });

  it("notifies everyone when author is unknown", () => {
    assert.equal(shouldReceivePageGoLiveNotification("member-2", null), true);
  });
});
