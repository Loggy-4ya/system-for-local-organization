/**
 * @fileoverview Socium affiliations panel — roles, activities, organizations, quality score.
 *
 * @module src/components/profile/ProfileAffiliationsSection
 */

import type { IUserQualityScores } from "@shared/models/userTypes";
import { ProfileBadge } from "@/components/profile/ProfileBadge";

/** Single labeled affiliation chip. */
export interface ProfileAffiliationChip {
  /** Stable React key. */
  key: string;
  /** Display label. */
  label: string;
}

/** Props for {@link ProfileAffiliationsSection}. */
export interface ProfileAffiliationsSectionProps {
  sociumRoles: ProfileAffiliationChip[];
  activities: ProfileAffiliationChip[];
  organizations: ProfileAffiliationChip[];
  qualityScores?: IUserQualityScores | null;
}

/**
 * Display socium roles, admin-assigned affiliations, and quality scores with typed badges.
 *
 * @param props - Affiliation chip groups.
 * @returns Affiliations section JSX or null when empty.
 */
export function ProfileAffiliationsSection({
  sociumRoles,
  activities,
  organizations,
  qualityScores,
}: ProfileAffiliationsSectionProps) {
  const hasContent =
    sociumRoles.length > 0 ||
    activities.length > 0 ||
    organizations.length > 0 ||
    qualityScores != null;

  if (!hasContent) return null;

  return (
    <section className="glass-panel flex flex-col gap-4 rounded-[var(--radius-md)] p-4">
      <header>
        <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Affiliations</h2>
        <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">
          Socium roles, activities, and organizations inside the institution
        </p>
      </header>

      {sociumRoles.length > 0 && (
        <div>
          <h3 className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-secondary)]">
            Socium roles
          </h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {sociumRoles.map((role) => (
              <ProfileBadge key={role.key} kind="socium_role">
                {role.label}
              </ProfileBadge>
            ))}
          </div>
        </div>
      )}

      {activities.length > 0 && (
        <div>
          <h3 className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-secondary)]">
            Social group activity
          </h3>
          <ul className="mt-2 flex list-none flex-wrap gap-2 p-0">
            {activities.map((activity) => (
              <li key={activity.key}>
                <ProfileBadge kind="activity">{activity.label}</ProfileBadge>
              </li>
            ))}
          </ul>
        </div>
      )}

      {organizations.length > 0 && (
        <div>
          <h3 className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-secondary)]">
            Organizations
          </h3>
          <ul className="mt-2 flex list-none flex-wrap gap-2 p-0">
            {organizations.map((org) => (
              <li key={org.key}>
                <ProfileBadge kind="organization">{org.label}</ProfileBadge>
              </li>
            ))}
          </ul>
        </div>
      )}

      {qualityScores && (
        <div className="rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-elevated)] p-4 text-sm">
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
            Self-government quality score
          </h3>
          <p className="mt-1 text-[var(--color-text-secondary)]">
            {qualityScores.averageScore}/100 · {qualityScores.ratingCount} rating
            {qualityScores.ratingCount === 1 ? "" : "s"}
          </p>
        </div>
      )}
    </section>
  );
}

export default ProfileAffiliationsSection;
