/**
 * @fileoverview Helpers for Puck page edit access on published CMS routes.
 *
 * Tests: `tests/lib/pageEditAccess.test.ts` — `npm run test:page-edit-access`
 *
 * @module src/lib/pageEditAccess
 */

import type { Session } from "next-auth";
import {
  canUserCreatePages,
  canUserEditPage,
  hasGlobalPageEditAuthority,
  type PageEditActorSlice,
  type PageOwnershipSlice,
} from "@shared/lib/pageEditAccessLogic";
import { inferAccessLevelIndex } from "@shared/lib/accessControlLogic";
import type { PermissionKey } from "@shared/constants/accessControl";
import type { UserRole } from "@shared/models/User";

/**
 * Legacy coarse check — prefer {@link resolvePageEditActor} + {@link canUserEditPageDoc}.
 *
 * @param role - Session user role.
 * @returns True when the user may edit Puck-managed pages under legacy rules.
 * @deprecated Use ownership-aware checks via PageDomain.
 */
export function canEditPages(role: string | undefined | null): boolean {
  return role === "Admin" || role === "StudentCouncil";
}

/**
 * Whether a route path is managed by the Puck page editor (MongoDB `pages` collection).
 *
 * The code-only homepage at `/` is excluded — it is not stored as a Puck document.
 *
 * @param path - Normalised page path (e.g. `/news`, `/about`, `/council/apply`).
 * @returns True for Puck-managed slugs.
 */
export function isPuckManagedPagePath(path: string): boolean {
  return path.length > 0 && path !== "/";
}

/**
 * Build an edit actor slice from session + resolved permissions.
 *
 * @param session - Auth.js session.
 * @param permissions - Effective permission keys for the user.
 * @returns Actor slice for pure edit checks.
 */
export function resolvePageEditActor(
  session: Session,
  permissions: readonly PermissionKey[],
): PageEditActorSlice {
  return {
    userId: session.user.id,
    role: (session.user.role ?? "Student") as UserRole,
    accessLevelIndex: inferAccessLevelIndex({
      role: (session.user.role ?? "Student") as UserRole,
    }),
    permissions,
  };
}

/**
 * Whether the session user may edit a specific page document.
 *
 * @param session - Auth.js session.
 * @param permissions - Effective permission keys.
 * @param page - Page ownership slice.
 * @returns True when edit is allowed.
 */
export function canUserEditPageDoc(
  session: Session | null,
  permissions: readonly PermissionKey[],
  page: PageOwnershipSlice | null,
): boolean {
  if (!session?.user?.id) return false;
  const actor = resolvePageEditActor(session, permissions);
  if (!page) return canUserCreatePages(actor);
  return canUserEditPage(actor, page);
}

/**
 * Whether the session user has global page edit authority (admin tiers).
 *
 * @param session - Auth.js session or null.
 * @returns True for system/self-gov administrators.
 */
export function sessionHasGlobalPageEdit(session: Session | null): boolean {
  if (!session?.user) return false;
  const role = (session.user.role ?? "Student") as UserRole;
  const index = inferAccessLevelIndex({
    role,
    accessLevelIndex: session.user.accessLevelIndex as PageEditActorSlice["accessLevelIndex"],
  });
  return hasGlobalPageEditAuthority(index, role);
}

/**
 * Whether the session user may preview an unpublished Puck page on the viewer route.
 *
 * Editors with page access and institution administrators may open draft URLs.
 *
 * @param session - Auth.js session.
 * @param canEdit - Pre-resolved edit permission for this page.
 * @returns True when draft preview is allowed.
 */
export function canViewUnpublishedPage(
  session: Session | null,
  canEdit: boolean,
): boolean {
  if (canEdit) return true;
  return sessionHasGlobalPageEdit(session);
}

/**
 * Whether the published Puck viewer should show the edit FAB.
 *
 * @param canEdit - Pre-resolved edit permission for this page.
 * @param path - Normalised Puck page path.
 * @param isEditing - True when the route is already in editor mode.
 * @returns True when the floating edit control should render.
 */
export function shouldShowPageEditFab(
  canEdit: boolean,
  path: string,
  isEditing: boolean,
): boolean {
  if (isEditing) return false;
  if (!isPuckManagedPagePath(path)) return false;
  return canEdit;
}

/**
 * Resolve the Puck editor URL for the current published route.
 *
 * @param pathname - Browser pathname (e.g. `/news`, `/about/team`).
 * @param canEdit - Whether the viewer may open the editor.
 * @returns Edit href or null when not applicable.
 */
export function resolvePageEditHref(
  pathname: string,
  canEdit: boolean,
): string | null {
  if (!canEdit) return null;
  if (!pathname || pathname === "/") return null;
  if (pathname === "/edit" || pathname.endsWith("/edit")) return null;
  if (!isPuckManagedPagePath(pathname)) return null;
  return `${pathname}/edit`;
}

/**
 * Viewer pathname for guests or users without edit access on a `/<path>/edit` route.
 *
 * @param path - Normalised Puck page path without the `/edit` suffix (e.g. `/news`).
 * @returns Public viewer URL — same path, never an editor URL.
 */
export function resolveUnauthorizedEditorRedirectPath(path: string): string {
  return path || "/";
}
