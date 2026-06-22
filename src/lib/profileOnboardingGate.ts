/**
 * @fileoverview Server-side redirect gate for OAuth / Telegram sparse profile onboarding.
 *
 * Authenticated users with linked external identities and missing required
 * profile fields are sent to `/profile/settings?onboarding=1` until complete.
 *
 * @module src/lib/profileOnboardingGate
 */

import { redirect } from "next/navigation";
import { AuthDomain } from "@shared/domains/AuthDomain";
import { userNeedsProfileOnboarding, userNeedsSelfGovernmentProfileCompliance } from "@shared/lib/userProfileCompleteness";

/** Settings route used for first-time OAuth profile completion. */
export const PROFILE_ONBOARDING_SETTINGS_PATH = "/profile/settings?onboarding=1";

/**
 * Paths that must remain reachable while onboarding is incomplete.
 *
 * @param pathname - Request pathname from middleware (`x-pathname` header).
 * @returns True when onboarding redirect should not run.
 */
export function isProfileOnboardingExemptPath(pathname: string): boolean {
  if (!pathname || pathname === "/") return false;

  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/profile/settings") ||
    pathname.startsWith("/telegram")
  ) {
    return true;
  }

  return false;
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
    redirect(PROFILE_ONBOARDING_SETTINGS_PATH);
  }

  if (userNeedsSelfGovernmentProfileCompliance(user)) {
    redirect(PROFILE_ONBOARDING_SETTINGS_PATH);
  }
}
