/**
 * @fileoverview Pure helpers for institution user search filters and result labels.
 *
 * Used by task performer pickers, mention autocomplete, and member discovery APIs.
 *
 * Tests: `npm run test:user-search-logic`
 * Registry: `.ai/docs/testing.md`
 *
 * @module shared/lib/userSearchLogic
 */

import type { PermissionKey } from "@shared/constants/accessControl";
import { formatAcademicGroupSpecialtyLabel } from "@shared/lib/academicCatalogLogic";
import { canViewerSeeProfilePii } from "@shared/lib/publicProfileRedaction";
import type { AccessControlUserSlice } from "@shared/lib/accessControlLogic";
import { formatUserFullName, resolveUserDisplayLabel } from "@shared/lib/userSociumHelpers";
import type { IUser } from "@shared/models/User";

/** One row in a user search dropdown. */
export interface UserSearchCandidate {
  /** MongoDB user id. */
  userId: string;
  /** Primary label (full name). */
  displayName: string;
  /** Secondary line — login, group, email when permitted. */
  subtitle: string | null;
  /** Avatar URL when available. */
  avatar: string | null;
  /** Institution login handle when set — used for `/users/{login}` profile links. */
  login: string | null;
}

/** Options when building a MongoDB user search filter. */
export interface UserSearchFilterOptions {
  /** Include email in `$or` clauses (directory / task dispatchers). */
  includeEmail: boolean;
}

/**
 * Escape special regex characters in a user query string.
 *
 * @param value - Raw search text.
 * @returns Regex-safe string.
 */
export function escapeUserSearchRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Whether the viewer may match and display email in user search.
 *
 * @param viewer - Authenticated viewer slice with resolved permissions.
 * @returns True when email may be searched and shown in subtitles.
 */
export function canSearchUsersByEmail(
  viewer: AccessControlUserSlice & { permissions?: PermissionKey[] },
): boolean {
  if (viewer.role === "Admin") return true;
  const permissions = viewer.permissions ?? [];
  return permissions.includes("users.view_directory") || permissions.includes("tasks.dispatch");
}

/**
 * Build a MongoDB filter for institution user search.
 *
 * Matches name, surname, login, Telegram username, group, specialty, and optionally email.
 *
 * @param query - Raw search string.
 * @param options - Whether email is included in the filter.
 * @returns MongoDB filter object, or empty object when query is blank.
 */
export function buildUserSearchMongoFilter(
  query: string,
  options: UserSearchFilterOptions,
): Record<string, unknown> {
  const trimmed = query.trim();
  if (!trimmed) return {};

  const regex = escapeUserSearchRegex(trimmed);
  const clauses: Record<string, unknown>[] = [
    { name: { $regex: regex, $options: "i" } },
    { surname: { $regex: regex, $options: "i" } },
    { login: { $regex: regex, $options: "i" } },
    { username: { $regex: regex, $options: "i" } },
    { group: { $regex: regex, $options: "i" } },
    { specialty: { $regex: regex, $options: "i" } },
  ];

  if (options.includeEmail) {
    clauses.push({ email: { $regex: regex, $options: "i" } });
  }

  return { $or: clauses };
}

/**
 * Build a human-readable subtitle for a search result row.
 *
 * @param user - User document fields used for display.
 * @param showEmail - Whether email may appear in the subtitle.
 * @returns Secondary line or null.
 */
export function formatUserSearchSubtitle(
  user: Pick<IUser, "login" | "username" | "email" | "group" | "specialty">,
  showEmail: boolean,
): string | null {
  const parts: string[] = [];
  const handle = user.username || user.login;
  if (handle) parts.push(`@${handle}`);
  const academic = formatAcademicGroupSpecialtyLabel(user.specialty, user.group);
  if (academic) parts.push(academic);
  if (showEmail && user.email) parts.push(user.email);
  return parts.length > 0 ? parts.join(" · ") : null;
}

/**
 * Map a lean user document into a {@link UserSearchCandidate}.
 *
 * @param doc - MongoDB user document.
 * @param viewer - Acting viewer for PII-aware subtitles.
 * @returns Search row DTO.
 */
export function toUserSearchCandidate(
  doc: Pick<
    IUser,
    "_id" | "name" | "surname" | "login" | "username" | "email" | "group" | "specialty" | "avatar" | "role" | "accessLevelIndex" | "delegatedPermissions" | "sociumRoles" | "studentTitle"
  >,
  viewer: (AccessControlUserSlice & { id?: string; permissions?: PermissionKey[] }) | null,
): UserSearchCandidate {
  const showEmail = viewer ? canSearchUsersByEmail(viewer) : false;
  const showPii = viewer ? canViewerSeeProfilePii(viewer, doc as IUser) : false;

  return {
    userId: String(doc._id),
    displayName:
      resolveUserDisplayLabel({
        name: doc.name,
        surname: doc.surname,
        login: doc.login,
      }) ?? formatUserFullName(doc.name, doc.surname),
    subtitle: formatUserSearchSubtitle(doc, showEmail || showPii),
    avatar: doc.avatar ?? null,
    login: doc.login ?? null,
  };
}

/**
 * Exclude already-selected user ids from suggestion rows.
 *
 * @param candidates - Raw search results.
 * @param excludedUserIds - User ids already chosen in the picker.
 * @returns Filtered candidates preserving order.
 */
export function filterUserSearchCandidates(
  candidates: readonly UserSearchCandidate[],
  excludedUserIds: readonly string[],
): UserSearchCandidate[] {
  const excluded = new Set(excludedUserIds);
  return dedupeUserSearchCandidates(
    candidates.filter((row) => !excluded.has(row.userId)),
  );
}

/**
 * Remove duplicate user search rows while preserving order.
 *
 * Collapses repeated Mongo ids and rows that share the same institution login.
 *
 * @param candidates - Raw search results.
 * @returns Deduped candidates.
 */
export function dedupeUserSearchCandidates(
  candidates: readonly UserSearchCandidate[],
): UserSearchCandidate[] {
  const seen = new Set<string>();
  const rows: UserSearchCandidate[] = [];

  for (const row of candidates) {
    const idKey = row.userId?.trim();
    if (idKey && seen.has(`id:${idKey}`)) continue;

    const loginKey = row.login?.trim().toLowerCase();
    if (loginKey && seen.has(`login:${loginKey}`)) continue;

    if (idKey) seen.add(`id:${idKey}`);
    if (loginKey) seen.add(`login:${loginKey}`);
    rows.push(row);
  }

  return rows;
}
