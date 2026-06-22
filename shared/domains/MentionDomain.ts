/**
 * @fileoverview Mention search domain — resolves `@` autocomplete targets (users + pages).
 *
 * Consolidates database lookups for the Nexus rich text editor mention picker.
 *
 * @module shared/domains/MentionDomain
 */

import connectDB from "@shared/lib/db";
import type { PermissionKey } from "@shared/constants/accessControl";
import Page from "@shared/models/Page";
import User, { type IUser } from "@shared/models/User";
import { UserSearchDomain } from "@shared/domains/UserSearchDomain";
import {
  buildUserSearchMongoFilter,
  escapeUserSearchRegex,
  toUserSearchCandidate,
} from "@shared/lib/userSearchLogic";
import {
  buildPageMentionHref,
  buildUserMentionHref,
  type NexusMentionItem,
  type NexusMentionSearchResult,
} from "@shared/lib/nexusMentionTypes";

/** Default maximum rows per entity type in mention search. */
const DEFAULT_LIMIT_PER_TYPE = 8;

/**
 * Consolidated mention search engine for users and published pages.
 */
export class MentionDomain {
  /**
   * Search users and pages whose name, handle, title, or path matches the query.
   *
   * When `viewer` is supplied, user rows use {@link UserSearchDomain} fields
   * (name, surname, login, group, email when permitted).
   *
   * @param query - Partial label typed after `@`.
   * @param limitPerType - Max results per section (users, pages).
   * @param viewer - Optional authenticated viewer for expanded user search.
   * @param permissions - Effective permissions when `viewer` is set.
   * @returns Grouped mention items ready for the editor suggestion list.
   */
  static async search(
    query: string,
    limitPerType: number = DEFAULT_LIMIT_PER_TYPE,
    viewer?: IUser | null,
    permissions: PermissionKey[] = [],
  ): Promise<NexusMentionSearchResult> {
    await connectDB();

    const trimmed = query.trim();
    const limit = Math.min(Math.max(limitPerType, 1), 20);

    let users: NexusMentionItem[];

    if (viewer) {
      const rows = await UserSearchDomain.searchMembers(viewer, permissions, query, limit);
      users = rows.map((row) => ({
        mentionType: "user" as const,
        id: row.userId,
        label: row.displayName,
        href: buildUserMentionHref(row.userId),
        subtitle: row.subtitle,
        avatar: row.avatar,
      }));
    } else {
      users = await MentionDomain.searchUsersLegacy(trimmed, limit);
    }

    const pageFilter = trimmed
      ? {
          published: true,
          $or: [
            { title: { $regex: escapeUserSearchRegex(trimmed), $options: "i" } },
            { path: { $regex: escapeUserSearchRegex(trimmed), $options: "i" } },
          ],
        }
      : { published: true };

    const pageDocs = await Page.find(pageFilter)
      .sort({ title: 1 })
      .limit(limit)
      .select("title path")
      .lean();

    const pages: NexusMentionItem[] = pageDocs.map((doc) => {
      const id = String(doc._id);
      return {
        mentionType: "page",
        id,
        label: doc.title,
        href: buildPageMentionHref(doc.path),
        subtitle: doc.path,
      };
    });

    return { users, pages };
  }

  /**
   * Legacy user search without viewer context (no email field).
   *
   * @param trimmed - Trimmed query string.
   * @param limit - Max rows.
   * @returns Mention user rows.
   */
  private static async searchUsersLegacy(trimmed: string, limit: number): Promise<NexusMentionItem[]> {
    const filter = buildUserSearchMongoFilter(trimmed, { includeEmail: false });

    const userDocs = await User.find(filter)
      .sort({ name: 1 })
      .limit(limit)
      .select("name surname login username email group specialty avatar role accessLevelIndex delegatedPermissions sociumRoles studentTitle")
      .lean();

    return userDocs.map((doc) => {
      const candidate = toUserSearchCandidate(doc as IUser, null);
      return {
        mentionType: "user" as const,
        id: candidate.userId,
        label: candidate.displayName,
        href: buildUserMentionHref(candidate.userId),
        subtitle: candidate.subtitle,
        avatar: candidate.avatar,
      };
    });
  }
}
