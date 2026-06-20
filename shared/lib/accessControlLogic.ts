/**
 * @fileoverview Pure access-control resolution — hierarchy rank and permission checks.
 *
 * Tests: `tests/shared/lib/accessControlLogic.test.ts` — `npm run test:access-control`
 *
 * @module shared/lib/accessControlLogic
 */

import {
  type AccessControlSettingsConfig,
  type AccessLevelIndex,
  type PermissionKey,
  isAccessLevelIndex,
  outranksInHierarchy,
} from "@shared/constants/accessControl";
import type { UserRole } from "@shared/models/User";
import type { IUserSociumRole } from "@shared/models/userTypes";

/** Minimal user slice for permission resolution. */
export interface AccessControlUserSlice {
  role: UserRole;
  accessLevelIndex: AccessLevelIndex;
  delegatedPermissions: PermissionKey[];
  sociumRoles: IUserSociumRole[];
  studentTitle: "Starosta" | "Deputy" | "Neither" | null;
}

/**
 * Infer hierarchy index from legacy fields when `accessLevelIndex` is unset.
 *
 * @param user - Partial user fields.
 * @returns Best-effort hierarchy index.
 */
export function inferAccessLevelIndex(user: {
  role: UserRole;
  accessLevelIndex?: AccessLevelIndex | null;
  sociumRoles?: IUserSociumRole[];
  studentTitle?: "Starosta" | "Deputy" | "Neither" | null;
}): AccessLevelIndex {
  if (user.accessLevelIndex != null && isAccessLevelIndex(user.accessLevelIndex)) {
    return user.accessLevelIndex;
  }

  if (user.role === "Admin") return 0;

  const socium = user.sociumRoles ?? [];
  if (
    socium.some(
      (r) =>
        r.kind === "self_government_head" || r.kind === "self_government_deputy",
    )
  ) {
    return 1;
  }

  if (user.role === "StudentCouncil") return 2;

  if (socium.some((r) => r.kind === "teacher")) {
    return 5;
  }

  if (
    socium.some((r) => r.kind === "self_government_member") ||
    socium.some((r) => r.kind === "custom" && r.roleKey.includes("teacher"))
  ) {
    return socium.some((r) => r.kind === "self_government_member") ? 3 : 5;
  }

  if (user.studentTitle === "Starosta" || socium.some((r) => r.kind === "starosta")) {
    return 4;
  }

  return 6;
}

/**
 * Resolve effective permission keys for a user from settings + delegation.
 *
 * @param user - User access slice.
 * @param settings - Singleton access-control configuration.
 * @returns Deduped permission keys.
 */
export function resolveEffectivePermissions(
  user: AccessControlUserSlice,
  settings: AccessControlSettingsConfig,
): PermissionKey[] {
  const levelIndex = inferAccessLevelIndex(user);
  const base = settings.levelPermissions[levelIndex] ?? [];
  const delegated = user.delegatedPermissions ?? [];
  return [...new Set([...base, ...delegated])];
}

/**
 * Check whether a user holds a specific permission.
 *
 * @param user - User access slice.
 * @param settings - Singleton configuration.
 * @param permission - Permission key to test.
 * @returns True when permitted.
 */
export function hasPermission(
  user: AccessControlUserSlice,
  settings: AccessControlSettingsConfig,
  permission: PermissionKey,
): boolean {
  return resolveEffectivePermissions(user, settings).includes(permission);
}

/**
 * Whether an actor may manage (assign roles/levels to) a target user.
 *
 * Rules:
 * 1. Actor must strictly outrank target in hierarchy **or** hold `users.assign_access_level`.
 * 2. Actor must hold `users.assign_access_level` **or** `users.assign_socium_roles`.
 * 3. Target level must appear in actor grant rule `assignableLevelIndices` when assigning levels.
 *
 * @param actor - Acting user slice.
 * @param target - Target user slice.
 * @param settings - Singleton configuration.
 * @returns True when role administration is allowed.
 */
export function canManageUserAccess(
  actor: AccessControlUserSlice,
  target: AccessControlUserSlice,
  settings: AccessControlSettingsConfig,
): boolean {
  const actorIndex = inferAccessLevelIndex(actor);
  const targetIndex = inferAccessLevelIndex(target);

  if (!outranksInHierarchy(actorIndex, targetIndex)) {
    return false;
  }

  const canAssign =
    hasPermission(actor, settings, "users.assign_access_level") ||
    hasPermission(actor, settings, "users.assign_socium_roles");

  if (!canAssign) {
    return false;
  }

  const rule = settings.grantRules[actorIndex];
  return rule?.assignableLevelIndices.includes(targetIndex) ?? false;
}

/**
 * Whether an actor may delegate a permission to a user below them.
 *
 * @param actor - Acting user slice.
 * @param target - Target user slice.
 * @param settings - Singleton configuration.
 * @param permission - Permission to delegate.
 * @returns True when delegation is allowed.
 */
export function canDelegatePermission(
  actor: AccessControlUserSlice,
  target: AccessControlUserSlice,
  settings: AccessControlSettingsConfig,
  permission: PermissionKey,
): boolean {
  const actorIndex = inferAccessLevelIndex(actor);
  const targetIndex = inferAccessLevelIndex(target);

  if (!outranksInHierarchy(actorIndex, targetIndex)) {
    return false;
  }

  if (!hasPermission(actor, settings, "users.delegate_permissions")) {
    return false;
  }

  const rule = settings.grantRules[actorIndex];
  if (!rule?.delegatablePermissions.includes(permission)) {
    return false;
  }

  return true;
}

/**
 * Whether a user may open the global access-control settings editor.
 *
 * @param user - User access slice.
 * @param settings - Singleton configuration.
 * @returns True when settings page/API is allowed.
 */
export function canManageAccessControlSettings(
  user: AccessControlUserSlice,
  settings: AccessControlSettingsConfig,
): boolean {
  return hasPermission(user, settings, "access_control.manage_settings");
}

/**
 * Suggested access level when a student selects Starosta at registration.
 *
 * @returns Index 4 unless user already holds a higher tier.
 */
export function accessLevelForStarostaRegistration(
  current: AccessLevelIndex | null | undefined,
): AccessLevelIndex {
  if (current != null && current < 4) return current;
  return 4;
}

export function accessLevelForTeacherRegistration(
  current: AccessLevelIndex | null | undefined,
): AccessLevelIndex {
  if (current != null && current < 5) return current;
  return 5;
}

/**
 * Default access level for new student registration.
 *
 * @returns Index 6 (common student).
 */
export function defaultStudentAccessLevel(): AccessLevelIndex {
  return 6;
}

/**
 * Whether an actor can view the user directory.
 *
 * @param actor - Acting user access slice.
 * @param settings - Singleton configuration.
 * @returns True when permitted.
 */
export function canActorViewDirectory(
  actor: AccessControlUserSlice,
  settings: AccessControlSettingsConfig,
): boolean {
  return hasPermission(actor, settings, "users.view_directory");
}

/**
 * Whether an actor can assign a specific access level to a target user.
 *
 * @param actor - Acting user access slice.
 * @param target - Target user access slice.
 * @param newIndex - The new level index to assign.
 * @param settings - Singleton configuration.
 * @returns True when permitted.
 */
export function canActorAssignAccessLevel(
  actor: AccessControlUserSlice,
  target: AccessControlUserSlice,
  newIndex: AccessLevelIndex,
  settings: AccessControlSettingsConfig,
): boolean {
  const actorIndex = inferAccessLevelIndex(actor);
  const targetIndex = inferAccessLevelIndex(target);

  if (!outranksInHierarchy(actorIndex, targetIndex)) {
    return false;
  }

  if (!hasPermission(actor, settings, "users.assign_access_level")) {
    return false;
  }

  const rule = settings.grantRules[actorIndex];
  if (!rule?.assignableLevelIndices.includes(newIndex)) {
    return false;
  }

  // Actor cannot assign a level equal to or higher than their own
  if (newIndex <= actorIndex) {
    return false;
  }

  return true;
}

/**
 * Whether an actor can assign socium roles to a target user.
 *
 * @param actor - Acting user access slice.
 * @param target - Target user access slice.
 * @param settings - Singleton configuration.
 * @returns True when permitted.
 */
export function canActorAssignSociumRoles(
  actor: AccessControlUserSlice,
  target: AccessControlUserSlice,
  settings: AccessControlSettingsConfig,
): boolean {
  const actorIndex = inferAccessLevelIndex(actor);
  const targetIndex = inferAccessLevelIndex(target);

  if (!outranksInHierarchy(actorIndex, targetIndex)) {
    return false;
  }

  return hasPermission(actor, settings, "users.assign_socium_roles");
}

/**
 * Whether an actor can assign affiliations (activities & organizations) to a target user.
 *
 * @param actor - Acting user access slice.
 * @param target - Target user access slice.
 * @param settings - Singleton configuration.
 * @returns True when permitted.
 */
export function canActorAssignAffiliations(
  actor: AccessControlUserSlice,
  target: AccessControlUserSlice,
  settings: AccessControlSettingsConfig,
): boolean {
  const actorIndex = inferAccessLevelIndex(actor);
  const targetIndex = inferAccessLevelIndex(target);

  if (!outranksInHierarchy(actorIndex, targetIndex)) {
    return false;
  }

  return hasPermission(actor, settings, "users.assign_affiliations");
}

/**
 * Whether an actor can modify delegated permissions for a target user.
 *
 * @param actor - Acting user access slice.
 * @param target - Target user access slice.
 * @param addedKeys - The list of permission keys being added.
 * @param settings - Singleton configuration.
 * @returns True when permitted.
 */
export function canActorModifyDelegatedPermissions(
  actor: AccessControlUserSlice,
  target: AccessControlUserSlice,
  addedKeys: PermissionKey[],
  settings: AccessControlSettingsConfig,
): boolean {
  const actorIndex = inferAccessLevelIndex(actor);
  const targetIndex = inferAccessLevelIndex(target);

  if (!outranksInHierarchy(actorIndex, targetIndex)) {
    return false;
  }

  if (!hasPermission(actor, settings, "users.delegate_permissions")) {
    return false;
  }

  // Actor can only delegate permissions they effectively hold themselves,
  // and which are allowed by their grant rules.
  const rule = settings.grantRules[actorIndex];
  const actorEffective = resolveEffectivePermissions(actor, settings);

  for (const key of addedKeys) {
    if (!actorEffective.includes(key)) {
      return false;
    }
    if (!rule?.delegatablePermissions.includes(key)) {
      return false;
    }
    if (!canDelegatePermission(actor, target, settings, key)) {
      return false;
    }
  }

  return true;
}
