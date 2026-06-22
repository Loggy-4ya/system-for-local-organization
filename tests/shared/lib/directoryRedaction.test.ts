/**
 * @fileoverview Unit tests for directory redaction and access control logic extensions.
 *
 * Module under test: shared/lib/directoryRedaction.ts and shared/lib/accessControlLogic.ts
 * Registry: .ai/docs/testing.md
 * Run: `npm run test:directory-redaction`
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEFAULT_ACCESS_CONTROL_SETTINGS,
  type AccessLevelIndex,
  type PermissionKey,
} from "@shared/constants/accessControl";
import {
  canActorViewDirectory,
  canActorEditProfile,
  canActorAssignAccessLevel,
  canActorAssignSociumRoles,
  canActorAssignAffiliations,
  canActorModifyDelegatedPermissions,
  canActorDeleteUser,
} from "@shared/lib/accessControlLogic";
import { toDirectoryRow } from "@shared/lib/directoryRedaction";
import type { IUser } from "@shared/models/User";

describe("accessControlLogic extensions", () => {
  const actorAdmin = {
    role: "Admin" as const,
    accessLevelIndex: 0 as AccessLevelIndex,
    delegatedPermissions: [] as PermissionKey[],
    sociumRoles: [],
    studentTitle: null,
  };

  const actorSgAdmin = {
    role: "StudentCouncil" as const,
    accessLevelIndex: 1 as AccessLevelIndex,
    delegatedPermissions: [] as PermissionKey[],
    sociumRoles: [],
    studentTitle: null,
  };

  const targetStudent = {
    role: "Student" as const,
    accessLevelIndex: 6 as AccessLevelIndex,
    delegatedPermissions: [] as PermissionKey[],
    sociumRoles: [],
    studentTitle: null,
  };

  describe("canActorViewDirectory", () => {
    it("allows admin and sg admin to view directory", () => {
      assert.equal(canActorViewDirectory(actorAdmin, DEFAULT_ACCESS_CONTROL_SETTINGS), true);
      assert.equal(canActorViewDirectory(actorSgAdmin, DEFAULT_ACCESS_CONTROL_SETTINGS), true);
    });

    it("denies common student to view directory by default", () => {
      assert.equal(canActorViewDirectory(targetStudent, DEFAULT_ACCESS_CONTROL_SETTINGS), false);
    });

    it("allows legacy Admin even when matrix omits users.view_directory", () => {
      const settingsWithoutDirectoryView = {
        ...DEFAULT_ACCESS_CONTROL_SETTINGS,
        levelPermissions: {
          ...DEFAULT_ACCESS_CONTROL_SETTINGS.levelPermissions,
          0: DEFAULT_ACCESS_CONTROL_SETTINGS.levelPermissions[0].filter(
            (perm) => perm !== "users.view_directory",
          ),
        },
      };

      assert.equal(
        canActorViewDirectory(actorAdmin, settingsWithoutDirectoryView),
        true,
      );
    });
  });

  describe("canActorEditProfile", () => {
    it("allows legacy Admin even when matrix omits users.edit_profile", () => {
      const settingsWithoutEdit = {
        ...DEFAULT_ACCESS_CONTROL_SETTINGS,
        levelPermissions: {
          ...DEFAULT_ACCESS_CONTROL_SETTINGS.levelPermissions,
          0: DEFAULT_ACCESS_CONTROL_SETTINGS.levelPermissions[0].filter(
            (perm) => perm !== "users.edit_profile",
          ),
        },
      };

      assert.equal(
        canActorEditProfile(actorAdmin, targetStudent, settingsWithoutEdit),
        true,
      );
    });

    it("allows tier-1 actor with users.edit_profile who outranks target", () => {
      assert.equal(
        canActorEditProfile(actorSgAdmin, targetStudent, DEFAULT_ACCESS_CONTROL_SETTINGS),
        true,
      );
    });

    it("denies peer student without permission", () => {
      assert.equal(
        canActorEditProfile(targetStudent, actorAdmin, DEFAULT_ACCESS_CONTROL_SETTINGS),
        false,
      );
    });

    it("allows tier-2 actor with users.edit_profile to edit a peer at the same tier", () => {
      const actor = {
        role: "StudentCouncil" as const,
        accessLevelIndex: 2 as AccessLevelIndex,
        delegatedPermissions: [] as PermissionKey[],
        sociumRoles: [],
        studentTitle: null,
      };
      const peer = {
        role: "StudentCouncil" as const,
        accessLevelIndex: 2 as AccessLevelIndex,
        delegatedPermissions: [] as PermissionKey[],
        sociumRoles: [],
        studentTitle: null,
      };

      assert.equal(
        canActorEditProfile(actor, peer, DEFAULT_ACCESS_CONTROL_SETTINGS),
        true,
      );
    });

    it("denies actor with permission who cannot administer target tier", () => {
      const actorWithEditOnly = {
        role: "StudentCouncil" as const,
        accessLevelIndex: 3 as AccessLevelIndex,
        delegatedPermissions: ["users.edit_profile" as PermissionKey],
        sociumRoles: [],
        studentTitle: null,
      };

      assert.equal(
        canActorEditProfile(actorWithEditOnly, actorSgAdmin, DEFAULT_ACCESS_CONTROL_SETTINGS),
        false,
      );
    });
  });

  describe("canActorAssignAccessLevel", () => {
    it("allows admin to assign lower levels", () => {
      assert.equal(
        canActorAssignAccessLevel(actorAdmin, targetStudent, 4, DEFAULT_ACCESS_CONTROL_SETTINGS),
        true,
      );
    });

    it("denies assigning a level equal or higher than actor", () => {
      assert.equal(
        canActorAssignAccessLevel(actorSgAdmin, targetStudent, 1, DEFAULT_ACCESS_CONTROL_SETTINGS),
        false,
      );
    });

    it("denies when actor does not outrank target", () => {
      assert.equal(
        canActorAssignAccessLevel(targetStudent, actorAdmin, 5, DEFAULT_ACCESS_CONTROL_SETTINGS),
        false,
      );
    });
  });

  describe("canActorAssignSociumRoles", () => {
    it("allows sg admin to assign socium roles to student", () => {
      assert.equal(
        canActorAssignSociumRoles(actorSgAdmin, targetStudent, DEFAULT_ACCESS_CONTROL_SETTINGS),
        true,
      );
    });

    it("denies student to assign socium roles to admin", () => {
      assert.equal(
        canActorAssignSociumRoles(targetStudent, actorAdmin, DEFAULT_ACCESS_CONTROL_SETTINGS),
        false,
      );
    });
  });

  describe("canActorAssignAffiliations", () => {
    it("allows sg admin to assign affiliations to student", () => {
      assert.equal(
        canActorAssignAffiliations(actorSgAdmin, targetStudent, DEFAULT_ACCESS_CONTROL_SETTINGS),
        true,
      );
    });

    it("denies student to assign affiliations to admin", () => {
      assert.equal(
        canActorAssignAffiliations(targetStudent, actorAdmin, DEFAULT_ACCESS_CONTROL_SETTINGS),
        false,
      );
    });
  });

  describe("canActorModifyDelegatedPermissions", () => {
    it("allows admin to delegate valid permissions", () => {
      assert.equal(
        canActorModifyDelegatedPermissions(
          actorAdmin,
          targetStudent,
          ["news.publish"],
          DEFAULT_ACCESS_CONTROL_SETTINGS,
        ),
        true,
      );
    });

    it("denies delegating permissions the actor does not hold or allow", () => {
      assert.equal(
        canActorModifyDelegatedPermissions(
          actorSgAdmin,
          targetStudent,
          ["access_control.manage_settings"],
          DEFAULT_ACCESS_CONTROL_SETTINGS,
        ),
        false,
      );
    });
  });

  describe("canActorDeleteUser", () => {
    it("allows legacy Admin to delete lower-tier users", () => {
      assert.equal(
        canActorDeleteUser(actorAdmin, targetStudent, DEFAULT_ACCESS_CONTROL_SETTINGS),
        true,
      );
    });

    it("allows tier-1 actor with users.delete who outranks target", () => {
      const actorWithDelete = {
        ...actorSgAdmin,
        delegatedPermissions: ["users.delete" as PermissionKey],
      };

      assert.equal(
        canActorDeleteUser(actorWithDelete, targetStudent, DEFAULT_ACCESS_CONTROL_SETTINGS),
        true,
      );
    });

    it("denies actor with users.delete who does not outrank target", () => {
      const actorWithDelete = {
        role: "StudentCouncil" as const,
        accessLevelIndex: 3 as AccessLevelIndex,
        delegatedPermissions: ["users.delete" as PermissionKey],
        sociumRoles: [],
        studentTitle: null,
      };

      assert.equal(
        canActorDeleteUser(actorWithDelete, actorSgAdmin, DEFAULT_ACCESS_CONTROL_SETTINGS),
        false,
      );
    });
  });
});

describe("toDirectoryRow redaction", () => {
  const settings = DEFAULT_ACCESS_CONTROL_SETTINGS;

  const mockTargetUser = {
    _id: "target_user_id",
    name: "Ivan",
    surname: "Ivanov",
    avatar: "https://avatar.url",
    role: "Student",
    accessLevelIndex: 6,
    specialty: "Software Engineering",
    group: "SE-41",
    login: "ivan123",
    email: "ivan@nexus.edu",
    phone: "+380991234567",
    googleId: "google-oauth-id",
    appleId: null,
    telegramId: 987654321,
    delegatedPermissions: ["tasks.receive"],
    sociumRoles: [
      {
        roleKey: "student",
        roleLabel: "Student",
        kind: "student",
        source: "system",
        assignedAt: new Date(),
      },
    ],
    socialGroupActivities: [
      {
        activityKey: "sport",
        activityLabel: "Sport Club",
        assignedAt: new Date(),
      },
    ],
    organizations: [
      {
        orgKey: "council",
        orgLabel: "Student Council",
        assignedAt: new Date(),
      },
    ],
    studentTitle: null,
    about: "Bio text",
    socialLinks: [{ platform: "github", label: null, url: "https://github.com/ivan" }],
  } as unknown as IUser;

  it("exposes PII and full access fields to an outranking actor (e.g. Admin)", () => {
    const actor = {
      role: "Admin" as const,
      accessLevelIndex: 0 as AccessLevelIndex,
      delegatedPermissions: [] as PermissionKey[],
      sociumRoles: [],
      studentTitle: null,
    };

    const row = toDirectoryRow(actor, mockTargetUser, settings);

    assert.equal(row.id, "target_user_id");
    assert.equal(row.fullName, "Ivan Ivanov");
    assert.equal(row.login, "ivan123");
    assert.equal(row.email, "ivan@nexus.edu");
    assert.equal(row.phone, "+380991234567");
    assert.equal(row.telegramId, 987654321);
    assert.equal(row.linkedGoogle, true);
    assert.equal(row.linkedApple, false);
    assert.ok(row.delegatedPermissions);
    assert.ok(row.sociumRoles);
    assert.ok(row.socialGroupActivities);
    assert.ok(row.organizations);
    assert.equal(row.canManage, true);
    assert.equal(row.canAssignLevel, true);
    assert.equal(row.canAssignSocium, true);
    assert.equal(row.canAssignAffiliations, true);
    assert.equal(row.canDelegate, true);
    assert.equal(row.canEditProfile, true);
    assert.equal(row.canDelete, true);
    assert.equal(row.about, "Bio text");
  });

  it("redacts PII and full access fields for a non-outranking actor (e.g. Peer Student)", () => {
    const actor = {
      role: "Student" as const,
      accessLevelIndex: 6 as AccessLevelIndex,
      delegatedPermissions: [] as PermissionKey[],
      sociumRoles: [],
      studentTitle: null,
    };

    const row = toDirectoryRow(actor, mockTargetUser, settings);

    assert.equal(row.id, "target_user_id");
    assert.equal(row.fullName, "Ivan Ivanov");
    assert.equal(row.login, null);
    assert.equal(row.email, null);
    assert.equal(row.phone, null);
    assert.equal(row.telegramId, null);
    assert.equal(row.linkedGoogle, null);
    assert.equal(row.linkedApple, null);
    assert.equal(row.delegatedPermissions, null);
    assert.equal(row.sociumRoles, null);
    assert.equal(row.socialGroupActivities, null);
    assert.equal(row.organizations, null);
    assert.equal(row.canManage, false);
    assert.equal(row.canAssignLevel, false);
    assert.equal(row.canAssignSocium, false);
    assert.equal(row.canAssignAffiliations, false);
    assert.equal(row.canDelegate, false);
    assert.equal(row.canEditProfile, false);
    assert.equal(row.canDelete, false);
  });
});
