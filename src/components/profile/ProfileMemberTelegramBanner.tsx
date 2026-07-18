/**
 * @fileoverview Site-wide reminder for self-government members missing Telegram linkage.
 *
 * @module src/components/profile/ProfileMemberTelegramBanner
 */

import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { AuthDomain } from "@shared/domains/AuthDomain";
import {
  memberNeedsTelegramLinkage,
  SELF_GOVERNMENT_MEMBER_TELEGRAM_REQUIRED_HINT,
} from "@shared/lib/userProfileCompleteness";
import { MEMBER_TELEGRAM_ONBOARDING_SETTINGS_PATH } from "@/lib/profileOnboardingGate";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Persistent banner when an active member has not linked Telegram yet.
 *
 * @returns Banner JSX or null when not applicable.
 */
export async function ProfileMemberTelegramBanner() {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  const user = await AuthDomain.getUserById(session.user.id);
  if (!user || !memberNeedsTelegramLinkage(user)) {
    return null;
  }

  const t = await getTranslations("profile.telegramBanner");

  return (
    <div
      className="border-b border-[var(--color-accent-warning,#f59e0b)]/40 bg-[var(--color-bg-panel)] px-4 py-3"
      role="status"
    >
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[var(--color-text-primary)]">
          {SELF_GOVERNMENT_MEMBER_TELEGRAM_REQUIRED_HINT}
        </p>
        <Link
          href={MEMBER_TELEGRAM_ONBOARDING_SETTINGS_PATH}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "shrink-0")}
        >
          {t("connect")}
        </Link>
      </div>
    </div>
  );
}

export default ProfileMemberTelegramBanner;
