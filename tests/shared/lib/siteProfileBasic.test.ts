/**
 * @fileoverview Unit tests for site chrome basic profile helpers.
 *
 * Run: `npm run test:site-profile-basic`
 * Registry: `.ai/docs/testing.md`
 *
 * @module tests/shared/lib/siteProfileBasic.test
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  showAdminPanelForRole,
  toBasicSiteProfile,
} from "@shared/lib/siteProfileBasic";

describe("toBasicSiteProfile", () => {
  it("maps PublicUser fields into the header DTO", () => {
    const profile = toBasicSiteProfile({
      id: "abc123",
      name: "Ivan",
      surname: "Ivanov",
      fullName: "Ivan Ivanov",
      email: "ivan@example.com",
      avatar: "/uploads/avatars/ivan.png",
      role: "Student",
    });

    assert.equal(profile.id, "abc123");
    assert.equal(profile.fullName, "Ivan Ivanov");
    assert.equal(profile.avatar, "/uploads/avatars/ivan.png");
    assert.equal(profile.role, "Student");
  });
});

describe("showAdminPanelForRole", () => {
  it("returns true for Admin and StudentCouncil", () => {
    assert.equal(showAdminPanelForRole("Admin"), true);
    assert.equal(showAdminPanelForRole("StudentCouncil"), true);
  });

  it("returns false for Student and missing roles", () => {
    assert.equal(showAdminPanelForRole("Student"), false);
    assert.equal(showAdminPanelForRole(null), false);
  });
});
