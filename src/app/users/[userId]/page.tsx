/**
 * @fileoverview Public member profile page at `/users/[userId]`.
 *
 * @module src/app/users/[userId]/page
 */

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { AuthDomain } from "@shared/domains/AuthDomain";
import { TaskDomain } from "@shared/domains/TaskDomain";
import { canPublishCommunityContent } from "@shared/lib/userSociumHelpers";
import { ProfileHero } from "@/components/profile/ProfileHero";
import { ProfileAboutSection } from "@/components/profile/ProfileAboutSection";
import { ProfilePublishedSection } from "@/components/profile/ProfilePublishedSection";
import { ProfileStatsRow } from "@/components/profile/ProfileStatsRow";
import { ProfileTasksPanel } from "@/components/profile/ProfileTasksPanel";
import { StaticPageShell } from "@/components/ui/StaticPageShell";
import { STATIC_ROUTE_CONTENT_WIDTH } from "@/components/puck/lib/contentWidthTokens";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Route params for the public profile page. */
interface PublicUserPageProps {
  params: Promise<{ userId: string }>;
}

/**
 * Socium affiliations section for redacted public profiles.
 *
 * @param props - Label arrays from {@link PublicProfileUser}.
 * @returns Socium section JSX or null when empty.
 */
function PublicProfileAffiliations({
  sociumRoleLabels,
  socialGroupActivityLabels,
  organizationLabels,
  qualityScores,
}: {
  sociumRoleLabels: string[];
  socialGroupActivityLabels: string[];
  organizationLabels: string[];
  qualityScores: { averageScore: number; ratingCount: number } | null | undefined;
}) {
  const hasContent =
    sociumRoleLabels.length > 0 ||
    socialGroupActivityLabels.length > 0 ||
    organizationLabels.length > 0 ||
    qualityScores != null;

  if (!hasContent) return null;

  return (
    <section className="flex flex-col gap-3">
      {sociumRoleLabels.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Socium roles</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {sociumRoleLabels.map((label) => (
              <span key={label} className="badge badge-group">
                {label}
              </span>
            ))}
          </div>
        </div>
      )}
      {socialGroupActivityLabels.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
            Social group activity
          </h2>
          <ul className="mt-2 flex list-none flex-wrap gap-2 p-0">
            {socialGroupActivityLabels.map((label) => (
              <li key={label} className="badge badge-group">
                {label}
              </li>
            ))}
          </ul>
        </div>
      )}
      {organizationLabels.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Organizations</h2>
          <ul className="mt-2 flex list-none flex-wrap gap-2 p-0">
            {organizationLabels.map((label) => (
              <li key={label} className="badge badge-group">
                {label}
              </li>
            ))}
          </ul>
        </div>
      )}
      {qualityScores && (
        <div className="glass-panel rounded-[var(--radius-md)] p-4 text-sm">
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
            Self-government quality score
          </h2>
          <p className="mt-1 text-[var(--color-text-secondary)]">
            {qualityScores.averageScore}/100 · {qualityScores.ratingCount} rating
            {qualityScores.ratingCount === 1 ? "" : "s"}
          </p>
        </div>
      )}
    </section>
  );
}

/**
 * Authenticated member profile view for browsing other institution users.
 *
 * @param props - Dynamic route params.
 * @returns Public profile page JSX.
 */
export default async function PublicUserProfilePage({ params }: PublicUserPageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { userId } = await params;
  const viewer = await AuthDomain.getUserById(session.user.id);
  if (!viewer) redirect("/login");

  let profile;
  try {
    profile = await AuthDomain.getPublicProfileForViewer(viewer, userId);
  } catch {
    notFound();
  }

  const targetUser = await AuthDomain.getUserById(userId);
  if (!targetUser) notFound();

  const publicUser = AuthDomain.toPublicUser(targetUser);
  const publishedItems = canPublishCommunityContent(publicUser)
    ? await AuthDomain.getPublishedContentForUser(userId)
    : [];
  const openTaskCount = await TaskDomain.countOpenTasksForUser(userId);

  return (
    <StaticPageShell
      contentWidth={STATIC_ROUTE_CONTENT_WIDTH.profile}
      className="items-center p-6"
    >
      <div className="glass-panel flex w-full flex-col gap-4 rounded-[var(--radius-lg)] p-6">
        {profile.isSelf && (
          <div className="flex justify-end">
            <Link href="/profile" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
              Back to my dashboard
            </Link>
          </div>
        )}
        <ProfileHero user={profile} showSettingsLink={profile.isSelf} />
        <ProfileAboutSection about={profile.about} socialLinks={profile.socialLinks} />
        <PublicProfileAffiliations
          sociumRoleLabels={profile.sociumRoleLabels}
          socialGroupActivityLabels={profile.socialGroupActivityLabels}
          organizationLabels={profile.organizationLabels}
          qualityScores={profile.qualityScores}
        />
        {publishedItems.length > 0 && <ProfilePublishedSection items={publishedItems} />}
        <ProfileStatsRow
          stats={[
            { label: "Stars", value: profile.stars },
            { label: "Tasks", value: openTaskCount },
            { label: "Warnings", value: `${profile.warnings}/3` },
            ...(profile.qualityScores
              ? [{ label: "Quality", value: `${profile.qualityScores.averageScore}/100` }]
              : []),
          ]}
        />
        <ProfileTasksPanel userId={userId} readOnly={!profile.isSelf} />
      </div>
    </StaticPageShell>
  );
}
