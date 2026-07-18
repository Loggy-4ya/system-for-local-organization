/**
 * @fileoverview Profile settings page for editing user information.
 *
 * Supports `?onboarding=1` for first-time OAuth / Telegram profile completion and
 * `?onboarding=member-telegram` when a self-government member must link Telegram.
 *
 * @module src/app/(profile)/profile/settings/page
 */

import { setRequestLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/serverRedirect";
import { Link } from "@/i18n/navigation";
import { auth } from "@/auth";
import { AuthDomain } from "@shared/domains/AuthDomain";
import {
  membershipApplicationRequirementsCopy,
  missingProfileFieldsInlineCopy,
  translateOnboardingExtraField,
  translateProfileCompletenessField,
} from "@/lib/profileCompletenessCopy";
import {
  getOAuthOnboardingGaps,
  memberNeedsTelegramLinkage,
  userNeedsProfileOnboarding,
  userNeedsTeacherAccessGate,
} from "@shared/lib/userProfileCompleteness";
import { ProfileSettingsForm } from "@/components/profile/ProfileSettingsForm";
import { StaticPageShell } from "@/components/ui/StaticPageShell";
import { STATIC_ROUTE_CONTENT_WIDTH } from "@/components/puck/lib/contentWidthTokens";

/** Props for the settings page (Next.js route params). */
interface ProfileSettingsPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ onboarding?: string }>;
}

/**
 * Editable profile settings page at `/profile/settings`.
 *
 * @param props - Route params and search params.
 * @returns Settings page with form pre-filled from session user.
 */
export default async function ProfileSettingsPage({
  params,
  searchParams,
}: ProfileSettingsPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("profile.settingsPage");
  const tComplete = await getTranslations("profile.completeness");

  const session = await auth();
  if (!session?.user?.id) {
    return await redirect("/login");
  }

  const user = await AuthDomain.getUserById(session.user.id);
  if (!user) {
    return await redirect("/login");
  }

  const publicUser = AuthDomain.toPublicUser(user);
  const routeSearchParams = await searchParams;
  const memberTelegramOnboardingMode = memberNeedsTelegramLinkage(user);
  const forcedMemberTelegramFlow =
    routeSearchParams.onboarding === "member-telegram" && memberNeedsTelegramLinkage(user);
  const teacherOnboardingMode =
    routeSearchParams.onboarding === "teacher" && userNeedsTeacherAccessGate(publicUser);
  const onboardingMode =
    routeSearchParams.onboarding === "1" || userNeedsProfileOnboarding(user) || teacherOnboardingMode;

  const onboardingGaps = onboardingMode ? getOAuthOnboardingGaps(publicUser) : [];

  const pageTitle = forcedMemberTelegramFlow && !publicUser.telegramId
    ? t("memberTelegramTitle")
    : onboardingMode
      ? t("onboardingTitle")
      : t("title");

  const pageSubtitle = forcedMemberTelegramFlow && !publicUser.telegramId
    ? t("subtitleMemberTelegram")
    : teacherOnboardingMode
      ? t("subtitleTeacher")
      : onboardingMode
        ? t("subtitleOnboarding")
        : t("subtitleDefault");

  return (
    <StaticPageShell
      contentWidth={STATIC_ROUTE_CONTENT_WIDTH.profile}
      className="items-center p-6"
    >
      <div className="glass-panel w-full rounded-[var(--radius-lg)] p-6 md:p-8">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-[var(--color-text-primary)]">
                {pageTitle}
              </h1>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{pageSubtitle}</p>
            </div>
            {!onboardingMode && !forcedMemberTelegramFlow && (
              <Link
                href="/profile"
                className="text-sm text-[var(--color-text-primary)] no-underline hover:underline"
              >
                {t("backToProfile")}
              </Link>
            )}
          </div>

          {onboardingMode && onboardingGaps.length > 0 && (
            <section className="mb-6 rounded-[var(--radius-md)] border border-primary/30 bg-primary/5 p-4">
              <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
                {t("requiredBeforeContinue")}
              </h2>
              <ul className="mt-2 list-disc pl-5 text-sm text-[var(--color-text-secondary)]">
                {onboardingGaps.map((field) => (
                  <li key={field}>
                    {field === "personalDataConsent"
                      ? translateOnboardingExtraField(tComplete, field)
                      : translateProfileCompletenessField(tComplete, field)}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <ProfileSettingsForm
            user={publicUser}
            onboardingMode={onboardingMode}
            teacherOnboardingMode={teacherOnboardingMode}
            memberTelegramOnboardingMode={memberTelegramOnboardingMode}
          />
        </div>
      </StaticPageShell>
  );
}
