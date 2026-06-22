/**
 * @fileoverview Tests for profile contact channel resolution.
 *
 * Run: `npm run test:profile-contact-logic`
 * Registry: `.ai/docs/testing.md`
 *
 * @module tests/shared/lib/profileContactLogic.test
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildTelegramDirectMessageUrl,
  resolveProfileContactOptions,
} from "@shared/lib/profileContactLogic";

describe("buildTelegramDirectMessageUrl", () => {
  it("normalizes @username handles", () => {
    assert.equal(buildTelegramDirectMessageUrl("@nexus_admin"), "https://t.me/nexus_admin");
  });

  it("returns null for invalid handles", () => {
    assert.equal(buildTelegramDirectMessageUrl("ab"), null);
  });
});

describe("resolveProfileContactOptions", () => {
  it("prefers linked Telegram username over social links", () => {
    const result = resolveProfileContactOptions({
      username: "member_one",
      email: "member@example.com",
      socialLinks: [{ platform: "telegram", url: "https://t.me/other", label: null }],
    });

    assert.equal(result.channels[0]?.href, "https://t.me/member_one");
    assert.equal(result.channels.some((channel) => channel.kind === "email"), true);
  });

  it("uses public social links when PII is redacted", () => {
    const result = resolveProfileContactOptions({
      username: null,
      email: null,
      socialLinks: [{ platform: "telegram", url: "https://t.me/public_member", label: "Chat" }],
    });

    assert.equal(result.hasAny, true);
    assert.equal(result.channels[0]?.href, "https://t.me/public_member");
  });
});
