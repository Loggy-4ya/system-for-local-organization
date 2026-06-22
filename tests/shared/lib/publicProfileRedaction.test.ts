/**
 * @fileoverview Unit tests for public profile PII redaction.
 *
 * Run: `npm run test:public-profile-redaction`
 * Registry: `.ai/docs/testing.md`
 *
 * @module tests/shared/lib/publicProfileRedaction.test
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canViewerSeeProfilePii,
  toPublicProfileUser,
} from "@shared/lib/publicProfileRedaction";
import type { IUser } from "@shared/models/User";

function mockUser(overrides: Partial<IUser> & { _id: string }): IUser {
  return {
    _id: overrides._id,
    name: "Ada",
    surname: "Lovelace",
    login: "ada",
    email: "ada@school.edu",
    phone: "+380501234567",
    role: "Student",
    accessLevelIndex: 6,
    delegatedPermissions: [],
    sociumRoles: [],
    socialGroupActivities: [],
    organizations: [],
    socialLinks: [],
    stars: 0,
    warnings: 0,
  } as IUser;
}

describe("publicProfileRedaction", () => {
  it("hides PII when peer viewers do not outrank target", () => {
    const viewer = mockUser({ _id: "viewer", accessLevelIndex: 6 });
    const target = mockUser({ _id: "target", accessLevelIndex: 6 });

    const profile = toPublicProfileUser(
      {
        id: "viewer",
        role: viewer.role,
        accessLevelIndex: 6,
        delegatedPermissions: [],
        sociumRoles: [],
        studentTitle: null,
      },
      target,
    );

    assert.equal(profile.login, null);
    assert.equal(profile.email, null);
    assert.equal(canViewerSeeProfilePii(viewer, target), false);
  });

  it("shows PII to self", () => {
    const user = mockUser({ _id: "self", accessLevelIndex: 6 });
    const profile = toPublicProfileUser(
      {
        id: "self",
        role: user.role,
        accessLevelIndex: 6,
        delegatedPermissions: [],
        sociumRoles: [],
        studentTitle: null,
      },
      user,
    );

    assert.equal(profile.isSelf, true);
    assert.equal(profile.login, "ada");
    assert.equal(profile.email, "ada@school.edu");
  });
});
