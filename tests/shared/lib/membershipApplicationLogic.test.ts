/**
 * @fileoverview Unit tests for membership application status helpers.
 *
 * Module under test: shared/lib/membershipApplicationLogic.ts
 * Registry: .ai/docs/testing.md
 * Run: `npm run test:membership-application`
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildMembershipApplicationStatus } from "@shared/lib/membershipApplicationLogic";

const completeProfile = {
  name: "Ada",
  surname: "Lovelace",
  phone: "+380501112233",
  specialty: "SE",
  group: "SE-42",
  avatar: "/uploads/avatars/a.png",
  sociumRoles: [
    {
      roleKey: "student",
      roleLabel: "Student",
      kind: "student" as const,
      source: "system" as const,
      assignedAt: new Date(),
    },
  ],
  selfGovernmentApplicationIntent: false,
  telegramId: 12345,
};

describe("buildMembershipApplicationStatus", () => {
  it("reports ready when profile is complete and not yet a member", () => {
    const status = buildMembershipApplicationStatus(completeProfile);
    assert.equal(status.isMember, false);
    assert.equal(status.readyForSubmission, true);
    assert.deepEqual(status.missingFieldLabels, []);
  });

  it("allows submission without Telegram for applicants", () => {
    const status = buildMembershipApplicationStatus({
      ...completeProfile,
      selfGovernmentApplicationIntent: true,
      telegramId: null,
    });
    assert.equal(status.readyForSubmission, true);
    assert.ok(!status.missingFieldLabels.includes("Telegram account"));
  });

  it("treats signup intent as an active application when profile is complete", () => {
    const status = buildMembershipApplicationStatus({
      ...completeProfile,
      selfGovernmentApplicationIntent: true,
    });
    assert.equal(status.hasActiveApplication, true);
  });
});
