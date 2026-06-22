/**
 * @fileoverview Server guard for the Page Manager news catalog settings page.
 *
 * @module src/lib/pageCategoriesHubAccess
 */

import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import { AuthDomain } from "@shared/domains/AuthDomain";
import { AccessControlDomain } from "@shared/domains/AccessControlDomain";
import { canUserCreatePages } from "@shared/lib/pageEditAccessLogic";
import { inferAccessLevelIndex } from "@shared/lib/accessControlLogic";
import type { IUser } from "@shared/models/User";

/**
 * Require page-create permission before rendering `/pages/categories/edit`.
 *
 * @param callbackUrl - Login redirect target when unauthenticated.
 * @returns Authenticated user document.
 */
export async function requirePageCategoriesHubEditor(
  callbackUrl = "/pages/categories/edit",
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
  const actor = {
    userId: String(user._id),
    role: user.role,
    accessLevelIndex: inferAccessLevelIndex({
      role: user.role,
      accessLevelIndex: user.accessLevelIndex,
    }),
    permissions,
  };

  if (!canUserCreatePages(actor) && user.role !== "Admin" && user.role !== "StudentCouncil") {
    notFound();
  }

  return user;
}

/**
 * Whether the signed-in session may open the news catalog settings page.
 *
 * @param session - Auth.js session or null.
 * @returns True when the user may manage hub sections.
 */
export async function canSessionManagePageCategoriesHub(
  session: Awaited<ReturnType<typeof auth>>,
): Promise<boolean> {
  if (!session?.user?.id) return false;
  const user = await AuthDomain.getUserById(session.user.id);
  if (!user) return false;

  if (user.role === "Admin" || user.role === "StudentCouncil") return true;

  const permissions = await AccessControlDomain.resolvePermissionsForUser(user);
  return canUserCreatePages({
    userId: String(user._id),
    role: user.role,
    accessLevelIndex: inferAccessLevelIndex({
      role: user.role,
      accessLevelIndex: user.accessLevelIndex,
    }),
    permissions,
  });
}
