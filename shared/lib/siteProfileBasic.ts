/**
 * @fileoverview Slim site chrome profile DTO for header bootstrap on page entry.
 *
 * Keeps client `/api/me` payloads small while carrying the fields required for
 * global header account UI and admin nav visibility.
 *
 * Tests: `npm run test:site-profile-basic`
 *
 * @module shared/lib/siteProfileBasic
 */

import type { PublicUser } from "@shared/domains/AuthDomain";
import type { UserRole } from "@shared/models/User";

/** Minimal authenticated user fields consumed by site chrome on every page visit. */
export interface BasicSiteProfile {
  /** MongoDB user id. */
  id: string;
  /** Given / first name. */
  name: string;
  /** Family name when present. */
  surname: string | null;
  /** Combined display name for header labels. */
  fullName: string;
  /** Linked email when available. */
  email: string | null;
  /** Avatar URL for header menus. */
  avatar: string | null;
  /** RBAC role — drives admin panel link visibility. */
  role: UserRole;
}

/**
 * Map a {@link PublicUser} (or session user slice) into {@link BasicSiteProfile}.
 *
 * @param user - Authenticated user record from Auth.js session or AuthDomain.
 * @returns Header-safe profile snapshot.
 */
export function toBasicSiteProfile(
  user: Pick<
    PublicUser,
    "id" | "name" | "surname" | "fullName" | "email" | "avatar" | "role"
  >,
): BasicSiteProfile {
  return {
    id: user.id,
    name: user.name,
    surname: user.surname ?? null,
    fullName: user.fullName,
    email: user.email ?? null,
    avatar: user.avatar ?? null,
    role: user.role,
  };
}

/**
 * Whether global layout admin-only nav should render for the given role.
 *
 * @param role - Viewer RBAC role.
 * @returns True for Admin and StudentCouncil viewers.
 */
export function showAdminPanelForRole(role: UserRole | undefined | null): boolean {
  return role === "Admin" || role === "StudentCouncil";
}
