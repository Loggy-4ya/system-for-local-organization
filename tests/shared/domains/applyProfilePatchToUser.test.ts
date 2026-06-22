/**
 * @fileoverview Unit tests for shared profile patch helper used by admin directory edits.
 *
 * Module under test: shared/lib/userProfilePatch.ts
 * Registry: .ai/docs/testing.md
 * Run: `npm run test:apply-profile-patch`
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyProfilePatchToUser } from "@shared/lib/userProfilePatch";
import type { IUser } from "@shared/models/User";

describe("applyProfilePatchToUser", () => {
  it("updates general profile fields on an in-memory user document", () => {
    const user = {
      name: "Old",
      surname: "Name",
      specialty: "Old Spec",
      group: "G-1",
      studentTitle: "Neither",
      phone: null,
      about: null,
      socialLinks: [],
      avatar: null,
      sociumRoles: [],
    } as unknown as IUser;

    applyProfilePatchToUser(user, {
      name: "New",
      surname: "Person",
      specialty: "Software Engineering",
      group: "SE-42",
      about: "Fixed group info",
      phone: "+380501234567",
    });

    assert.equal(user.name, "New");
    assert.equal(user.surname, "Person");
    assert.equal(user.specialty, "Software Engineering");
    assert.equal(user.group, "SE-42");
    assert.equal(user.about, "Fixed group info");
    assert.equal(user.phone, "+380501234567");
  });

  it("promotes Starosta title to hierarchy index 4", () => {
    const user = {
      name: "Star",
      surname: "Osta",
      specialty: "SE",
      group: "SE-1",
      studentTitle: "Neither",
      accessLevelIndex: 6,
      phone: "+380501234567",
      sociumRoles: [],
      socialLinks: [],
      avatar: null,
      about: null,
    } as unknown as IUser;

    applyProfilePatchToUser(user, { studentTitle: "Starosta" });

    assert.equal(user.studentTitle, "Starosta");
    assert.equal(user.accessLevelIndex, 4);
  });

  it("rejects clearing avatar for self-government applicants", () => {
    const user = {
      name: "Member",
      surname: "Applicant",
      specialty: "SE",
      group: "12",
      studentTitle: "Neither",
      phone: "+380501234567",
      sociumRoles: [],
      socialLinks: [],
      avatar: "/uploads/avatars/member.png",
      about: null,
      selfGovernmentApplicationIntent: true,
    } as unknown as IUser;

    assert.throws(
      () => applyProfilePatchToUser(user, { avatar: null }),
      /Complete all required fields for self-government application/,
    );
  });
});
