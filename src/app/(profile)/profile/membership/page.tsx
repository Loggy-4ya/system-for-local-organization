/**
 * @fileoverview Membership application page route.
 *
 * @module src/app/(profile)/profile/membership/page
 */

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ProfileMembershipApplicationShell } from "@/components/profile/ProfileMembershipApplicationShell";

/**
 * Self-government membership application surface.
 *
 * @returns Application workflow page.
 */
export default async function ProfileMembershipPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/profile/membership");
  }

  return <ProfileMembershipApplicationShell />;
}
