/**
 * @fileoverview Client-side helpers for User Directory detail selection — edit snapshots and dirty checks.
 *
 * Used by {@link UserDirectoryShell} to restore cached detail rows without redundant GET requests
 * and to warn before switching users with unsaved edits.
 *
 * @module src/components/user-directory/lib/userDirectoryDetailState
 */

import type { PermissionKey } from "@shared/constants/accessControl";
import type { DirectoryUserRow } from "@shared/lib/directoryRedaction";
import type { IUserOrganizationMembership, IUserSocialGroupActivity, IUserSociumRole } from "@shared/models/userTypes";
import {
  profileEditStateFromDirectoryUser,
  type UserDirectoryProfileEditState,
} from "@/components/user-directory/UserDirectoryProfileFields";

/** Full edit snapshot for a directory user detail pane. */
export interface DirectoryUserEditSnapshot {
  level: number;
  delegated: PermissionKey[];
  sociumRoles: IUserSociumRole[];
  activities: IUserSocialGroupActivity[];
  organizations: IUserOrganizationMembership[];
  profile: UserDirectoryProfileEditState;
}

/**
 * Build an edit snapshot from a loaded directory detail row.
 *
 * @param user - Directory detail row from GET `/api/admin/users/[userId]`.
 * @returns Values for all controlled edit fields.
 */
export function editSnapshotFromDirectoryUser(user: DirectoryUserRow): DirectoryUserEditSnapshot {
  return {
    level: user.accessLevelIndex,
    delegated: user.delegatedPermissions ?? [],
    sociumRoles: user.sociumRoles ?? [],
    activities: user.socialGroupActivities ?? [],
    organizations: user.organizations ?? [],
    profile: profileEditStateFromDirectoryUser(user),
  };
}

/**
 * Compare two permission lists regardless of order.
 *
 * @param left - First permission key list.
 * @param right - Second permission key list.
 * @returns True when both lists contain the same keys.
 */
function permissionListsEqual(left: PermissionKey[], right: PermissionKey[]): boolean {
  if (left.length !== right.length) return false;
  const rightSet = new Set(right);
  return left.every((key) => rightSet.has(key));
}

/**
 * Whether the detail pane has unsaved edits relative to a loaded directory row.
 *
 * @param user - Baseline directory row (server snapshot).
 * @param edit - Current controlled edit state.
 * @returns True when any editable field diverges from the baseline.
 */
export function isDirectoryUserEditDirty(
  user: DirectoryUserRow,
  edit: DirectoryUserEditSnapshot,
): boolean {
  const baseline = editSnapshotFromDirectoryUser(user);

  if (edit.level !== baseline.level) return true;
  if (!permissionListsEqual(edit.delegated, baseline.delegated)) return true;
  if (JSON.stringify(edit.sociumRoles) !== JSON.stringify(baseline.sociumRoles)) return true;
  if (JSON.stringify(edit.activities) !== JSON.stringify(baseline.activities)) return true;
  if (JSON.stringify(edit.organizations) !== JSON.stringify(baseline.organizations)) return true;
  if (JSON.stringify(edit.profile) !== JSON.stringify(baseline.profile)) return true;

  return false;
}

/**
 * In-memory cache of directory detail rows keyed by user id.
 *
 * Lives for the current `/admin/users` session; invalidated per-user on forced refresh,
 * save, or delete.
 */
export class UserDirectoryDetailCache {
  private readonly rows = new Map<string, DirectoryUserRow>();

  /**
   * @param userId - Target user id.
   * @returns Cached row when present.
   */
  get(userId: string): DirectoryUserRow | undefined {
    return this.rows.get(userId);
  }

  /**
   * Store or replace a detail row.
   *
   * @param user - Fresh directory detail row.
   */
  set(user: DirectoryUserRow): void {
    this.rows.set(user.id, user);
  }

  /**
   * Drop a user from the cache after deletion.
   *
   * @param userId - Removed user id.
   */
  delete(userId: string): void {
    this.rows.delete(userId);
  }
}
