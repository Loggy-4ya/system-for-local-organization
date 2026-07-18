/**
 * @fileoverview Profile membership readiness banner on the profile dashboard.
 *
 * @module src/components/profile/ProfileMembershipReadiness
 */

import { getTranslations } from "next-intl/server";
import type { PublicUser } from "@shared/domains/AuthDomain";
import {
  buildProfileCompletenessSummary,
  shouldShowMembershipReadinessBanner,
} from "@shared/lib/userProfileCompleteness";
import { isTeacherUser } from "@shared/lib/userSociumHelpers";
import {
  memberProfileMaintenanceCopy,
  membershipApplicationRequirementsCopy,
  missingProfileFieldsInlineCopy,
  translateProfileCompletenessField,
} from "@/lib/profileCompletenessCopy";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Props for {@link ProfileMembershipReadiness}. */
export interface ProfileMembershipReadinessProps {
  user: PublicUser;
}

/**
 * Surface missing profile fields before self-government membership application.
 *
 * @param props - Public user record.
 * @returns Readiness panel JSX or null when complete and already a member.
 */
export async function ProfileMembershipReadiness({ user }: ProfileMembershipReadinessProps) {
  if (!shouldShowMembershipReadinessBanner(user.accessLevelIndex)) {
    return null;
  }

  const t = await getTranslations("profile.membershipReadiness");
  const tComplete = await getTranslations("profile.completeness");

  const profileSlice = {
    name: user.name,
    surname: user.surname,
    phone: user.phone,
    specialty: user.specialty,
    group: user.group,
    avatar: user.avatar,
    sociumRoles: user.sociumRoles,
    selfGovernmentApplicationIntent: user.selfGovernmentApplicationIntent,
    telegramId: user.telegramId,
    teacherAccessApproved: user.teacherAccessApproved,
  };

  const summary = buildProfileCompletenessSummary(profileSlice);
  const isTeacher = isTeacherUser(user.sociumRoles);
  const requirementsHint = membershipApplicationRequirementsCopy(tComplete, profileSlice);

  if (isTeacher && summary.teacherAccessApproved) {
    return null;
  }

  if (summary.isSelfGovernmentMember && summary.readyForMembershipApplication) {
    return null;
  }

  if (summary.isSelfGovernmentMember && !summary.readyForMembershipApplication) {
    return (
      <section className="glass-panel rounded-[var(--radius-md)] border border-[var(--color-accent-user)]/40 p-4">
        <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
          {t("completeMemberTitle")}
        </h2>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          {memberProfileMaintenanceCopy(tComplete, profileSlice)}
        </p>
        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
          {t("stillMissing")}{" "}
          {missingProfileFieldsInlineCopy(tComplete, summary.missingFields)}.
        </p>
        <Link
          href="/profile/settings"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-3 inline-flex")}
        >
          {t("updateProfile")}
        </Link>
      </section>
    );
  }

  if (summary.readyForMembershipApplication) {
    return (
      <section className="glass-panel rounded-[var(--radius-md)] p-4 text-sm text-[var(--color-text-secondary)]">
        <p>
          {isTeacher ? t("teacherReady") : t("memberReady")}
          {user.selfGovernmentApplicationIntent
            ? t("pendingApproval")
            : isTeacher
              ? t("submitWhenReadyTeacher")
              : t("submitWhenReadyMember")}
        </p>
        <p className="mt-2 text-xs text-[var(--color-text-secondary)]">
          {tComplete("telegramAdvisory")}
        </p>
        <Link
          href="/profile/membership"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-3 inline-flex")}
        >
          {user.selfGovernmentApplicationIntent
            ? t("viewApplication")
            : isTeacher
              ? t("applyTeacher")
              : t("applyMembership")}
        </Link>
      </section>
    );
  }

  return (
    <section className="glass-panel rounded-[var(--radius-md)] p-4">
      <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
        {isTeacher ? t("beforeTeacher") : t("beforeMembership")}
      </h2>
      <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{requirementsHint}</p>
      <ul className="mt-2 list-disc pl-5 text-sm text-[var(--color-text-secondary)]">
        {summary.missingFields.map((field) => (
          <li key={field}>{translateProfileCompletenessField(tComplete, field)}</li>
        ))}
      </ul>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          href="/profile/settings"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "inline-flex")}
        >
          {t("completeProfile")}
        </Link>
        <Link
          href="/profile/membership"
          className={cn(buttonVariants({ size: "sm" }), "inline-flex")}
        >
          {t("membershipApplication")}
        </Link>
      </div>
    </section>
  );
}

export default ProfileMembershipReadiness;
