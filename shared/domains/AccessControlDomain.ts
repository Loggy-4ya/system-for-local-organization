/**
 * @fileoverview Consolidated access-control domain engine for Project Nexus.
 *
 * Loads and updates the singleton permission matrix and resolves effective
 * permissions for authenticated users.
 *
 * @module shared/domains/AccessControlDomain
 */

import connectDB from "@shared/lib/db";
import {
  ALL_PERMISSION_KEYS,
  DEFAULT_ACCESS_CONTROL_SETTINGS,
  DEFAULT_GRANT_RULES,
  DEFAULT_LEVEL_PERMISSIONS,
  type AccessControlSettingsConfig,
  type AccessLevelIndex,
  type PermissionKey,
  isAccessLevelIndex,
  meetsOrOutranksInHierarchy,
} from "@shared/constants/accessControl";
import AccessControlSettings, {
  ACCESS_CONTROL_SETTINGS_ID,
  type IAccessControlSettings,
} from "@shared/models/AccessControlSettings";
import AcademicCatalog from "@shared/models/AcademicCatalog";
import {
  normalizeAcademicLabel,
  slugifyAcademicCatalogLabel,
} from "@shared/lib/academicCatalogLogic";
import {
  canManageAccessControlSettings,
  canManageUserAccess,
  hasPermission,
  inferAccessLevelIndex,
  resolveEffectivePermissions,
  type AccessControlUserSlice,
  canActorViewDirectory,
  canActorAssignAccessLevel,
  canActorAssignSociumRoles,
  canActorAssignAffiliations,
  canActorModifyDelegatedPermissions,
  canActorEditProfile,
  canActorDeleteUser,
} from "@shared/lib/accessControlLogic";
import User, { type IUser, type UserRole } from "@shared/models/User";
import UserBroadcastReceipt from "@shared/models/UserBroadcastReceipt";
import UserNotification from "@shared/models/UserNotification";
import FormFieldResponse from "@shared/models/FormFieldResponse";
import {
  SurveyParticipation,
  UserComment,
  UserPublishedContent,
} from "@shared/models/UserEngagement";
import { applyProfilePatchToUser, type ProfileUpdateInput } from "@shared/lib/userProfilePatch";
import { assertDirectoryMemberProfileRequirements } from "@shared/lib/userProfileCompleteness";
import { DEFAULT_LIST_PAGE_SIZE } from "@shared/constants/listPagination";
import {
  clampListPageSize,
  computeTotalPages,
  pageToSkip,
} from "@shared/lib/listPaginationLogic";
import { toDirectoryRow, type DirectoryUserRow } from "@shared/lib/directoryRedaction";
import { UserDirectoryAuditDomain } from "@shared/domains/UserDirectoryAuditDomain";

/** Profile field keys accepted on admin user PATCH. */
const ADMIN_PROFILE_PATCH_KEYS = ["specialty", "group", "phone"] as const;

/**
 * Extract profile patch keys from an admin update payload.
 *
 * @param patch - Raw validated admin update body.
 * @returns Profile patch when at least one field is present, else null.
 */
function extractAdminProfilePatch(patch: Record<string, unknown>): ProfileUpdateInput | null {
  const profilePatch: ProfileUpdateInput = {};
  let hasAny = false;

  for (const key of ADMIN_PROFILE_PATCH_KEYS) {
    if (patch[key] !== undefined) {
      (profilePatch as Record<string, unknown>)[key] = patch[key];
      hasAny = true;
    }
  }

  return hasAny ? profilePatch : null;
}

/** Permission keys introduced after initial deployments — merged into stored settings on load. */
const MIGRATED_PERMISSION_KEYS: PermissionKey[] = ["users.edit_profile", "users.delete"];

/**
 * Access-control domain engine — singleton settings and permission resolution.
 */
export class AccessControlDomain {
  /**
   * Add newly introduced permission keys to a persisted singleton when missing.
   *
   * Keeps tier defaults and delegatable grant rules in sync with code without
   * overwriting intentional admin removals of unrelated keys.
   *
   * @param doc - Settings document loaded from MongoDB.
   * @returns True when the document was mutated and should be saved.
   */
  private static migrateIntroducedPermissionKeys(doc: IAccessControlSettings): boolean {
    let changed = false;

    for (const tierIndex of [0, 1, 2, 3, 4, 5, 6] as AccessLevelIndex[]) {
      const defaultTierPerms = DEFAULT_LEVEL_PERMISSIONS[tierIndex] ?? [];
      const currentTierPerms = (doc.levelPermissions?.[tierIndex] ?? []) as PermissionKey[];
      const nextTierPerms = [...currentTierPerms];
      let tierChanged = false;

      for (const key of MIGRATED_PERMISSION_KEYS) {
        if (defaultTierPerms.includes(key) && !nextTierPerms.includes(key)) {
          nextTierPerms.push(key);
          tierChanged = true;
        }
      }

      if (tierChanged) {
        doc.levelPermissions[tierIndex] = nextTierPerms;
        changed = true;
      }
    }

    for (const tierIndex of [0, 1, 2, 3, 4, 5, 6] as AccessLevelIndex[]) {
      const defaultRule = DEFAULT_GRANT_RULES[tierIndex];
      const currentRule = doc.grantRules?.[tierIndex];
      if (!defaultRule || !currentRule) continue;

      const nextDelegatable = [...(currentRule.delegatablePermissions ?? [])];
      let ruleChanged = false;

      for (const key of MIGRATED_PERMISSION_KEYS) {
        if (defaultRule.delegatablePermissions.includes(key) && !nextDelegatable.includes(key)) {
          nextDelegatable.push(key);
          ruleChanged = true;
        }
      }

      if (ruleChanged) {
        currentRule.delegatablePermissions = nextDelegatable;
        changed = true;
      }
    }

    return changed;
  }
  /**
   * Load the singleton access-control settings or seed defaults.
   *
   * Uses an atomic upsert so concurrent callers (e.g. parallel permission checks)
   * cannot trigger duplicate-key errors on the singleton `_id`.
   *
   * @returns Persisted settings document.
   */
  public static async loadOrSeed(): Promise<IAccessControlSettings> {
    await connectDB();

    const doc = await AccessControlSettings.findOneAndUpdate(
      { _id: ACCESS_CONTROL_SETTINGS_ID },
      {
        $setOnInsert: {
          levels: DEFAULT_ACCESS_CONTROL_SETTINGS.levels,
          levelPermissions: DEFAULT_ACCESS_CONTROL_SETTINGS.levelPermissions,
          grantRules: DEFAULT_ACCESS_CONTROL_SETTINGS.grantRules,
        },
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
    );

    if (doc) {
      if (AccessControlDomain.migrateIntroducedPermissionKeys(doc)) {
        await doc.save();
      }
      return doc;
    }

    const fallback = await AccessControlSettings.findById(ACCESS_CONTROL_SETTINGS_ID);
    if (!fallback) {
      throw new Error("Failed to load or seed access control settings.");
    }

    return fallback;
  }

  /**
   * Convert a persisted document to a public config object.
   *
   * @param doc - Mongoose settings document.
   * @returns Serializable configuration.
   */
  public static toPublicConfig(doc: IAccessControlSettings): AccessControlSettingsConfig {
    return {
      levels: [...(doc.levels ?? [])],
      levelPermissions: {
        ...(doc.levelPermissions ?? {}),
      } as AccessControlSettingsConfig["levelPermissions"],
      grantRules: {
        ...(doc.grantRules ?? {}),
      } as AccessControlSettingsConfig["grantRules"],
    };
  }

  /**
   * Update access-control settings after validation.
   *
   * @param update - Partial configuration patch.
   * @returns Updated document.
   * @throws When structural validation fails.
   */
  public static async update(
    update: Partial<AccessControlSettingsConfig>,
  ): Promise<IAccessControlSettings> {
    await connectDB();

    const current = await this.loadOrSeed();

    if (update.levels) {
      this.validateLevels(update.levels);
      current.levels = update.levels;
    }

    if (update.levelPermissions) {
      this.validateLevelPermissions(update.levelPermissions);
      current.levelPermissions = update.levelPermissions;
    }

    if (update.grantRules) {
      this.validateGrantRules(update.grantRules);
      current.grantRules = update.grantRules;
    }

    await current.save();
    return current;
  }

  /**
   * Build an {@link AccessControlUserSlice} from a User document.
   *
   * @param user - Mongoose user document.
   * @returns Normalised access slice.
   */
  public static userSliceFromDocument(user: IUser): AccessControlUserSlice {
    return {
      role: user.role,
      accessLevelIndex: inferAccessLevelIndex(user),
      delegatedPermissions: (user.delegatedPermissions ?? []) as PermissionKey[],
      sociumRoles: user.sociumRoles ?? [],
      studentTitle: user.studentTitle,
    };
  }

  /**
   * Resolve effective permissions for a user document.
   *
   * @param user - Mongoose user document.
   * @returns Permission key list.
   */
  public static async resolvePermissionsForUser(user: IUser): Promise<PermissionKey[]> {
    const settings = this.toPublicConfig(await this.loadOrSeed());
    return resolveEffectivePermissions(this.userSliceFromDocument(user), settings);
  }

  /**
   * Whether a user may edit the access-control settings page.
   *
   * @param user - Mongoose user document.
   * @returns True when permitted.
   */
  public static async canUserManageSettings(user: IUser): Promise<boolean> {
    const settings = this.toPublicConfig(await this.loadOrSeed());
    return canManageAccessControlSettings(this.userSliceFromDocument(user), settings);
  }

  /**
   * Whether a user may send institution-wide broadcasts.
   *
   * @param user - Mongoose user document.
   * @returns True when `notifications.broadcast` is granted.
   */
  public static async canUserSendBroadcasts(user: IUser): Promise<boolean> {
    const settings = this.toPublicConfig(await this.loadOrSeed());
    return hasPermission(
      this.userSliceFromDocument(user),
      settings,
      "notifications.broadcast",
    );
  }

  /**
   * Whether an actor may administer another user's access.
   *
   * @param actor - Acting user document.
   * @param target - Target user document.
   * @returns True when permitted.
   */
  public static async canActorManageTarget(actor: IUser, target: IUser): Promise<boolean> {
    const settings = this.toPublicConfig(await this.loadOrSeed());
    return canManageUserAccess(
      this.userSliceFromDocument(actor),
      this.userSliceFromDocument(target),
      settings,
    );
  }

  /**
   * Whether a user may view the user directory.
   *
   * @param user - Mongoose user document.
   * @returns True when permitted.
   */
  public static async canUserViewDirectory(user: IUser): Promise<boolean> {
    const settings = this.toPublicConfig(await this.loadOrSeed());
    return canActorViewDirectory(this.userSliceFromDocument(user), settings);
  }

  /**
   * Whether a user may mutate directory records (assign levels, roles, affiliations, delegations).
   *
   * @param user - Mongoose user document.
   * @returns True when the actor holds at least one assignment/delegation permission.
   */
  public static async canUserMutateDirectory(user: IUser): Promise<boolean> {
    if (user.role === "Admin") {
      return true;
    }

    const settings = this.toPublicConfig(await this.loadOrSeed());
    const slice = this.userSliceFromDocument(user);

    return (
      hasPermission(slice, settings, "users.edit_profile") ||
      hasPermission(slice, settings, "users.assign_access_level") ||
      hasPermission(slice, settings, "users.assign_socium_roles") ||
      hasPermission(slice, settings, "users.assign_affiliations") ||
      hasPermission(slice, settings, "users.delegate_permissions")
    );
  }

  /**
   * Search and list users in the directory with field-level redaction.
   *
   * @param actor - Acting user document.
   * @param query - Query parameters (search query, level filter, cursor, limit).
   * @returns Paginated list of redacted directory user rows.
   */
  public static async listDirectoryUsers(
    actor: IUser,
    query: { q?: string; level?: number; cursor?: string; page?: number; limit?: number },
  ): Promise<{
    users: DirectoryUserRow[];
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
    nextCursor: string | null;
  }> {
    await connectDB();
    const settings = this.toPublicConfig(await this.loadOrSeed());
    const actorSlice = this.userSliceFromDocument(actor);

    if (!canActorViewDirectory(actorSlice, settings)) {
      throw new Error("FORBIDDEN");
    }

    const limit = clampListPageSize(query.limit, DEFAULT_LIST_PAGE_SIZE);
    const filter: Record<string, unknown> = {};

    if (query.q) {
      const regex = new RegExp(query.q.trim(), "i");
      filter.$or = [{ name: regex }, { surname: regex }, { login: regex }];
    }

    if (query.level !== undefined) {
      filter.accessLevelIndex = query.level;
    }

    if (query.cursor) {
      filter._id = { $gt: query.cursor };
      const docs = await User.find(filter).sort({ _id: 1 }).limit(limit + 1);
      const hasNext = docs.length > limit;
      const results = hasNext ? docs.slice(0, limit) : docs;
      const nextCursor = hasNext ? String(results[results.length - 1]._id) : null;
      const users = results.map((doc) => toDirectoryRow(actorSlice, doc, settings));

      return {
        users,
        page: 1,
        limit,
        totalCount: users.length,
        totalPages: hasNext ? 2 : 1,
        nextCursor,
      };
    }

    const page = Math.max(1, query.page ?? 1);
    const skip = pageToSkip(page, limit);

    const [docs, totalCount] = await Promise.all([
      User.find(filter).sort({ _id: 1 }).skip(skip).limit(limit),
      User.countDocuments(filter),
    ]);

    const totalPages = computeTotalPages(totalCount, limit);
    const users = docs.map((doc) => toDirectoryRow(actorSlice, doc, settings));

    return {
      users,
      page,
      limit,
      totalCount,
      totalPages,
      nextCursor: page < totalPages ? String(docs[docs.length - 1]?._id ?? "") : null,
    };
  }

  /**
   * Retrieve a single user directory row with field-level redaction.
   *
   * @param actor - Acting user document.
   * @param targetId - Target user's unique ID.
   * @returns Redacted directory user row.
   */
  public static async getDirectoryUser(actor: IUser, targetId: string): Promise<DirectoryUserRow> {
    await connectDB();
    const settings = this.toPublicConfig(await this.loadOrSeed());
    const actorSlice = this.userSliceFromDocument(actor);

    if (!canActorViewDirectory(actorSlice, settings)) {
      throw new Error("FORBIDDEN");
    }

    const target = await User.findById(targetId);
    if (!target) {
      throw new Error("USER_NOT_FOUND");
    }

    return toDirectoryRow(actorSlice, target, settings);
  }

  /**
   * Upsert specialty/group catalog rows as approved when an admin assigns new values.
   *
   * @param patch - Specialty and/or group fields from an admin directory update.
   * @param reviewedByUserId - Acting admin user id recorded on new catalog rows.
   */
  public static async ensureAdminAcademicCatalogEntries(
    patch: Pick<ProfileUpdateInput, "specialty" | "group">,
    reviewedByUserId: string,
  ): Promise<void> {
    const entries: Array<{ kind: "specialty" | "group"; label: string }> = [];

    const specialty = normalizeAcademicLabel(patch.specialty);
    const group = normalizeAcademicLabel(patch.group);

    if (specialty) {
      entries.push({ kind: "specialty", label: specialty.toUpperCase() });
    }
    if (group) {
      entries.push({ kind: "group", label: group });
    }

    const reviewedAt = new Date();

    for (const entry of entries) {
      const key = slugifyAcademicCatalogLabel(entry.label);
      if (!key) continue;

      await AcademicCatalog.updateOne(
        { kind: entry.kind, key },
        {
          $set: {
            label: entry.label,
            status: "approved",
            reviewedAt,
            reviewedByUserId,
          },
          $setOnInsert: {
            kind: entry.kind,
            key,
            submittedByUserId: null,
          },
        },
        { upsert: true },
      );
    }
  }

  /**
   * Update a target user's access-control and profile configuration after strict validation.
   *
   * @param actor - Acting user document.
   * @param targetId - Target user's unique ID.
   * @param patch - Access-control fields to update.
   * @returns Updated redacted directory user row.
   */
  public static async adminUpdateUser(
    actor: IUser,
    targetId: string,
    patch: any,
  ): Promise<DirectoryUserRow> {
    await connectDB();
    const settings = this.toPublicConfig(await this.loadOrSeed());

    if (actor._id.toString() === targetId) {
      throw new Error("SELF_MODIFICATION_FORBIDDEN");
    }

    const target = await User.findById(targetId);
    if (!target) {
      throw new Error("USER_NOT_FOUND");
    }

    const actorSlice = this.userSliceFromDocument(actor);
    const targetSlice = this.userSliceFromDocument(target);
    const actorIndex = inferAccessLevelIndex(actorSlice);
    const targetIndex = inferAccessLevelIndex(targetSlice);
    const previousAccessLevelIndex = targetIndex;

    // 1. Same-tier-or-below check (peers may administer each other when permitted)
    if (!meetsOrOutranksInHierarchy(actorIndex, targetIndex) && actor.role !== "Admin") {
      throw new Error("OUTRANK_REQUIRED");
    }

    const profilePatch = extractAdminProfilePatch(patch as Record<string, unknown>);

    // 2. Socium roles — apply before profile patch so phone/avatar guards see final roles.
    if (patch.sociumRoles !== undefined) {
      if (!canActorAssignSociumRoles(actorSlice, targetSlice, settings)) {
        throw new Error("ROLE_ASSIGNMENT_FORBIDDEN");
      }
      // Stamp roles assigned by admin
      const stampedRoles = patch.sociumRoles.map((role: any) => {
        if (role.source === "admin") {
          return {
            ...role,
            assignedByUserId: actor._id.toString(),
            assignedAt: role.assignedAt ? new Date(role.assignedAt) : new Date(),
          };
        }
        return role;
      });
      target.sociumRoles = stampedRoles;
    }

    if (profilePatch) {
      if (!canActorEditProfile(actorSlice, targetSlice, settings)) {
        throw new Error("PROFILE_EDIT_FORBIDDEN");
      }
      if (profilePatch.specialty !== undefined || profilePatch.group !== undefined) {
        await AccessControlDomain.ensureAdminAcademicCatalogEntries(
          profilePatch,
          actor._id.toString(),
        );
      }
      applyProfilePatchToUser(target, profilePatch);
    }

    // 3. Level change
    if (patch.accessLevelIndex !== undefined) {
      const newLevel = patch.accessLevelIndex as AccessLevelIndex;
      if (!canActorAssignAccessLevel(actorSlice, targetSlice, newLevel, settings)) {
        throw new Error("LEVEL_NOT_ASSIGNABLE");
      }
      target.accessLevelIndex = newLevel;

      // Sync legacy role field for backward compatibility
      let newRole: UserRole = "Student";
      if (newLevel === 0) {
        newRole = "Admin";
      } else if (newLevel === 1 || newLevel === 2) {
        newRole = "StudentCouncil";
      }
      target.role = newRole;
    }

    // 4. Affiliations change (activities & organizations)
    if (patch.socialGroupActivities !== undefined || patch.organizations !== undefined) {
      if (!canActorAssignAffiliations(actorSlice, targetSlice, settings)) {
        throw new Error("AFFILIATION_ASSIGNMENT_FORBIDDEN");
      }
      if (patch.socialGroupActivities !== undefined) {
        target.socialGroupActivities = patch.socialGroupActivities;
      }
      if (patch.organizations !== undefined) {
        target.organizations = patch.organizations;
      }
    }

    // 5. Delegated Permissions change
    if (patch.delegatedPermissions !== undefined) {
      const addedPermissions = (patch.delegatedPermissions as PermissionKey[]).filter(
        (p) => !target.delegatedPermissions.includes(p),
      );
      if (addedPermissions.length > 0) {
        if (!canActorModifyDelegatedPermissions(actorSlice, targetSlice, addedPermissions, settings)) {
          throw new Error("PERMISSION_NOT_DELEGATABLE");
        }
      }
      target.delegatedPermissions = patch.delegatedPermissions as PermissionKey[];
    }

    assertDirectoryMemberProfileRequirements(target);

    await target.save();

    const auditPatch = Object.fromEntries(
      Object.entries(patch as Record<string, unknown>).filter(([, value]) => value !== undefined),
    );
    await UserDirectoryAuditDomain.recordSuccessfulUpdate(
      actor,
      target,
      auditPatch,
      previousAccessLevelIndex,
    ).catch((error) => {
      console.error("[UserDirectoryAudit] Failed to record successful update:", error);
    });

    return toDirectoryRow(actorSlice, target, settings);
  }

  /**
   * Permanently delete a target user account and related engagement receipts.
   *
   * @param actor - Acting user document.
   * @param targetId - Target user's unique ID.
   * @throws When the actor cannot delete the target, attempts self-deletion, or would remove the last system administrator.
   */
  public static async adminDeleteUser(actor: IUser, targetId: string): Promise<void> {
    await connectDB();
    const settings = this.toPublicConfig(await this.loadOrSeed());

    if (actor._id.toString() === targetId) {
      throw new Error("SELF_MODIFICATION_FORBIDDEN");
    }

    const target = await User.findById(targetId);
    if (!target) {
      throw new Error("USER_NOT_FOUND");
    }

    const actorSlice = this.userSliceFromDocument(actor);
    const targetSlice = this.userSliceFromDocument(target);

    if (!canActorDeleteUser(actorSlice, targetSlice, settings)) {
      throw new Error("USER_DELETE_FORBIDDEN");
    }

    const targetIndex = inferAccessLevelIndex(targetSlice);
    if (targetIndex === 0) {
      const systemAdminCount = await User.countDocuments({ accessLevelIndex: 0 });
      if (systemAdminCount <= 1) {
        throw new Error("LAST_SYSTEM_ADMIN_DELETE_FORBIDDEN");
      }
    }

    const targetObjectId = target._id;

    await Promise.all([
      UserComment.deleteMany({ userId: targetObjectId }),
      SurveyParticipation.deleteMany({ userId: targetObjectId }),
      FormFieldResponse.deleteMany({ userId: targetObjectId }),
      UserPublishedContent.deleteMany({ authorUserId: targetObjectId }),
      UserBroadcastReceipt.deleteMany({ userId: targetObjectId.toString() }),
      UserNotification.deleteMany({ userId: targetObjectId.toString() }),
    ]);

    await UserDirectoryAuditDomain.recordSuccessfulDelete(actor, target).catch((error) => {
      console.error("[UserDirectoryAudit] Failed to record successful delete:", error);
    });

    await User.deleteOne({ _id: targetObjectId });
  }

  /**
   * Validate hierarchy level definitions.
   *
   * @param levels - Level metadata array.
   * @throws When indices or keys are invalid.
   */
  private static validateLevels(levels: AccessControlSettingsConfig["levels"]): void {
    if (levels.length !== 7) {
      throw new Error("Access control requires exactly seven hierarchy levels.");
    }

    const indices = new Set<number>();
    for (const level of levels) {
      if (!isAccessLevelIndex(level.index)) {
        throw new Error(`Invalid access level index: ${level.index}`);
      }
      if (!level.key?.trim() || !level.label?.trim()) {
        throw new Error("Each level requires a key and label.");
      }
      indices.add(level.index);
    }

    if (indices.size !== 7) {
      throw new Error("Each hierarchy index 0–6 must appear exactly once.");
    }
  }

  /**
   * Validate permission matrix keys.
   *
   * @param matrix - Level → permissions map.
   * @throws When unknown permission keys are present.
   */
  private static validateLevelPermissions(
    matrix: AccessControlSettingsConfig["levelPermissions"],
  ): void {
    for (const index of [0, 1, 2, 3, 4, 5, 6] as AccessLevelIndex[]) {
      const perms = matrix[index] ?? [];
      for (const perm of perms) {
        if (!ALL_PERMISSION_KEYS.includes(perm)) {
          throw new Error(`Unknown permission key: ${perm}`);
        }
      }
    }
  }

  /**
   * Validate grant rules — assignable indices must be strictly below actor rank.
   *
   * @param rules - Level → grant rule map.
   * @throws When rules reference invalid indices or permissions.
   */
  private static validateGrantRules(
    rules: AccessControlSettingsConfig["grantRules"],
  ): void {
    for (const actorIndex of [0, 1, 2, 3, 4, 5, 6] as AccessLevelIndex[]) {
      const rule = rules[actorIndex];
      if (!rule) {
        throw new Error(`Missing grant rule for level ${actorIndex}.`);
      }

      for (const targetIndex of rule.assignableLevelIndices) {
        if (!isAccessLevelIndex(targetIndex) || targetIndex <= actorIndex) {
          throw new Error(
            `Level ${actorIndex} cannot assign level ${targetIndex} — must assign strictly lower tiers.`,
          );
        }
      }

      for (const perm of rule.delegatablePermissions) {
        if (!ALL_PERMISSION_KEYS.includes(perm)) {
          throw new Error(`Unknown delegatable permission: ${perm}`);
        }
      }
    }
  }
}

export default AccessControlDomain;
