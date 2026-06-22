/**
 * @fileoverview Unit tests for access-control hierarchy and permission logic.
 *
 * Module under test: shared/lib/accessControlLogic.ts
 * Registry: .ai/docs/testing.md
 * Run: `npm run test:access-control`
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEFAULT_ACCESS_CONTROL_SETTINGS,
  type AccessLevelIndex,
  outranksInHierarchy,
  meetsOrOutranksInHierarchy,
} from "@shared/constants/accessControl";
import {
  canDelegatePermission,
  canManageUserAccess,
  canActorAssignAccessLevel,
  canActorAssignSociumRoles,
  canActorEditProfile,
  hasPermission,
  inferAccessLevelIndex,
  resolveEffectivePermissions,
} from "@shared/lib/accessControlLogic";

describe("outranksInHierarchy", () => {
  it("returns true when actor index is lower", () => {
    assert.equal(outranksInHierarchy(0, 6), true);
    assert.equal(outranksInHierarchy(2, 3), true);
  });

  it("returns false for equal or higher target index", () => {
    assert.equal(outranksInHierarchy(3, 3), false);
    assert.equal(outranksInHierarchy(6, 4), false);
  });
});

describe("meetsOrOutranksInHierarchy", () => {
  it("returns true for same tier or lower targets", () => {
    assert.equal(meetsOrOutranksInHierarchy(3, 3), true);
    assert.equal(meetsOrOutranksInHierarchy(2, 6), true);
  });

  it("returns false when target outranks actor", () => {
    assert.equal(meetsOrOutranksInHierarchy(4, 2), false);
    assert.equal(meetsOrOutranksInHierarchy(6, 3), false);
  });
});

describe("inferAccessLevelIndex", () => {
  it("maps Admin role to index 0", () => {
    assert.equal(inferAccessLevelIndex({ role: "Admin" }), 0);
  });

  it("uses explicit accessLevelIndex when set", () => {
    assert.equal(
      inferAccessLevelIndex({ role: "Student", accessLevelIndex: 4 as AccessLevelIndex }),
      4,
    );
  });

  it("defaults students to index 6", () => {
    assert.equal(inferAccessLevelIndex({ role: "Student" }), 6);
  });

  it("maps legacy Admin to index 0 even when accessLevelIndex was never backfilled", () => {
    assert.equal(
      inferAccessLevelIndex({ role: "Admin", accessLevelIndex: 6 as AccessLevelIndex }),
      0,
    );
  });
});

describe("resolveEffectivePermissions", () => {
  it("merges tier defaults with delegated permissions", () => {
    const user = {
      role: "Student" as const,
      accessLevelIndex: 6 as AccessLevelIndex,
      delegatedPermissions: ["news.publish" as const],
      sociumRoles: [],
      studentTitle: null,
    };

    const perms = resolveEffectivePermissions(user, DEFAULT_ACCESS_CONTROL_SETTINGS);
    assert.ok(perms.includes("tasks.receive"));
    assert.ok(perms.includes("news.publish"));
  });

  it("grants all permissions to system administrator tier", () => {
    const user = {
      role: "Admin" as const,
      accessLevelIndex: 0 as AccessLevelIndex,
      delegatedPermissions: [],
      sociumRoles: [],
      studentTitle: null,
    };

    const perms = resolveEffectivePermissions(user, DEFAULT_ACCESS_CONTROL_SETTINGS);
    assert.ok(perms.includes("access_control.manage_settings"));
    assert.ok(perms.includes("users.delegate_permissions"));
  });
});

describe("canManageUserAccess", () => {
  it("allows institution admin to manage self-government member", () => {
    const actor = {
      role: "StudentCouncil" as const,
      accessLevelIndex: 2 as AccessLevelIndex,
      delegatedPermissions: [],
      sociumRoles: [],
      studentTitle: null,
    };
    const target = {
      role: "Student" as const,
      accessLevelIndex: 3 as AccessLevelIndex,
      delegatedPermissions: [],
      sociumRoles: [],
      studentTitle: null,
    };

    assert.equal(canManageUserAccess(actor, target, DEFAULT_ACCESS_CONTROL_SETTINGS), true);
  });

  it("allows institution admin to manage peer at the same tier", () => {
    const actor = {
      role: "StudentCouncil" as const,
      accessLevelIndex: 2 as AccessLevelIndex,
      delegatedPermissions: [],
      sociumRoles: [],
      studentTitle: null,
    };
    const peer = {
      role: "StudentCouncil" as const,
      accessLevelIndex: 2 as AccessLevelIndex,
      delegatedPermissions: [],
      sociumRoles: [],
      studentTitle: null,
    };

    assert.equal(canManageUserAccess(actor, peer, DEFAULT_ACCESS_CONTROL_SETTINGS), true);
  });

  it("denies when actor does not outrank target", () => {
    const actor = {
      role: "Student" as const,
      accessLevelIndex: 4 as AccessLevelIndex,
      delegatedPermissions: ["users.assign_access_level" as const],
      sociumRoles: [],
      studentTitle: "Starosta" as const,
    };
    const target = {
      role: "Student" as const,
      accessLevelIndex: 3 as AccessLevelIndex,
      delegatedPermissions: [],
      sociumRoles: [{ roleKey: "sg", roleLabel: "SG", kind: "self_government_member" as const, source: "admin" as const, assignedAt: new Date() }],
      studentTitle: null,
    };

    assert.equal(canManageUserAccess(actor, target, DEFAULT_ACCESS_CONTROL_SETTINGS), false);
  });

  it("allows legacy Admin to manage any target user", () => {
    const admin = {
      role: "Admin" as const,
      accessLevelIndex: 0 as AccessLevelIndex,
      delegatedPermissions: [],
      sociumRoles: [],
      studentTitle: null,
    };
    const peerAdmin = {
      role: "Admin" as const,
      accessLevelIndex: 0 as AccessLevelIndex,
      delegatedPermissions: [],
      sociumRoles: [],
      studentTitle: null,
    };

    assert.equal(canManageUserAccess(admin, peerAdmin, DEFAULT_ACCESS_CONTROL_SETTINGS), true);
  });
});

describe("canActorAssignAccessLevel", () => {
  it("allows legacy Admin to assign tiers 1–6", () => {
    const admin = {
      role: "Admin" as const,
      accessLevelIndex: 0 as AccessLevelIndex,
      delegatedPermissions: [],
      sociumRoles: [],
      studentTitle: null,
    };
    const student = {
      role: "Student" as const,
      accessLevelIndex: 6 as AccessLevelIndex,
      delegatedPermissions: [],
      sociumRoles: [],
      studentTitle: null,
    };

    assert.equal(
      canActorAssignAccessLevel(admin, student, 1, DEFAULT_ACCESS_CONTROL_SETTINGS),
      true,
    );
    assert.equal(
      canActorAssignAccessLevel(admin, student, 0, DEFAULT_ACCESS_CONTROL_SETTINGS),
      false,
    );
  });
});

describe("canActorEditProfile", () => {
  it("allows peers at the same hierarchy tier when permission is granted", () => {
    const actor = {
      role: "StudentCouncil" as const,
      accessLevelIndex: 2 as AccessLevelIndex,
      delegatedPermissions: [],
      sociumRoles: [],
      studentTitle: null,
    };
    const peer = {
      role: "StudentCouncil" as const,
      accessLevelIndex: 2 as AccessLevelIndex,
      delegatedPermissions: [],
      sociumRoles: [],
      studentTitle: null,
    };

    assert.equal(canActorEditProfile(actor, peer, DEFAULT_ACCESS_CONTROL_SETTINGS), true);
  });
});

describe("canActorAssignSociumRoles", () => {
  it("allows peers at the same tier when permission is granted", () => {
    const actor = {
      role: "StudentCouncil" as const,
      accessLevelIndex: 1 as AccessLevelIndex,
      delegatedPermissions: [],
      sociumRoles: [],
      studentTitle: null,
    };
    const peer = {
      role: "StudentCouncil" as const,
      accessLevelIndex: 1 as AccessLevelIndex,
      delegatedPermissions: [],
      sociumRoles: [],
      studentTitle: null,
    };

    assert.equal(canActorAssignSociumRoles(actor, peer, DEFAULT_ACCESS_CONTROL_SETTINGS), true);
  });
});

describe("canDelegatePermission", () => {
  it("allows level 1 to delegate news.publish downward", () => {
    const actor = {
      role: "StudentCouncil" as const,
      accessLevelIndex: 1 as AccessLevelIndex,
      delegatedPermissions: [],
      sociumRoles: [],
      studentTitle: null,
    };
    const target = {
      role: "Student" as const,
      accessLevelIndex: 3 as AccessLevelIndex,
      delegatedPermissions: [],
      sociumRoles: [],
      studentTitle: null,
    };

    assert.equal(
      canDelegatePermission(actor, target, DEFAULT_ACCESS_CONTROL_SETTINGS, "news.publish"),
      true,
    );
  });
});

describe("hasPermission", () => {
  it("returns false for common student managing settings", () => {
    const user = {
      role: "Student" as const,
      accessLevelIndex: 6 as AccessLevelIndex,
      delegatedPermissions: [],
      sociumRoles: [],
      studentTitle: null,
    };

    assert.equal(
      hasPermission(user, DEFAULT_ACCESS_CONTROL_SETTINGS, "access_control.manage_settings"),
      false,
    );
  });
});
