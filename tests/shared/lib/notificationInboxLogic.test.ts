/**
 * @fileoverview Unit tests for personal notification inbox pure helpers.
 *
 * Run: `npm run test:notification-inbox`
 * Registry: `.ai/docs/testing.md`
 *
 * @module tests/shared/lib/notificationInboxLogic.test
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildInboxDeliveryKey,
  isNotificationInboxUnread,
  mapTaskReminderKindToInboxKind,
  normalizeNotificationInboxChannels,
  resolveNotificationKindLabel,
} from "@shared/lib/notificationInboxLogic";

describe("buildInboxDeliveryKey", () => {
  it("joins prefix and segments", () => {
    assert.equal(buildInboxDeliveryKey("broadcast", "abc123"), "broadcast:abc123");
    assert.equal(
      buildInboxDeliveryKey("task_reminder", "taskId", "2026-01-01T00:00:00.000Z"),
      "task_reminder:taskId:2026-01-01T00:00:00.000Z",
    );
  });
});

describe("mapTaskReminderKindToInboxKind", () => {
  it("maps reminder document kinds", () => {
    assert.equal(mapTaskReminderKindToInboxKind("task"), "task_reminder");
    assert.equal(mapTaskReminderKindToInboxKind("group"), "task_group_reminder");
    assert.equal(mapTaskReminderKindToInboxKind("institutional"), "institutional_reminder");
  });
});

describe("isNotificationInboxUnread", () => {
  it("treats null readAt as unread", () => {
    assert.equal(isNotificationInboxUnread(null), true);
    assert.equal(isNotificationInboxUnread(undefined), true);
    assert.equal(isNotificationInboxUnread(new Date()), false);
  });
});

describe("normalizeNotificationInboxChannels", () => {
  it("defaults to web when empty", () => {
    assert.deepEqual(normalizeNotificationInboxChannels([]), ["web"]);
    assert.deepEqual(normalizeNotificationInboxChannels(undefined), ["web"]);
  });

  it("dedupes known channels", () => {
    assert.deepEqual(normalizeNotificationInboxChannels(["telegram", "web", "telegram"]), [
      "web",
      "telegram",
    ]);
  });
});

describe("resolveNotificationKindLabel", () => {
  it("returns human labels", () => {
    assert.equal(resolveNotificationKindLabel("broadcast"), "Announcement");
    assert.equal(resolveNotificationKindLabel("task_assignment"), "Task assignment");
  });
});
