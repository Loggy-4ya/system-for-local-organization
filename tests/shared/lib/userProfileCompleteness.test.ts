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
  buildProfileCompletenessSummary,
  getMembershipProfileGaps,
  getOAuthOnboardingGaps,
  isProfileReadyForMembershipApplication,
  phoneIsRequiredForUser,
  userHasExternalAuthIdentity,
  userNeedsProfileOnboarding,
} from "@shared/lib/userProfileCompleteness";

const completeProfile = {
  name: "Ada",
  surname: "Lovelace",
  phone: "+380 50 123 4567",
  specialty: "Software Engineering",
  group: "SE-42",
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
