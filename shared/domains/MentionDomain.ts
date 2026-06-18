/**
 * @fileoverview Mention search domain — resolves `@` autocomplete targets (users + pages).
 *
 * Consolidates database lookups for the Nexus rich text editor mention picker.
 *
 * @module shared/domains/MentionDomain
 */

import connectDB from "@shared/lib/db";
import Page from "@shared/models/Page";
import User from "@shared/models/User";
import {
  buildPageMentionHref,
  buildUserMentionHref,
  type NexusMentionItem,
  type NexusMentionSearchResult,
} from "@shared/lib/nexusMentionTypes";

/** Default maximum rows per entity type in mention search. */
const DEFAULT_LIMIT_PER_TYPE = 8;

/**
 * Escape special regex characters in a user query string.
 *
 * @param value - Raw search text.
 * @returns Regex-safe string.
 */
function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Consolidated mention search engine for users and published pages.
 */
export class MentionDomain {
  /**
   * Search users and pages whose name, handle, title, or path matches the query.
   *
   * Empty query returns recent users and pages (limited) for discoverability.
   *
   * @param query - Partial label typed after `@`.
   * @param limitPerType - Max results per section (users, pages).
   * @returns Grouped mention items ready for the editor suggestion list.
   */
  static async search(
    query: string,
    limitPerType: number = DEFAULT_LIMIT_PER_TYPE,
  ): Promise<NexusMentionSearchResult> {
    await connectDB();

    const trimmed = query.trim();
    const limit = Math.min(Math.max(limitPerType, 1), 20);

    const userFilter = trimmed
      ? {
          $or: [
            { name: { $regex: escapeRegex(trimmed), $options: "i" } },
            { login: { $regex: escapeRegex(trimmed), $options: "i" } },
            { username: { $regex: escapeRegex(trimmed), $options: "i" } },
          ],
        }
      : {};

    const pageFilter = trimmed
      ? {
          published: true,
          $or: [
            { title: { $regex: escapeRegex(trimmed), $options: "i" } },
            { path: { $regex: escapeRegex(trimmed), $options: "i" } },
          ],
        }
      : { published: true };

    const [userDocs, pageDocs] = await Promise.all([
      User.find(userFilter)
        .sort({ name: 1 })
        .limit(limit)
        .select("name login username avatar")
        .lean(),
      Page.find(pageFilter)
        .sort({ title: 1 })
        .limit(limit)
        .select("title path")
        .lean(),
    ]);

    const users: NexusMentionItem[] = userDocs.map((doc) => {
      const id = String(doc._id);
      const handle = doc.username || doc.login;
      return {
        mentionType: "user",
        id,
        label: doc.name,
        href: buildUserMentionHref(id),
        subtitle: handle ? `@${handle}` : null,
        avatar: doc.avatar ?? null,
      };
    });

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
}
