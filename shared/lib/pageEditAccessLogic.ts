/**
 * @fileoverview Pure page ownership and edit-access resolution.
 *
 * Tests: `npm run test:page-edit-access-logic`
 * Registry: `.ai/docs/testing.md`
 *
 * @module shared/lib/pageEditAccessLogic
 */

import {
  type AccessLevelIndex,
  type PermissionKey,
} from "@shared/constants/accessControl";
import type { UserRole } from "@shared/models/User";

/** Page ownership slice used for edit checks. */
export interface PageOwnershipSlice {
  authorUserId?: string | null;
  delegatedEditorUserIds?: readonly string[];
}

/** Actor slice for edit permission resolution. */
export interface PageEditActorSlice {
  userId: string | null;
  role: UserRole;
  accessLevelIndex: AccessLevelIndex;
  permissions: readonly PermissionKey[];
}

/**
 * System administrators and self-government administration may edit any page.
 *
 * @param accessLevelIndex - Actor hierarchy index (0 = highest).
 * @param role - Legacy role fallback.
 * @returns True when the actor has global page edit authority.
 */
export function hasGlobalPageEditAuthority(
  accessLevelIndex: AccessLevelIndex,
  role: UserRole,
): boolean {
  if (role === "Admin" || accessLevelIndex === 0) return true;
  return accessLevelIndex === 1;
}

/**
 * Whether an actor may create new Puck pages (open editor for a new slug).
 *
 * @param actor - Authenticated user access slice.
 * @returns True when page creation is permitted.
 */
export function canUserCreatePages(actor: PageEditActorSlice): boolean {
  if (!actor.userId) return false;
  if (hasGlobalPageEditAuthority(actor.accessLevelIndex, actor.role)) return true;
  return actor.permissions.includes("pages.create");
}

/**
 * Whether an actor may edit a specific persisted page.
 *
 * @param actor - Authenticated user access slice.
 * @param page - Page ownership fields.
 * @returns True when the editor route and save API should allow this user.
 */
export function canUserEditPage(
  actor: PageEditActorSlice,
  page: PageOwnershipSlice,
): boolean {
  if (!actor.userId) return false;
  if (hasGlobalPageEditAuthority(actor.accessLevelIndex, actor.role)) return true;

  const delegated = page.delegatedEditorUserIds ?? [];
  if (delegated.some((id) => id === actor.userId)) return true;

  const authorId = page.authorUserId?.trim();
  if (authorId && authorId === actor.userId && actor.permissions.includes("pages.edit_own")) {
    return true;
  }

  return false;
}
