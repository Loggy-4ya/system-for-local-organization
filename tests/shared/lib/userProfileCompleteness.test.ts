/**
 * @fileoverview Unit tests for profile completeness / membership gating helpers.
 *
 * Module under test: shared/lib/userProfileCompleteness.ts
 * Registry: .ai/docs/testing.md
 * Run: `npm run test:profile-completeness`
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assertDirectoryMemberProfileRequirements,
  buildProfileCompletenessSummary,
  getMembershipProfileGaps,
  getOAuthOnboardingGaps,
  isProfileReadyForMembershipApplication,
  phoneIsRequiredForUser,
  avatarIsRequiredForUser,
  avatarIsRequiredAtSignup,
  telegramIsRequiredAtSignup,
  userHasExternalAuthIdentity,
  userNeedsProfileOnboarding,
  userNeedsTeacherAccessGate,
  PROFILE_PHONE_REQUIRED,
  shouldShowMembershipReadinessBanner,
} from "@shared/lib/userProfileCompleteness";

const completeProfile = {
  name: "Ada",
  surname: "Lovelace",
  phone: "+380 50 123 4567",
  specialty: "Software Engineering",
  group: "SE-42",
  avatar: "/uploads/avatars/ada.png",
  sociumRoles: [],
};

describe("getMembershipProfileGaps", () => {
  it("returns empty when all required fields are present", () => {
    assert.deepEqual(getMembershipProfileGaps(completeProfile), []);
  });

  it("flags missing phone and surname", () => {
    const gaps = getMembershipProfileGaps({
      ...completeProfile,
      phone: null,
      surname: null,
    });
    assert.ok(gaps.includes("phone"));
    assert.ok(gaps.includes("surname"));
  });
});

describe("isProfileReadyForMembershipApplication", () => {
  it("returns true for a complete profile", () => {
    assert.equal(isProfileReadyForMembershipApplication(completeProfile), true);
  });

  it("returns false when phone is missing", () => {
    assert.equal(
      isProfileReadyForMembershipApplication({ ...completeProfile, phone: null }),
      false,
    );
  });
});

describe("phoneIsRequiredForUser", () => {
  it("requires phone for self-government members", () => {
    assert.equal(
      phoneIsRequiredForUser({
        ...completeProfile,
        sociumRoles: [
          {
            roleKey: "self_government_member",
            roleLabel: "Member",
            kind: "self_government_member",
            source: "admin",
            assignedAt: new Date(),
          },
        ],
      }),
      true,
    );
  });

  it("does not require phone for regular students", () => {
    assert.equal(phoneIsRequiredForUser(completeProfile), false);
  });
});

describe("avatarIsRequiredForUser", () => {
  it("requires avatar for self-government members", () => {
    assert.equal(
      avatarIsRequiredForUser({
        ...completeProfile,
        sociumRoles: [
          {
            roleKey: "self_government_member",
            roleLabel: "Member",
            kind: "self_government_member",
            source: "admin",
            assignedAt: new Date(),
          },
        ],
      }),
      true,
    );
  });

  it("requires avatar when application intent is recorded", () => {
    assert.equal(
      avatarIsRequiredForUser({
        ...completeProfile,
        selfGovernmentApplicationIntent: true,
      }),
      true,
    );
  });

  it("does not require avatar for regular students", () => {
    assert.equal(avatarIsRequiredForUser(completeProfile), false);
  });
});

describe("avatarIsRequiredAtSignup", () => {
  it("requires avatar when applying for self-government or registering as a teacher", () => {
    assert.equal(avatarIsRequiredAtSignup(true), true);
    assert.equal(avatarIsRequiredAtSignup(false), false);
    assert.equal(avatarIsRequiredAtSignup(false, true), true);
  });
});

describe("teacher application profile gaps", () => {
  const teacherProfile = {
    ...completeProfile,
    specialty: null,
    group: null,
    sociumRoles: [
      {
        roleKey: "teacher",
        roleLabel: "Teacher",
        kind: "teacher" as const,
        source: "self" as const,
        assignedAt: new Date(),
      },
    ],
    teacherAccessApproved: false,
  };

  it("does not require specialty or group for teachers", () => {
    assert.deepEqual(getMembershipProfileGaps(teacherProfile), []);
  });

  it("still requires surname, phone, and avatar for teachers", () => {
    const gaps = getMembershipProfileGaps({
      ...teacherProfile,
      surname: null,
      phone: null,
      avatar: null,
    });
    assert.deepEqual(gaps, ["surname", "phone", "avatar"]);
  });

  it("gates unapproved teachers until access is granted", () => {
    assert.equal(userNeedsTeacherAccessGate(teacherProfile), true);
    assert.equal(
      userNeedsTeacherAccessGate({ ...teacherProfile, teacherAccessApproved: true }),
      false,
    );
  });
});

describe("telegramIsRequiredAtSignup", () => {
  it("does not require Telegram at signup while membership-application flag is off", () => {
    assert.equal(telegramIsRequiredAtSignup(true), false);
    assert.equal(telegramIsRequiredAtSignup(false), false);
  });
});

describe("telegram membership gaps", () => {
  it("flags missing Telegram for self-government members", () => {
    const gaps = getMembershipProfileGaps({
      ...completeProfile,
      sociumRoles: [
        {
          roleKey: "self_government_member",
          roleLabel: "Member",
          kind: "self_government_member",
          source: "admin",
          assignedAt: new Date(),
        },
      ],
      telegramId: null,
    });
    assert.ok(gaps.includes("telegram"));
  });

  it("does not require Telegram for membership applicants", () => {
    const gaps = getMembershipProfileGaps({
      ...completeProfile,
      selfGovernmentApplicationIntent: true,
      telegramId: null,
    });
    assert.ok(!gaps.includes("telegram"));
  });

  it("does not require Telegram for general students", () => {
    const gaps = getMembershipProfileGaps(completeProfile);
    assert.ok(!gaps.includes("telegram"));
  });
});

describe("buildProfileCompletenessSummary", () => {
  it("reports ready state when complete", () => {
    const summary = buildProfileCompletenessSummary(completeProfile);
    assert.equal(summary.readyForMembershipApplication, true);
    assert.equal(summary.missingFields.length, 0);
  });
});

describe("userNeedsProfileOnboarding", () => {
  const oauthSparse = {
    ...completeProfile,
    surname: null,
    phone: null,
    specialty: null,
    group: null,
    googleId: "google-123",
    appleId: null,
    telegramId: null,
    personalDataConsentAt: null,
  };

  it("requires onboarding for sparse Google account", () => {
    assert.equal(userNeedsProfileOnboarding(oauthSparse), true);
  });

  it("does not require onboarding for credentials-only users", () => {
    assert.equal(
      userNeedsProfileOnboarding({
        ...completeProfile,
        personalDataConsentAt: new Date(),
        googleId: null,
        appleId: null,
        telegramId: null,
      }),
      false,
    );
  });

  it("clears onboarding when all fields and consent are present", () => {
    assert.equal(
      userNeedsProfileOnboarding({
        ...completeProfile,
        googleId: "google-123",
        personalDataConsentAt: new Date(),
      }),
      false,
    );
  });
});

describe("getOAuthOnboardingGaps", () => {
  it("includes consent when not recorded", () => {
    const gaps = getOAuthOnboardingGaps({
      ...completeProfile,
      googleId: "g1",
      personalDataConsentAt: null,
    });
    assert.ok(gaps.includes("personalDataConsent"));
  });
});

describe("userHasExternalAuthIdentity", () => {
  it("detects linked Telegram id", () => {
    assert.equal(
      userHasExternalAuthIdentity({
        ...completeProfile,
        telegramId: 42,
      }),
      true,
    );
  });
});

describe("assertDirectoryMemberProfileRequirements", () => {
  it("throws when a self-government member has no phone on file", () => {
    assert.throws(
      () =>
        assertDirectoryMemberProfileRequirements({
          ...completeProfile,
          phone: null,
          sociumRoles: [
            {
              roleKey: "self_government_member",
              roleLabel: "Member",
              kind: "self_government_member",
              source: "admin",
              assignedAt: new Date(),
            },
          ],
        }),
      { message: PROFILE_PHONE_REQUIRED },
    );
  });

  it("throws when a self-government member only has whitespace phone on file", () => {
    assert.throws(
      () =>
        assertDirectoryMemberProfileRequirements({
          ...completeProfile,
          phone: "   ",
          sociumRoles: [
            {
              roleKey: "self_government_member",
              roleLabel: "Member",
              kind: "self_government_member",
              source: "admin",
              assignedAt: new Date(),
            },
          ],
        }),
      { message: PROFILE_PHONE_REQUIRED },
    );
  });
});

describe("shouldShowMembershipReadinessBanner", () => {
  it("hides the banner for system administrators", () => {
    assert.equal(shouldShowMembershipReadinessBanner(0), false);
  });

  it("shows the banner for other hierarchy tiers", () => {
    assert.equal(shouldShowMembershipReadinessBanner(6), true);
  });
});
