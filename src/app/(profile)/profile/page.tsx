/**
 * @fileoverview Read-only user profile dashboard page.
 *
 * @module src/app/(profile)/profile/page
 */

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AuthDomain } from "@shared/domains/AuthDomain";
import { canPublishCommunityContent } from "@shared/lib/userSociumHelpers";
import { ProfileHero } from "@/components/profile/ProfileHero";
import { ProfileStatsRow } from "@/components/profile/ProfileStatsRow";
import { ProfileTasksPanel } from "@/components/profile/ProfileTasksPanel";
import { ProfileActivityColumn } from "@/components/profile/ProfileActivityColumn";
import { ProfileAboutSection } from "@/components/profile/ProfileAboutSection";
import { ProfileMembershipReadiness } from "@/components/profile/ProfileMembershipReadiness";
import { ProfileSociumSection } from "@/components/profile/ProfileSociumSection";
import { ProfilePublishedSection } from "@/components/profile/ProfilePublishedSection";
import { AccentScope } from "@/components/profile/AccentScope";
import { StaticPageShell } from "@/components/ui/StaticPageShell";
import { STATIC_ROUTE_CONTENT_WIDTH } from "@/components/puck/lib/contentWidthTokens";

/**
 * User profile dashboard matching Figma Profile/User frame `59:47`.
 *
 * @returns Profile page with live user data and placeholder task content.
 */
export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await AuthDomain.getUserById(session.user.id);
  if (!user) redirect("/login");

  const publicUser = AuthDomain.toPublicUser(user);
  const publishedItems = canPublishCommunityContent(publicUser)
    ? await AuthDomain.getPublishedContentForUser(publicUser.id)
    : [];

  return (
    <AccentScope family={publicUser.accentFamily} shade={publicUser.accentShade}>
      <StaticPageShell
        contentWidth={STATIC_ROUTE_CONTENT_WIDTH.profile}
        className="items-center p-6"
      >
        <div className="glass-panel flex w-full flex-col gap-4 rounded-[var(--radius-lg)] p-6">
          <ProfileHero user={publicUser} />
          <ProfileMembershipReadiness user={publicUser} />
          <ProfileAboutSection user={publicUser} />
          <ProfileSociumSection user={publicUser} />
          {publishedItems.length > 0 && <ProfilePublishedSection items={publishedItems} />}
          <ProfileStatsRow
            stats={[
              { label: "Stars", value: publicUser.stars },
              { label: "Tasks", value: 18 },
              { label: "Warnings", value: `${publicUser.warnings}/3` },
              ...(publicUser.qualityScores
                ? [{ label: "Quality", value: `${publicUser.qualityScores.averageScore}/100` }]
                : []),
            ]}
          />
          <div className="flex flex-1 flex-col gap-4 md:flex-row">
            <ProfileTasksPanel />
            <ProfileActivityColumn
              accentFamily={publicUser.accentFamily}
              accentShade={publicUser.accentShade}
            />
          </div>
        </div>
      </StaticPageShell>
    </AccentScope>
  );
}
