/**
 * @fileoverview Membership application page route.
 *
 * @module src/app/(profile)/profile/membership/page
 */

import { setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/serverRedirect";
import { auth } from "@/auth";
import { ProfileMembershipApplicationShell } from "@/components/profile/ProfileMembershipApplicationShell";

/**
 * Self-government membership application surface.
 *
 * @param props - Locale route params.
 * @returns Application workflow page.
 */
export default async function ProfileMembershipPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();
  if (!session?.user?.id) {
    return await redirect("/login");
  }

  return <ProfileMembershipApplicationShell />;
}
