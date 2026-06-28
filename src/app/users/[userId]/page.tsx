/**
 * @fileoverview Public member profile page at `/users/[ref]` (login or MongoDB id).
 *
 * @module src/app/users/[userId]/page
 */

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { AuthDomain } from "@shared/domains/AuthDomain";
import { TaskDomain } from "@shared/domains/TaskDomain";
import { canPublishCommunityContent } from "@shared/lib/userSociumHelpers";
import {
  buildUserProfileHref,
  isCanonicalUserProfileSegment,
} from "@shared/lib/userProfilePathLogic";
import { ProfileHero } from "@/components/profile/ProfileHero";
import { ProfileAffiliationsSection } from "@/components/profile/ProfileAffiliationsSection";
import { ProfileIdentityBoard } from "@/components/profile/ProfileIdentityBoard";
import { ProfilePublishedSection } from "@/components/profile/ProfilePublishedSection";
import { ProfileStatsRow } from "@/components/profile/ProfileStatsRow";
import { ProfileTasksPanel } from "@/components/profile/ProfileTasksPanel";
import { ProfileActivityColumn } from "@/components/profile/ProfileActivityColumn";
import { StaticPageShell } from "@/components/ui/StaticPageShell";
import { STATIC_ROUTE_CONTENT_WIDTH } from "@/components/puck/lib/contentWidthTokens";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Route params for the public profile page. */
interface PublicUserPageProps {
  params: Promise<{ userId: string }>;
}

/**
 * Authenticated member profile view for browsing other institution users.
 *
 * @param props - Dynamic route params (`userId` accepts login or MongoDB id).
 * @returns Public profile page JSX.
 */
export default async function PublicUserProfilePage({ params }: PublicUserPageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { userId: userRef } = await params;
  const viewer = await AuthDomain.getUserById(session.user.id);
  if (!viewer) redirect("/login");

  const targetUser = await AuthDomain.resolveUserByProfileRef(userRef);
  if (!targetUser) notFound();

  const targetUserId = String(targetUser._id);
  const canonicalProfileHref = buildUserProfileHref({
    id: targetUserId,
    login: targetUser.login,
  });

  if (!isCanonicalUserProfileSegment(userRef, canonicalProfileHref)) {
    redirect(canonicalProfileHref);
  }

  let profile;
  try {
    profile = await AuthDomain.getPublicProfileForViewer(viewer, userRef);
  } catch {
    notFound();
  }

  const publicUser = AuthDomain.toPublicUser(targetUser);
  const publishedItems = canPublishCommunityContent(publicUser)
    ? await AuthDomain.getPublishedContentForUser(targetUserId)
    : [];
  const taskSnapshot = await TaskDomain.getProfileTaskSnapshot(targetUserId);

  return (
    <StaticPageShell
      contentWidth={STATIC_ROUTE_CONTENT_WIDTH.profile}
      className="items-center p-6"
    >
      <div className="glass-panel flex w-full flex-col gap-5 rounded-[var(--radius-lg)] p-6">
        {profile.isSelf && (
          <div className="flex justify-end">
            <Link href="/profile" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
              Back to my dashboard
            </Link>
          </div>
        )}
        <ProfileHero
          user={profile}
          showSettingsLink={profile.isSelf}
          isSelf={profile.isSelf}
          publicProfilePath={canonicalProfileHref}
        />
        <ProfileIdentityBoard
          about={profile.about}
          socialLinks={profile.socialLinks}
          isSelf={profile.isSelf}
          personalInfo={{
            login: profile.login,
            email: profile.email,
            phone: profile.phone,
            username: profile.username,
            linkedGoogle: profile.linkedGoogle,
          }}
        />
        <ProfileAffiliationsSection
          sociumRoles={profile.sociumRoleLabels.map((label) => ({ key: label, label }))}
          activities={profile.socialGroupActivityLabels.map((label) => ({ key: label, label }))}
          organizations={profile.organizationLabels.map((label) => ({ key: label, label }))}
          qualityScores={profile.qualityScores}
        />
        {publishedItems.length > 0 && <ProfilePublishedSection items={publishedItems} />}
        <ProfileStatsRow
          stats={[
            { label: "Stars", value: profile.stars },
            { label: "Tasks", value: taskSnapshot.openCount },
            { label: "Warnings", value: `${profile.warnings}/3` },
            ...(profile.qualityScores
              ? [{ label: "Quality", value: `${profile.qualityScores.averageScore}/100` }]
              : []),
          ]}
        />
        <div className="flex flex-1 flex-col gap-4 lg:flex-row lg:items-start">
          <ProfileTasksPanel
            userId={targetUserId}
            readOnly={!profile.isSelf}
            initialOpenByStatus={taskSnapshot.openByStatus}
          />
          <ProfileActivityColumn
            displayName={profile.fullName}
            snapshot={taskSnapshot}
            isSelf={profile.isSelf}
          />
        </div>
      </div>
    </StaticPageShell>
  );
}
