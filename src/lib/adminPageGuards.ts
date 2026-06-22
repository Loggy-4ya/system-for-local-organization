/**
 * @fileoverview Server-side guards for permission-gated admin pages.
 *
 * Unauthorised callers receive {@link notFound} (404) so protected routes do not
 * leak existence to users without the required permission.
 *
 * @module src/lib/adminPageGuards
 */

import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { AuthDomain } from "@shared/domains/AuthDomain";
import { AccessControlDomain } from "@shared/domains/AccessControlDomain";
import type { IUser } from "@shared/models/User";

/**
 * Require `users.view_directory` (or legacy Admin) before rendering `/admin/users`.
 *
 * @param callbackUrl - Login redirect target when unauthenticated.
 * @returns Authenticated actor document.
 */
export async function requireDirectoryViewerPage(
  callbackUrl = "/admin/users",
): Promise<IUser> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  const user = await AuthDomain.getUserById(session.user.id);
  if (!user) {
    redirect("/login");
  }

  const canView = await AccessControlDomain.canUserViewDirectory(user);
  if (!canView && user.role !== "Admin") {
    notFound();
  }

  return user;
}

/**
 * Require `access_control.manage_settings` (or legacy Admin) before rendering
 * `/admin/user-access`.
 *
 * @param callbackUrl - Login redirect target when unauthenticated.
 * @returns Authenticated actor document.
 */
export async function requireAccessControlManagerPage(
  callbackUrl = "/admin/user-access",
): Promise<IUser> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  const user = await AuthDomain.getUserById(session.user.id);
  if (!user) {
    redirect("/login");
  }

  const canManage = await AccessControlDomain.canUserManageSettings(user);
  if (!canManage && user.role !== "Admin") {
    notFound();
  }

  return user;
}

/**
 * Require legacy `Admin` role before rendering security-sensitive admin pages.
 *
 * @param callbackUrl - Login redirect target when unauthenticated.
 * @returns Authenticated admin user document.
 */
export async function requireLegacyAdminPage(
  callbackUrl: string,
): Promise<IUser> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  const user = await AuthDomain.getUserById(session.user.id);
  if (!user) {
    redirect("/login");
  }

  if (user.role !== "Admin") {
    notFound();
  }

  return user;
}

/**
 * Require `users.assign_socium_roles` (or legacy Admin) before rendering
 * `/admin/membership-applications`.
 *
 * @param callbackUrl - Login redirect target when unauthenticated.
 * @returns Authenticated actor document.
 */
export async function requireSociumRoleAssignerPage(
  callbackUrl = "/admin/membership-applications",
): Promise<IUser> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  const user = await AuthDomain.getUserById(session.user.id);
  if (!user) {
    redirect("/login");
  }

  const permissions = await AccessControlDomain.resolvePermissionsForUser(user);
  const canReview =
    user.role === "Admin" || permissions.includes("users.assign_socium_roles");

  if (!canReview) {
    notFound();
  }

  return user;
}
