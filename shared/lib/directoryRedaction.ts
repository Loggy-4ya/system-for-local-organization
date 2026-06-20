/**
 * @fileoverview Data Transfer Object (DTO) and field-level redaction logic for the User Directory.
 *
 * Ensures that sensitive Personal Identifiable Information (PII) like email, phone,
 * login, and telegramId are only exposed to authorized actors who strictly outrank
 * the target user in the institutional hierarchy or hold the legacy Admin role.
 *
 * @module shared/lib/directoryRedaction
 */

import {
  type AccessControlSettingsConfig,
  type AccessLevelIndex,
  type PermissionKey,
  outranksInHierarchy,
} from "@shared/constants/accessControl";
import {
  type AccessControlUserSlice,
  inferAccessLevelIndex,
  hasPermission,
  canManageUserAccess,
  canDelegatePermission,
} from "@shared/lib/accessControlLogic";
import { formatUserFullName } from "@shared/lib/userSociumHelpers";
import type { IUser } from "@shared/models/User";

/**
 * Slim, stable shape for user directory rows and detail views.
 * Redacts sensitive fields dynamically based on the actor's relationship to the target.
 */
export interface DirectoryUserRow {
  /** Target user's unique ID. */
  id: string;
  /** Combined first name and surname. */
  fullName: string;
  /** First name. */
  name: string;
  /** Surname. */
  surname: string | null;
  /** URL to profile avatar. */
  avatar: string | null;
  /** Hierarchy position index (0-6). */
  accessLevelIndex: AccessLevelIndex;
  /** Display label of the hierarchy level. */
  accessLevelLabel: string;
  /** Specialty string, e.g. "Software Engineering". */
  specialty: string | null;
  /** Student group designation, e.g. "SE-42". */
  group: string | null;
  /** Denormalized list of socium role labels. */
  sociumRoleLabels: string[];

  // ── Redactable PII Fields ──────────────────────────────────────────────────
  /** Unique login handle. Redacted if actor does not outrank target. */
  login: string | null;
  /** Email address. Redacted if actor does not outrank target. */
  email: string | null;
  /** Contact phone number. Redacted if actor does not outrank target. */
  phone: string | null;
  /** Telegram numeric ID. Redacted if actor does not outrank target. */
  telegramId: number | null;

  // ── Redactable Access Fields ───────────────────────────────────────────────
  /** Explicitly delegated permissions. Redacted if actor does not hold users.delegate_permissions and outrank target. */
  delegatedPermissions: PermissionKey[] | null;
  /** Full socium role assignment objects. Redacted if actor does not hold users.assign_socium_roles and outrank target. */
  sociumRoles: IUser["sociumRoles"] | null;
  /** Social group activity affiliations. Redacted if actor does not hold users.assign_affiliations and outrank target. */
  socialGroupActivities: IUser["socialGroupActivities"] | null;
  /** External organization memberships. Redacted if actor does not hold users.assign_affiliations and outrank target. */
  organizations: IUser["organizations"] | null;

  // ── Computed Capabilities for UI Gating ────────────────────────────────────
  /** Whether the actor can manage this user's access at all. */
  canManage: boolean;
  /** Whether the actor can assign a new hierarchy level to this user. */
  canAssignLevel: boolean;
  /** Whether the actor can assign/remove socium roles for this user. */
  canAssignSocium: boolean;
  /** Whether the actor can assign/remove affiliations (activities & orgs) for this user. */
  canAssignAffiliations: boolean;
  /** Whether the actor can delegate new permissions to this user. */
  canDelegate: boolean;
}

/**
 * Redact and map a target User document into a DirectoryUserRow DTO.
 *
 * @param actor - The acting user's access slice.
 * @param target - The target user's document or full slice.
 * @param settings - The singleton access-control settings.
 * @returns Redacted directory row.
 */
export function toDirectoryRow(
  actor: AccessControlUserSlice,
  target: IUser,
  settings: AccessControlSettingsConfig,
): DirectoryUserRow {
  const actorIndex = inferAccessLevelIndex(actor);
  const targetIndex = inferAccessLevelIndex(target);
  const isLegacyAdmin = actor.role === "Admin";

  // Actor must strictly outrank target OR be a legacy Admin to see PII
  const outranks = outranksInHierarchy(actorIndex, targetIndex);
  const canSeePII = outranks || isLegacyAdmin;

  // Find the label for the target's access level
  const levelDef = settings.levels.find((l) => l.index === targetIndex);
  const accessLevelLabel = levelDef?.label ?? `Tier ${targetIndex}`;

  // Build socium role labels list for always-visible summary
  const sociumRoleLabels = (target.sociumRoles ?? []).map((r) => r.roleLabel);

  // Map target to AccessControlUserSlice for logic checks
  const targetSlice: AccessControlUserSlice = {
    role: target.role,
    accessLevelIndex: targetIndex,
    delegatedPermissions: (target.delegatedPermissions ?? []) as PermissionKey[],
    sociumRoles: target.sociumRoles ?? [],
    studentTitle: target.studentTitle,
  };

  // Compute capabilities for UI gating
  const canManage = canManageUserAccess(actor, targetSlice, settings);
  const canAssignLevel =
    hasPermission(actor, settings, "users.assign_access_level") && canManage;
  const canAssignSocium =
    hasPermission(actor, settings, "users.assign_socium_roles") && canManage;
  const canAssignAffiliations =
    hasPermission(actor, settings, "users.assign_affiliations") && outranks;
  const canDelegate =
    hasPermission(actor, settings, "users.delegate_permissions") && outranks;

  return {
    id: String(target._id),
    fullName: formatUserFullName(target.name, target.surname),
    name: target.name,
    surname: target.surname,
    avatar: target.avatar,
    accessLevelIndex: targetIndex,
    accessLevelLabel,
    specialty: target.specialty,
    group: target.group,
    sociumRoleLabels,

    // Redacted PII
    login: canSeePII ? target.login : null,
    email: canSeePII ? target.email : null,
    phone: canSeePII ? target.phone : null,
    telegramId: canSeePII ? target.telegramId : null,

    // Redacted Access Fields
    delegatedPermissions:
      canDelegate ? (target.delegatedPermissions as PermissionKey[]) : null,
    sociumRoles: canAssignSocium ? target.sociumRoles : null,
    socialGroupActivities: canAssignAffiliations ? target.socialGroupActivities : null,
    organizations: canAssignAffiliations ? target.organizations : null,

    // Capabilities
    canManage,
    canAssignLevel,
    canAssignSocium,
    canAssignAffiliations,
    canDelegate,
  };
}
