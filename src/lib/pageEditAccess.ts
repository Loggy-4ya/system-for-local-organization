/**
 * @fileoverview Helpers for Puck page edit access on published CMS routes.
 *
 * Tests: `tests/lib/pageEditAccess.test.ts` — `npm run test:page-edit-access`
 *
 * @module src/lib/pageEditAccess
 */

import type { Session } from "next-auth";

/**
 * Roles that may open the Puck editor for CMS pages (matches admin panel visibility).
 *
 * @param role - Session user role.
 * @returns True when the user can edit Puck-managed pages.
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
 * Whether the published Puck viewer should show the edit FAB.
 *
 * @param session - Auth.js session from the server.
 * @param path - Normalised Puck page path.
 * @param isEditing - True when the route is already in editor mode.
 * @returns True when the floating edit control should render.
 */
export function shouldShowPageEditFab(
  session: Session | null,
  path: string,
  isEditing: boolean,
): boolean {
  if (isEditing) return false;
  if (!isPuckManagedPagePath(path)) return false;
  return canEditPages(session?.user?.role ?? null);
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
