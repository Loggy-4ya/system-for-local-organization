/**
 * @fileoverview Socium identity section — roles, activities, organizations, scores.
 *
 * @module src/components/profile/ProfileSociumSection
 */

import type { PublicUser } from "@shared/domains/AuthDomain";

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
  const hasAffiliations =
    displayRoles.length > 0 ||
    user.socialGroupActivities.length > 0 ||
    user.organizations.length > 0 ||
    user.qualityScores != null;

  if (!hasAffiliations) return null;

  return (
    <section className="flex flex-col gap-3">
      {displayRoles.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Socium roles</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {displayRoles.map((role) => (
              <span key={`${role.roleKey}-${role.bodyKey ?? "global"}`} className="badge badge-group">
                {role.bodyTitle ? `${role.roleLabel} · ${role.bodyTitle}` : role.roleLabel}
              </span>
            ))}
          </div>
        </div>
      )}

      {user.socialGroupActivities.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
            Social group activity
          </h2>
          <ul className="mt-2 flex list-none flex-wrap gap-2 p-0">
            {user.socialGroupActivities.map((activity) => (
              <li key={activity.activityKey} className="badge badge-group">
                {activity.activityLabel}
              </li>
            ))}
          </ul>
        </div>
      )}

      {user.organizations.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Organizations</h2>
          <ul className="mt-2 flex list-none flex-wrap gap-2 p-0">
            {user.organizations.map((org) => (
              <li key={org.organizationKey} className="badge badge-group">
                {org.organizationLabel}
              </li>
            ))}
          </ul>
        </div>
      )}

      {user.qualityScores && (
        <div className="glass-panel rounded-[var(--radius-md)] p-4 text-sm">
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
            Self-government quality score
          </h2>
          <p className="mt-1 text-[var(--color-text-secondary)]">
            {user.qualityScores.averageScore}/100 · {user.qualityScores.ratingCount} rating
            {user.qualityScores.ratingCount === 1 ? "" : "s"}
          </p>
        </div>
      )}
    </section>
  );
}

export default ProfileSociumSection;
