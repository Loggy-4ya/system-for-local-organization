/**
 * @fileoverview Data Transfer Object (DTO) and field-level redaction logic for the User Directory.
 *
 * Ensures that sensitive Personal Identifiable Information (PII) like email, phone,
 * login, and telegramId are only exposed to authorized actors who are at or above
 * the target user in the institutional hierarchy or hold the legacy Admin role.
 *
 * @module shared/lib/directoryRedaction
 */

import {
  type AccessControlSettingsConfig,
  type AccessLevelIndex,
  type PermissionKey,
  meetsOrOutranksInHierarchy,
  outranksInHierarchy,
} from "@shared/constants/accessControl";
import {
  type AccessControlUserSlice,
  inferAccessLevelIndex,
  hasPermission,
  canManageUserAccess,
  canDelegatePermission,
  canActorEditProfile,
  canActorDeleteUser,
} from "@shared/lib/accessControlLogic";
import { formatUserFullName } from "@shared/lib/userSociumHelpers";
import type { IUser, StudentTitle } from "@shared/models/User";
import type { IUserSocialLink } from "@shared/models/userTypes";

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
  /** Denormalized social group activity labels for directory discovery. */
  socialGroupActivityLabels: string[];
  /** Denormalized external organization labels for directory discovery. */
  organizationLabels: string[];
  /** Student council title from registration. */
  studentTitle: StudentTitle | null;
  /** Self-authored about / bio note. */
  about: string | null;
  /** User-authored social media profile links. */
  socialLinks: IUserSocialLink[];

  // ── Redactable PII Fields ──────────────────────────────────────────────────
  /** Unique login handle. Redacted if actor cannot administer target tier. */
  login: string | null;
  /** Email address. Redacted if actor cannot administer target tier. */
  email: string | null;
  /** Contact phone number. Redacted if actor cannot administer target tier. */
  phone: string | null;
  /** Telegram numeric ID. Redacted if actor cannot administer target tier. */
  telegramId: number | null;
  /** Whether Google OAuth is linked. Null when PII is redacted — never exposes provider tokens/IDs. */
  linkedGoogle: boolean | null;

  // ── Redactable Access Fields ───────────────────────────────────────────────
  /** Explicitly delegated permissions. Redacted when actor lacks delegate permission for target tier. */
  delegatedPermissions: PermissionKey[] | null;
  /** Full socium role assignment objects. Redacted when actor lacks socium assign permission for target tier. */
  sociumRoles: IUser["sociumRoles"] | null;
  /** Social group activity affiliations. Redacted when actor lacks affiliation assign permission for target tier. */
  socialGroupActivities: IUser["socialGroupActivities"] | null;
  /** External organization memberships. Redacted when actor lacks affiliation assign permission for target tier. */
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
  /** Whether the actor can edit general profile fields for this user. */
  canEditProfile: boolean;
  /** Whether the actor can permanently delete this user's account. */
  canDelete: boolean;
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
  const canAdministerTier = meetsOrOutranksInHierarchy(actorIndex, targetIndex);

  // Find the label for the target's access level
  const levelDef = settings.levels.find((l) => l.index === targetIndex);
  const accessLevelLabel = levelDef?.label ?? `Tier ${targetIndex}`;

  // Build socium role labels list for always-visible summary
  const sociumRoleLabels = (target.sociumRoles ?? []).map((r) => r.roleLabel);
  const socialGroupActivityLabels = (target.socialGroupActivities ?? []).map((a) => a.activityLabel);
  const organizationLabels = (target.organizations ?? []).map((o) => o.organizationLabel);

  // Map target to AccessControlUserSlice for logic checks
  const targetSlice: AccessControlUserSlice = {
    role: target.role,
    accessLevelIndex: targetIndex,
    delegatedPermissions: (target.delegatedPermissions ?? []) as PermissionKey[],
    sociumRoles: target.sociumRoles ?? [],
    studentTitle: target.studentTitle,
  };

  // Legacy Admin, strict outrank, or same-tier peer with users.edit_profile
  const canSeePII =
    isLegacyAdmin ||
    (canAdministerTier &&
      (outranksInHierarchy(actorIndex, targetIndex) ||
        canActorEditProfile(actor, targetSlice, settings)));

  // Compute capabilities for UI gating
  const canManage = canManageUserAccess(actor, targetSlice, settings);
  const canAssignLevel =
    actor.role === "Admin" ||
    (hasPermission(actor, settings, "users.assign_access_level") && canManage);
  const canAssignSocium =
    hasPermission(actor, settings, "users.assign_socium_roles") && canManage;
  const canAssignAffiliations =
    hasPermission(actor, settings, "users.assign_affiliations") && canAdministerTier;
  const canDelegate =
    hasPermission(actor, settings, "users.delegate_permissions") && canAdministerTier;
  const canEditProfile = canActorEditProfile(actor, targetSlice, settings);
  const canDelete = canActorDeleteUser(actor, targetSlice, settings);

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
    socialGroupActivityLabels,
    organizationLabels,
    studentTitle: target.studentTitle,
    about: target.about,
    socialLinks: target.socialLinks ?? [],

    // Redacted PII
    login: canSeePII ? target.login : null,
    email: canSeePII ? target.email : null,
    phone: canSeePII ? target.phone : null,
    telegramId: canSeePII ? target.telegramId : null,
    linkedGoogle: canSeePII ? Boolean(target.googleId) : null,

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
    canEditProfile,
    canDelete,
  };
}
