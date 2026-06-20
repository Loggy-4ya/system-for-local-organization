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
    sociumRoles: user.sociumRoles,
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
          Self-government members must keep contact details up to date. Please fill in:
          {" "}
          {summary.missingFieldLabels.join(", ")}.
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
          Your profile is ready for a self-government membership application. Phone and academic
          details are on file.
        </p>
      </section>
    );
  }

  return (
    <section className="glass-panel rounded-[var(--radius-md)] p-4">
      <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
        Before applying for self-government membership
      </h2>
      <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
        Complete the following in your profile — phone number is especially important for members:
      </p>
      <ul className="mt-2 list-disc pl-5 text-sm text-[var(--color-text-secondary)]">
        {summary.missingFields.map((field) => (
          <li key={field}>{PROFILE_FIELD_LABELS[field]}</li>
        ))}
      </ul>
      {!user.phone && (
        <p className="mt-2 text-xs text-[var(--color-text-secondary)]">
          Phone is optional for regular students but strongly recommended for council coordination.
        </p>
      )}
      <Link
        href="/profile/settings"
        className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-3 inline-flex")}
      >
        Complete profile
      </Link>
    </section>
  );
}

export default ProfileMembershipReadiness;
