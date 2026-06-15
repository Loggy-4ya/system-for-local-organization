/**
 * @fileoverview Profile settings page for editing user information.
 *
 * @module src/app/(profile)/profile/settings/page
 */

import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AuthDomain } from "@shared/domains/AuthDomain";
import { ProfileSettingsForm } from "@/components/profile/ProfileSettingsForm";
import { AccentScope } from "@/components/profile/AccentScope";
import { StaticPageShell } from "@/components/ui/StaticPageShell";
import { STATIC_ROUTE_CONTENT_WIDTH } from "@/components/puck/lib/contentWidthTokens";

/**
 * Editable profile settings page at `/profile/settings`.
 *
 * @returns Settings page with form pre-filled from session user.
 */
export default async function ProfileSettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await AuthDomain.getUserById(session.user.id);
  if (!user) redirect("/login");

  const publicUser = AuthDomain.toPublicUser(user);

  return (
    <AccentScope family={publicUser.accentFamily} shade={publicUser.accentShade}>
      <StaticPageShell
        contentWidth={STATIC_ROUTE_CONTENT_WIDTH.profile}
        className="items-center p-6"
      >
        <div className="glass-panel w-full rounded-[var(--radius-lg)] p-6 md:p-8">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-[var(--color-text-primary)]">
                Profile settings
              </h1>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                Update your personal information and preferences.
              </p>
            </div>
            <Link
              href="/profile"
              className="text-sm text-[var(--color-accent-user)] no-underline hover:underline"
            >
              ← Back to profile
            </Link>
          </div>
          <ProfileSettingsForm user={publicUser} />
        </div>
      </StaticPageShell>
    </AccentScope>
  );
}
