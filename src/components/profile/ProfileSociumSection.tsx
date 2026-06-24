/**
 * @fileoverview Socium identity section — roles, activities, organizations, scores.
 *
 * @module src/components/profile/ProfileSociumSection
 */

import type { PublicUser } from "@shared/domains/AuthDomain";
import { ProfileAffiliationsSection } from "@/components/profile/ProfileAffiliationsSection";

/** Props for {@link ProfileSociumSection}. */
export interface ProfileSociumSectionProps {
  user: PublicUser;
}

/**
 * Display socium roles, admin-assigned affiliations, and quality scores.
 *
 * @param props - Public user record.
 * @returns Socium section JSX or null when empty.
 */
export function ProfileSociumSection({ user }: ProfileSociumSectionProps) {
  const displayRoles = user.sociumRoles.filter((role) => role.kind !== "student");

  return (
    <ProfileAffiliationsSection
      sociumRoles={displayRoles.map((role) => ({
        key: `${role.roleKey}-${role.bodyKey ?? "global"}`,
        label: role.bodyTitle ? `${role.roleLabel} · ${role.bodyTitle}` : role.roleLabel,
      }))}
      activities={user.socialGroupActivities.map((activity) => ({
        key: activity.activityKey,
        label: activity.activityLabel,
      }))}
      organizations={user.organizations.map((org) => ({
        key: org.organizationKey,
        label: org.organizationLabel,
      }))}
      qualityScores={user.qualityScores}
    />
  );
}

export default ProfileSociumSection;
