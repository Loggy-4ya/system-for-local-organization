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
  SELF_GOVERNMENT_APPLICATION_REQUIREMENTS_HINT,
  SELF_GOVERNMENT_APPLICATION_TELEGRAM_ADVISORY,
  SELF_GOVERNMENT_MEMBER_PROFILE_HINT,
} from "@shared/lib/userProfileCompleteness";
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
  const summary = buildProfileCompletenessSummary({
    name: user.name,
    surname: user.surname,
    phone: user.phone,
    specialty: user.specialty,
    group: user.group,
    avatar: user.avatar,
    sociumRoles: user.sociumRoles,
    selfGovernmentApplicationIntent: user.selfGovernmentApplicationIntent,
    telegramId: user.telegramId,
  });

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
          {SELF_GOVERNMENT_MEMBER_PROFILE_HINT}
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
          Your profile includes all fields required for a self-government membership application.
          {user.selfGovernmentApplicationIntent
            ? " Your application is pending reviewer approval."
            : " Submit your application when you are ready."}
        </p>
        <p className="mt-2 text-xs text-[var(--color-text-secondary)]">
          {SELF_GOVERNMENT_APPLICATION_TELEGRAM_ADVISORY}
        </p>
        <Link
          href="/profile/membership"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-3 inline-flex")}
        >
          {user.selfGovernmentApplicationIntent ? "View application" : "Apply for membership"}
        </Link>
      </section>
    );
  }

  return (
    <section className="glass-panel rounded-[var(--radius-md)] p-4">
      <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
        Before applying for self-government membership
      </h2>
      <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
        {SELF_GOVERNMENT_APPLICATION_REQUIREMENTS_HINT}
      </p>
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
