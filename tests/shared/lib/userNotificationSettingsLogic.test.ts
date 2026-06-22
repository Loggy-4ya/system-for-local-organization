/**
 * @fileoverview Unit tests for user notification channel preferences.
 *
 * Run: `npm run test:user-notification-settings`
 * Registry: `.ai/docs/testing.md`
 *
 * @module tests/shared/lib/userNotificationSettingsLogic.test
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  intersectNotificationChannels,
  normalizeUserNotificationChannels,
  userAcceptsNotificationChannel,
} from "@shared/lib/userNotificationSettingsLogic";

describe("normalizeUserNotificationChannels", () => {
  it("defaults to web when value is missing", () => {
    assert.deepEqual(normalizeUserNotificationChannels(undefined), ["web"]);
  });

  it("dedupes and preserves order", () => {
    assert.deepEqual(normalizeUserNotificationChannels(["telegram", "web", "telegram"]), [
      "web",
      "telegram",
    ]);
  });

  it("falls back to web when empty", () => {
    assert.deepEqual(normalizeUserNotificationChannels([]), ["web"]);
  });
});

describe("userAcceptsNotificationChannel", () => {
  it("respects user preference list", () => {
    assert.equal(userAcceptsNotificationChannel(["telegram"], "telegram"), true);
    assert.equal(userAcceptsNotificationChannel(["telegram"], "web"), false);
  });
});

describe("intersectNotificationChannels", () => {
  it("intersects task channels with user prefs", () => {
    assert.deepEqual(
      intersectNotificationChannels(["web", "telegram"], ["web"]),
      ["web"],
    );
  });
});
