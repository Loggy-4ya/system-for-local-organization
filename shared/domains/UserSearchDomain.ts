/**
 * @fileoverview Institution user search for pickers (tasks, mentions, access grants).
 *
 * @module shared/domains/UserSearchDomain
 *
 * Tests: `npm run test:user-search-logic`
 * Registry: `.ai/docs/testing.md`
 */

import connectDB from "@shared/lib/db";
import type { PermissionKey } from "@shared/constants/accessControl";
import {
  buildUserSearchMongoFilter,
  canSearchUsersByEmail,
  toUserSearchCandidate,
  type UserSearchCandidate,
} from "@shared/lib/userSearchLogic";
import User, { type IUser } from "@shared/models/User";

/** Default max rows for autocomplete pickers. */
const DEFAULT_SEARCH_LIMIT = 12;

/** Hard cap for search limit query param. */
const MAX_SEARCH_LIMIT = 20;

/**
 * Consolidated user search for authenticated member pickers.
 */
export class UserSearchDomain {
  /**
   * Search institution users by name, login, group, specialty, and optionally email.
   *
   * Empty query returns recent users alphabetically for discoverability.
   *
   * @param viewer - Authenticated viewer document.
   * @param permissions - Effective permission keys for the viewer.
   * @param query - Partial search string.
   * @param limit - Max rows (capped at 20).
   * @returns Matching user rows for dropdown pickers.
   */
  static async searchMembers(
    viewer: IUser,
    permissions: PermissionKey[],
    query: string,
    limit: number = DEFAULT_SEARCH_LIMIT,
  ): Promise<UserSearchCandidate[]> {
    await connectDB();

    const safeLimit = Math.min(Math.max(limit, 1), MAX_SEARCH_LIMIT);
    const viewerSlice = {
      id: String(viewer._id),
      role: viewer.role,
      accessLevelIndex: viewer.accessLevelIndex,
      delegatedPermissions: viewer.delegatedPermissions ?? [],
      sociumRoles: viewer.sociumRoles ?? [],
      studentTitle: viewer.studentTitle,
      permissions,
    };

    const filter = buildUserSearchMongoFilter(query, {
      includeEmail: canSearchUsersByEmail(viewerSlice),
    });

    const docs = await User.find(filter)
      .sort({ name: 1, surname: 1 })
      .limit(safeLimit)
      .select("name surname login username email group specialty avatar role accessLevelIndex delegatedPermissions sociumRoles studentTitle")
      .lean();

    return docs.map((doc) => toUserSearchCandidate(doc as IUser, viewerSlice));
  }
}
