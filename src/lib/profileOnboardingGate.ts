/**
 * @fileoverview Server-side redirect gates for OAuth onboarding and member Telegram compliance.
 *
 * Authenticated users with linked external identities and missing required
 * profile fields are sent to `/profile/settings?onboarding=1` until complete.
 *
 * Teachers without institutional approval are redirected to profile settings or
 * the membership application page until their access is granted.
 *
 * Self-government members without Telegram may browse the site but are redirected
 * from member-functional routes (`/tasks`, `/task-groups`) until Telegram is linked.
 *
 * @module src/lib/profileOnboardingGate
 */

import { redirect } from "@/i18n/serverRedirect";
import { AuthDomain } from "@shared/domains/AuthDomain";
import { stripLocalePrefix } from "@/lib/localePathLogic";
import {
  resolveTeacherAccessGatePath,
  userNeedsMemberTelegramOnboarding,
  userNeedsProfileOnboarding,
  userNeedsTeacherAccessGate,
} from "@shared/lib/userProfileCompleteness";

/** Settings route used for first-time OAuth profile completion. */
export const PROFILE_ONBOARDING_SETTINGS_PATH = "/profile/settings?onboarding=1";

/** Settings route used when a member must link Telegram before member tools. */
export const MEMBER_TELEGRAM_ONBOARDING_SETTINGS_PATH =
  "/profile/settings?onboarding=member-telegram";

/**
 * Paths that must remain reachable while onboarding is incomplete.
 *
 * @param pathname - Request pathname from middleware (`x-pathname` header).
 * @returns True when onboarding redirect should not run.
 */
export function isProfileOnboardingExemptPath(pathname: string): boolean {
  const normalized = stripLocalePrefix(pathname);
  if (!normalized || normalized === "/") return false;

  if (
    normalized.startsWith("/login") ||
    normalized.startsWith("/signup") ||
    normalized.startsWith("/profile/settings") ||
    normalized.startsWith("/profile/membership") ||
    normalized.startsWith("/profile") ||
    normalized.startsWith("/telegram")
  ) {
    return true;
  }

  return false;
}

/**
 * Member-functional routes that require a linked Telegram account.
 *
 * @param pathname - Request pathname from middleware (`x-pathname` header).
 * @returns True when member Telegram compliance should be enforced.
 */
export function isMemberFunctionalPath(pathname: string): boolean {
  const normalized = stripLocalePrefix(pathname);
  if (!normalized) return false;

  return normalized.startsWith("/tasks") || normalized.startsWith("/task-groups");
}

/**
 * Redirect sparse OAuth/Telegram accounts to profile settings when required fields are missing.
 *
 * @param userId - Authenticated MongoDB user id.
 * @param pathname - Current request pathname.
 */
export async function enforceProfileOnboarding(userId: string, pathname: string): Promise<void> {
  if (isProfileOnboardingExemptPath(pathname)) {
    return;
  }

  const user = await AuthDomain.getUserById(userId);
  if (!user) {
    return;
  }

  if (userNeedsProfileOnboarding(user)) {
    return await redirect(PROFILE_ONBOARDING_SETTINGS_PATH);
  }
}

/**
 * Redirect unapproved teachers away from institution features until reviewed.
 *
 * @param userId - Authenticated MongoDB user id.
 * @param pathname - Current request pathname.
 */
export async function enforceTeacherAccessApproval(
  userId: string,
  pathname: string,
): Promise<void> {
  if (isProfileOnboardingExemptPath(pathname)) {
    return;
  }

  const user = await AuthDomain.getUserById(userId);
  if (!user) {
    return;
  }

  const slice = {
    name: user.name,
    surname: user.surname,
    phone: user.phone,
    specialty: user.specialty,
    group: user.group,
    avatar: user.avatar,
    sociumRoles: user.sociumRoles ?? [],
    selfGovernmentApplicationIntent: user.selfGovernmentApplicationIntent,
    telegramId: user.telegramId,
    teacherAccessApproved: user.teacherAccessApproved,
  };

  if (userNeedsTeacherAccessGate(slice)) {
    return await redirect(resolveTeacherAccessGatePath(slice));
  }
}

/**
 * Redirect self-government members without Telegram away from member tools.
 *
 * General browsing remains allowed; a site-wide banner reminds them to connect.
 *
 * @param userId - Authenticated MongoDB user id.
 * @param pathname - Current request pathname.
 */
export async function enforceMemberTelegramCompliance(
  userId: string,
  pathname: string,
): Promise<void> {
  if (!isMemberFunctionalPath(pathname)) {
    return;
  }

  const user = await AuthDomain.getUserById(userId);
  if (!user) {
    return;
  }

  if (userNeedsMemberTelegramOnboarding(user)) {
    return await redirect(MEMBER_TELEGRAM_ONBOARDING_SETTINGS_PATH);
  }
}
