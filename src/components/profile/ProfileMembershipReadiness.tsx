/**
 * @fileoverview Membership profile readiness banner on the profile dashboard.
 *
 * @module src/components/profile/ProfileMembershipReadiness
 */

import Link from "next/link";
import type { PublicUser } from "@shared/domains/AuthDomain";
import {
  buildProfileCompletenessSummary,
  PROFILE_FIELD_LABELS,
  resolveMembershipApplicationRequirementsHint,
  resolveSelfGovernmentMemberProfileHint,
  shouldShowMembershipReadinessBanner,
  SELF_GOVERNMENT_APPLICATION_TELEGRAM_ADVISORY,
} from "@shared/lib/userProfileCompleteness";
import { isTeacherUser } from "@shared/lib/userSociumHelpers";
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
export function ProfileMembershipReadiness({ user }: ProfileMembershipReadinessProps) {
  if (!shouldShowMembershipReadinessBanner(user.accessLevelIndex)) {
    return null;
  }

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
  const requirementsHint = resolveMembershipApplicationRequirementsHint(profileSlice);

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
          Complete your member profile
        </h2>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          {resolveSelfGovernmentMemberProfileHint(profileSlice)}
        </p>
        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
          Still missing: {summary.missingFieldLabels.join(", ")}.
        </p>
        <Link
          href="/profile/settings"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-3 inline-flex")}
        >
          Update profile
        </Link>
      </section>
    );
  }

  if (summary.readyForMembershipApplication) {
    return (
      <section className="glass-panel rounded-[var(--radius-md)] p-4 text-sm text-[var(--color-text-secondary)]">
        <p>
          {isTeacher
            ? "Your teacher profile is ready for submission."
            : "Your profile includes all fields required for a self-government membership application."}
          {user.selfGovernmentApplicationIntent
            ? " Your application is pending reviewer approval."
            : isTeacher
              ? " Submit your access application when you are ready."
              : " Submit your application when you are ready."}
        </p>
        <p className="mt-2 text-xs text-[var(--color-text-secondary)]">
          {SELF_GOVERNMENT_APPLICATION_TELEGRAM_ADVISORY}
        </p>
        <Link
          href="/profile/membership"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-3 inline-flex")}
        >
          {user.selfGovernmentApplicationIntent ? "View application" : isTeacher ? "Apply for access" : "Apply for membership"}
        </Link>
      </section>
    );
  }

  return (
    <section className="glass-panel rounded-[var(--radius-md)] p-4">
      <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
        {isTeacher ? "Before applying for teacher access" : "Before applying for self-government membership"}
      </h2>
      <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{requirementsHint}</p>
      <ul className="mt-2 list-disc pl-5 text-sm text-[var(--color-text-secondary)]">
        {summary.missingFields.map((field) => (
          <li key={field}>{PROFILE_FIELD_LABELS[field]}</li>
        ))}
      </ul>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          href="/profile/settings"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "inline-flex")}
        >
          Complete profile
        </Link>
        <Link
          href="/profile/membership"
          className={cn(buttonVariants({ size: "sm" }), "inline-flex")}
        >
          Membership application
        </Link>
      </div>
    </section>
  );
}

export default ProfileMembershipReadiness;
