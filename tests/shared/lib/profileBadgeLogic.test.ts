/**
 * Profile badge taxonomy helpers.
 *
 * Run: `npm run test:profile-badge-logic`
 * Registry: `.ai/docs/testing.md`
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  profileBadgeClassName,
  profileSocialLinkAccentClass,
  resolveProfileAccessLevelLabel,
  resolveProfileSystemRoleLabel,
  resolveSocialLinkPlatformLabel,
} from "@shared/lib/profileBadgeLogic";

describe("profileBadgeLogic", () => {
  it("maps badge kinds to stable CSS classes", () => {
    assert.equal(
      profileBadgeClassName("access_level"),
      "badge badge-profile badge-profile--access-level",
    );
    assert.equal(
      profileBadgeClassName("socium_role"),
      "badge badge-profile badge-profile--socium-role",
    );
  });

  it("resolves hierarchy and RBAC labels", () => {
    assert.equal(resolveProfileAccessLevelLabel(0), "System Administrator");
    assert.equal(resolveProfileSystemRoleLabel("StudentCouncil"), "Student Council");
    assert.equal(resolveProfileSystemRoleLabel("Admin"), "Admin");
  });

  it("resolves social link labels and accent classes", () => {
    assert.equal(resolveSocialLinkPlatformLabel("telegram"), "Telegram");
    assert.equal(resolveSocialLinkPlatformLabel("custom", "Portfolio"), "Portfolio");
    assert.equal(profileSocialLinkAccentClass("twitter"), "profile-social-link--x");
    assert.equal(profileSocialLinkAccentClass("unknown"), "profile-social-link--custom");
  });
});
