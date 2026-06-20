/**
 * @fileoverview Shared session authorisation helper for API routes.
 *
 * Replaces the dev-only NEXTAUTH_SECRET bearer guard with Auth.js session
 * validation. When NEXTAUTH_SECRET is unset, all requests are permitted so
 * the Puck editor works without auth setup.
 *
 * @module src/lib/authGuards
 */

import type { NextRequest } from "next/server";
import { auth } from "@/auth";
import type { Session } from "next-auth";
import type { PermissionKey } from "@shared/constants/accessControl";
import type { IUser } from "@shared/models/User";

/**
 * Resolve the current session, or null when auth is not configured.
 *
 * @returns Active session or null.
 */
export async function getOptionalSession(): Promise<Session | null> {
  if (!process.env.NEXTAUTH_SECRET) return null;
  return auth();
}

/**
 * Determine whether an incoming API request is authorised to mutate data.
 *
 * Accepts either a valid Auth.js session cookie or the legacy editor bearer
 * token (`Authorization: Bearer ${NEXTAUTH_SECRET}`).
 *
 * Dev bypass: returns true when `NEXTAUTH_SECRET` is not configured.
 *
 * @param req - Optional request for bearer token fallback.
 * @returns `true` when the caller is authorised (or auth is disabled).
 */
export async function isApiAuthorised(req?: NextRequest): Promise<boolean> {
  if (!process.env.NEXTAUTH_SECRET) return true;

  const session = await auth();
  if (session?.user?.id) return true;

  if (req) {
    const header = req.headers.get("Authorization") ?? "";
    return header === `Bearer ${process.env.NEXTAUTH_SECRET}`;
  }

  return false;
}

/**
 * Require an authenticated session for API routes.
 *
 * @returns Session when authorised.
 * @throws Error with message suitable for 401 responses.
 */
export async function requireApiSession(): Promise<Session> {
  if (!process.env.NEXTAUTH_SECRET) {
    throw new Error("Unauthorized.");
  }
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized.");
  }
  return session;
}

/**
 * Require an authenticated session with Admin role for API routes.
 *
 * @returns Session when authorised as Admin.
 * @throws Error with message suitable for 401 or 403 responses.
 */
export async function requireAdminRole(): Promise<Session> {
  if (!process.env.NEXTAUTH_SECRET) {
    return {
      user: {
        id: "dev-admin",
        role: "Admin",
        name: "Dev Admin",
        email: "admin@dev.local",
      },
    } as any;
  }
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized.");
  }
  if (session.user.role !== "Admin") {
    throw new Error("Forbidden.");
  }
  return session;
}

/**
 * Require a specific permission key for the authenticated user.
 *
 * @param permission - Permission key to enforce.
 * @returns Session when authorised.
 * @throws Error with message suitable for 401 or 403 responses.
 */
export async function requirePermission(permission: PermissionKey): Promise<Session> {
  if (!process.env.NEXTAUTH_SECRET) {
    return {
      user: {
        id: "dev-admin",
        role: "Admin",
        name: "Dev Admin",
        email: "admin@dev.local",
      },
    } as Session;
  }

  const session = await requireApiSession();
  const { AuthDomain } = await import("@shared/domains/AuthDomain");
  const { AccessControlDomain } = await import("@shared/domains/AccessControlDomain");

  const user = await AuthDomain.getUserById(session.user.id);
  if (!user) {
    throw new Error("Unauthorized.");
  }

  const permissions = await AccessControlDomain.resolvePermissionsForUser(user);
  const hasPerm = permissions.includes(permission);

  if (!hasPerm && user.role !== "Admin") {
    throw new Error("Forbidden.");
  }

  return session;
}

/**
 * Require permission to view the user directory.
 *
 * @returns Session when authorised.
 * @throws Error with message suitable for 401 or 403 responses.
 */
export async function requireDirectoryViewer(): Promise<Session> {
  return requirePermission("users.view_directory");
}

/**
 * Resolve the authenticated actor after {@link requireDirectoryViewer}.
 *
 * @returns Session and MongoDB user document for the actor.
 * @throws Error with message suitable for 401 or 403 responses.
 */
export async function requireDirectoryViewerActor(): Promise<{
  session: Session;
  actor: IUser;
}> {
  const session = await requireDirectoryViewer();
  const { AuthDomain } = await import("@shared/domains/AuthDomain");
  const actor = await AuthDomain.getUserById(session.user.id);
  if (!actor) {
    throw new Error("Unauthorized.");
  }
  return { session, actor };
}

/**
 * Map auth guard errors to HTTP status codes for API routes.
 *
 * @param err - Thrown guard error.
 * @returns HTTP status code.
 */
export function authGuardErrorStatus(err: unknown): number {
  const message = err instanceof Error ? err.message : "";
  if (message === "Unauthorized.") return 401;
  if (message === "Forbidden.") return 403;
  return 500;
}

/**
 * Require permission to manage access-control settings.
 *
 * @returns Session when authorised.
 * @throws Error with message suitable for 401 or 403 responses.
 */
export async function requireAccessControlManager(): Promise<Session> {
  return requirePermission("access_control.manage_settings");
}

/**
 * Require permission to send system-wide broadcasts.
 *
 * @returns Session when authorised.
 * @throws Error with message suitable for 401 or 403 responses.
 */
export async function requireBroadcastSender(): Promise<Session> {
  return requirePermission("notifications.broadcast");
}
