/**
 * @fileoverview Pure helpers for per-page delegated editor grants.
 *
 * Tests: `npm run test:page-access-logic`
 * Registry: `.ai/docs/testing.md`
 *
 * @module shared/lib/pageAccessLogic
 */

import {
  type AccessLevelIndex,
  type PermissionKey,
} from "@shared/constants/accessControl";
import type { UserRole } from "@shared/models/User";
import {
  canUserCreatePages,
  canUserEditPage,
  hasGlobalPageEditAuthority,
  type PageEditActorSlice,
  type PageOwnershipSlice,
} from "@shared/lib/pageEditAccessLogic";
import { resolveUserDisplayLabel } from "@shared/lib/userSociumHelpers";

/** Maximum delegated editors per page. */
export const MAX_PAGE_ACCESS_EDITORS = 12;

/** Editor grant row stored in Puck `pageSettings.delegatedEditors`. */
export interface PageAccessEditorEntry {
  /** MongoDB user id. */
  userId: string;
  /** Resolved display label (name or login). */
  displayName: string;
}

/** Search result row for the page access user picker. */
export interface PageAccessEditorCandidate {
  /** MongoDB user id. */
  userId: string;
  /** Primary label shown on the badge. */
  displayName: string;
  /** Optional secondary line (login handle). */
  subtitle: string | null;
  /** Avatar URL when available. */
  avatar: string | null;
}

/**
 * Whether the actor may edit only because they appear in `delegatedEditorUserIds`.
 *
 * @param actor - Authenticated editor slice.
 * @param page - Page ownership slice.
 * @returns True when the user is a delegate but not the author or a global admin.
 */
export function isPageDelegatedEditorOnly(
  actor: PageEditActorSlice,
  page: PageOwnershipSlice,
): boolean {
  if (!actor.userId) return false;
  if (hasGlobalPageEditAuthority(actor.accessLevelIndex, actor.role)) return false;

  const authorId = page.authorUserId?.trim();
  if (authorId && authorId === actor.userId) return false;

  const delegated = page.delegatedEditorUserIds ?? [];
  return delegated.some((id) => id === actor.userId);
}

/**
 * Whether an actor may add or remove optional delegated editor grants on a page.
 *
 * Pages are **open by default** under institution RBAC (author + admins). This
 * picker only adds collaborators — it does not enable whitelist-only edit mode.
 *
 * Any user who may edit the page (except delegate-only editors) can manage grants.
 *
 * @param actor - Authenticated editor slice.
 * @param page - Page ownership slice or null for a new unsaved page.
 * @returns True when the access picker should render in Page Settings.
 */
export function canManagePageAccess(
  actor: PageEditActorSlice,
  page: PageOwnershipSlice | null,
): boolean {
  if (!actor.userId) return false;
  if (!page) return canUserCreatePages(actor);
  if (!canUserEditPage(actor, page)) return false;
  return !isPageDelegatedEditorOnly(actor, page);
}

/**
 * Resolve a display label from user name parts and login.
 *
 * @param input - User profile fields.
 * @returns Display label or null.
 */
export function resolvePageAccessDisplayName(input: {
  name: string;
  surname?: string | null;
  login?: string | null;
}): string | null {
  return resolveUserDisplayLabel(input);
}

/**
 * Whether another delegated editor may be added.
 *
 * @param selected - Current grant rows.
 * @param candidateUserId - User id being added.
 * @param authorUserId - Page author id to exclude from delegates.
 * @returns True when the candidate can be appended.
 */
export function canAddPageAccessEditor(
  selected: readonly PageAccessEditorEntry[],
  candidateUserId: string,
  authorUserId?: string | null,
): boolean {
  const userId = candidateUserId.trim();
  if (!userId) return false;
  if (authorUserId?.trim() === userId) return false;
  if (selected.length >= MAX_PAGE_ACCESS_EDITORS) return false;
  return !selected.some((entry) => entry.userId === userId);
}

/**
 * Filter editor candidates against the current selection and author.
 *
 * @param query - Case-insensitive search needle.
 * @param candidates - Domain search results.
 * @param selected - Already granted editors on the page.
 * @param authorUserId - Author to exclude from suggestions.
 * @returns Matching candidates not yet selected.
 */
export function filterPageAccessEditorCandidates(
  query: string,
  candidates: readonly PageAccessEditorCandidate[],
  selected: readonly PageAccessEditorEntry[],
  authorUserId?: string | null,
): PageAccessEditorCandidate[] {
  const selectedIds = new Set(selected.map((entry) => entry.userId));
  const authorId = authorUserId?.trim() ?? "";
  const needle = query.trim().toLowerCase();

  return candidates.filter((candidate) => {
    if (selectedIds.has(candidate.userId)) return false;
    if (authorId && candidate.userId === authorId) return false;
    if (!needle) return true;
    return (
      candidate.displayName.toLowerCase().includes(needle) ||
      (candidate.subtitle?.toLowerCase().includes(needle) ?? false)
    );
  });
}

/**
 * Normalise delegated editor rows from the Puck editor before MongoDB persistence.
 *
 * @param entries - Raw grant rows from page settings.
 * @param authorUserId - Author id excluded from storage.
 * @returns Unique user ids in stable order.
 */
export function normalizeDelegatedEditorsForStorage(
  entries: readonly PageAccessEditorEntry[] | null | undefined,
  authorUserId?: string | null,
): string[] {
  const authorId = authorUserId?.trim() ?? "";
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const entry of entries ?? []) {
    const userId = entry.userId?.trim();
    if (!userId || userId === authorId || seen.has(userId)) continue;
    seen.add(userId);
    normalized.push(userId);
    if (normalized.length >= MAX_PAGE_ACCESS_EDITORS) break;
  }

  return normalized;
}

/**
 * Merge stored user ids with hydrated display labels for editor init.
 *
 * @param userIds - MongoDB delegated editor ids.
 * @param labelsById - Resolved labels keyed by user id.
 * @returns Grant rows for Puck page settings.
 */
export function hydratePageAccessEditors(
  userIds: readonly string[],
  labelsById: Readonly<Record<string, string>>,
): PageAccessEditorEntry[] {
  return userIds
    .map((userId) => {
      const trimmed = userId.trim();
      const displayName = labelsById[trimmed]?.trim();
      if (!trimmed || !displayName) return null;
      return { userId: trimmed, displayName };
    })
    .filter((entry): entry is PageAccessEditorEntry => entry != null);
}
