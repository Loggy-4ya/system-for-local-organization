/**
 * @fileoverview Server component — redirects sparse OAuth/Telegram users to settings onboarding.
 *
 * @module src/components/profile/ProfileOnboardingRedirect
 */

import { headers } from "next/headers";
import { auth } from "@/auth";
import { enforceMemberTelegramCompliance, enforceProfileOnboarding } from "@/lib/profileOnboardingGate";

/**
 * Runs the profile onboarding gate on every authenticated page render.
 *
 * @returns Null — either no-op or `redirect()` to settings.
 */
export async function ProfileOnboardingRedirect() {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  const pathname = (await headers()).get("x-pathname") ?? "";
  await enforceProfileOnboarding(session.user.id, pathname);
  await enforceMemberTelegramCompliance(session.user.id, pathname);

  return null;
}

export default ProfileOnboardingRedirect;
