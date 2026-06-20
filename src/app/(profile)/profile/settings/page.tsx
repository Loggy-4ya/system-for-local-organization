/**
 * @fileoverview Profile settings page for editing user information.
 *
 * Supports `?onboarding=1` for first-time OAuth / Telegram profile completion.
 *
 * @module src/app/(profile)/profile/settings/page
 */

import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AuthDomain } from "@shared/domains/AuthDomain";
import { userNeedsProfileOnboarding } from "@shared/lib/userProfileCompleteness";
import { ProfileSettingsForm } from "@/components/profile/ProfileSettingsForm";
import { AccentScope } from "@/components/profile/AccentScope";
import { StaticPageShell } from "@/components/ui/StaticPageShell";
import { STATIC_ROUTE_CONTENT_WIDTH } from "@/components/puck/lib/contentWidthTokens";
import {
  getOAuthOnboardingGaps,
  OAUTH_ONBOARDING_EXTRA_LABELS,
  PROFILE_FIELD_LABELS,
} from "@shared/lib/userProfileCompleteness";

/** Props for the settings page (Next.js `searchParams`). */
interface ProfileSettingsPageProps {
  searchParams: Promise<{ onboarding?: string }>;
}

/**
 * Editable profile settings page at `/profile/settings`.
 *
 * @param props - Route search params.
 * @returns Settings page with form pre-filled from session user.
 */
export default async function ProfileSettingsPage({ searchParams }: ProfileSettingsPageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await AuthDomain.getUserById(session.user.id);
  if (!user) redirect("/login");

  const publicUser = AuthDomain.toPublicUser(user);
  const params = await searchParams;
  const onboardingMode =
    params.onboarding === "1" || userNeedsProfileOnboarding(user);

  const onboardingGaps = onboardingMode ? getOAuthOnboardingGaps(publicUser) : [];

  return (
    <AccentScope family={publicUser.accentFamily} shade={publicUser.accentShade}>
      <StaticPageShell
        contentWidth={STATIC_ROUTE_CONTENT_WIDTH.profile}
        className="items-center p-6"
      >
        <div className="glass-panel w-full rounded-[var(--radius-lg)] p-6 md:p-8">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-[var(--color-text-primary)]">
                {onboardingMode ? "Complete your profile" : "Profile settings"}
              </h1>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                {onboardingMode
                  ? "Finish the required details below to use Nexus after signing in with Google, Apple, or Telegram."
                  : "Update your personal information and preferences."}
              </p>
            </div>
            {!onboardingMode && (
              <Link
                href="/profile"
                className="text-sm text-[var(--color-accent-user)] no-underline hover:underline"
              >
                ← Back to profile
              </Link>
            )}
          </div>

          {onboardingMode && onboardingGaps.length > 0 && (
            <section className="mb-6 rounded-[var(--radius-md)] border border-primary/30 bg-primary/5 p-4">
              <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
                Required before you continue
              </h2>
              <ul className="mt-2 list-disc pl-5 text-sm text-[var(--color-text-secondary)]">
                {onboardingGaps.map((field) => (
                  <li key={field}>
                    {field === "personalDataConsent"
                      ? OAUTH_ONBOARDING_EXTRA_LABELS.personalDataConsent
                      : PROFILE_FIELD_LABELS[field]}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <ProfileSettingsForm user={publicUser} onboardingMode={onboardingMode} />
        </div>
      </StaticPageShell>
    </AccentScope>
  );
}
