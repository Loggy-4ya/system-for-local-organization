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
  type AccessControlSettingsConfig,
  type AccessLevelIndex,
  type PermissionKey,
  isAccessLevelIndex,
  outranksInHierarchy,
} from "@shared/constants/accessControl";
import AccessControlSettings, {
  ACCESS_CONTROL_SETTINGS_ID,
  type IAccessControlSettings,
} from "@shared/models/AccessControlSettings";
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
} from "@shared/lib/accessControlLogic";
import User, { type IUser, type UserRole } from "@shared/models/User";
import { mongooseDocToPlain } from "@shared/lib/mongoosePlainObject";
import { toDirectoryRow, type DirectoryUserRow } from "@shared/lib/directoryRedaction";

/**
 * Access-control domain engine — singleton settings and permission resolution.
 */
export class AccessControlDomain {
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
    const plain = mongooseDocToPlain(doc);

    return {
      levels: [...(plain.levels ?? [])],
      levelPermissions: {
        ...(plain.levelPermissions ?? {}),
      } as AccessControlSettingsConfig["levelPermissions"],
      grantRules: {
        ...(plain.grantRules ?? {}),
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
    query: { q?: string; level?: number; cursor?: string; limit?: number }
  ): Promise<{ users: DirectoryUserRow[]; nextCursor: string | null }> {
    await connectDB();
    const settings = this.toPublicConfig(await this.loadOrSeed());
    const actorSlice = this.userSliceFromDocument(actor);

    if (!canActorViewDirectory(actorSlice, settings)) {
      throw new Error("FORBIDDEN");
    }

    const limit = query.limit ?? 20;
    const filter: any = {};

    if (query.q) {
      const regex = new RegExp(query.q.trim(), "i");
      filter.$or = [
        { name: regex },
        { surname: regex },
        { login: regex },
      ];
    }

    if (query.level !== undefined) {
      filter.accessLevelIndex = query.level;
    }

    if (query.cursor) {
      filter._id = { $gt: query.cursor };
    }

    // Fetch limit + 1 to check for next page
    const docs = await User.find(filter)
      .sort({ _id: 1 })
      .limit(limit + 1);

    const hasNext = docs.length > limit;
    const results = hasNext ? docs.slice(0, limit) : docs;
    const nextCursor = hasNext ? String(results[results.length - 1]._id) : null;

    const users = results.map((doc) => toDirectoryRow(actorSlice, doc, settings));

    return {
      users,
      nextCursor,
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

    // 1. Outrank check
    const actorIndex = inferAccessLevelIndex(actorSlice);
    const targetIndex = inferAccessLevelIndex(targetSlice);
    if (!outranksInHierarchy(actorIndex, targetIndex) && actor.role !== "Admin") {
      throw new Error("OUTRANK_REQUIRED");
    }

    // 2. Level change
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

    // 3. Socium Roles change
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
      const addedPermissions = patch.delegatedPermissions.filter(
        (p: string) => !target.delegatedPermissions.includes(p)
      );
      if (addedPermissions.length > 0) {
        if (!canActorModifyDelegatedPermissions(actorSlice, targetSlice, addedPermissions, settings)) {
          throw new Error("PERMISSION_NOT_DELEGATABLE");
        }
      }
      target.delegatedPermissions = patch.delegatedPermissions;
    }

    await target.save();
    return toDirectoryRow(actorSlice, target, settings);
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
