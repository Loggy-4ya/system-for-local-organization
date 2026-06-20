/**
 * @fileoverview Administration hub — `/admin` landing page.
 *
 * Lists permitted admin workspaces as navigable surface cards.
 *
 * @module src/app/admin/page
 */

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AuthDomain } from "@shared/domains/AuthDomain";
import { AdminHubShell } from "@/components/admin/AdminHubShell";
import { resolveAdminHubAreasForUser } from "@/lib/adminHubAreas";

/**
 * Administration hub — area picker for privileged users.
 *
 * @returns Server-rendered hub or redirect when unauthorised / no areas.
 */
export default async function AdminPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/admin");
  }

  const user = await AuthDomain.getUserById(session.user.id);
  if (!user) {
    redirect("/login");
  }

  const areas = await resolveAdminHubAreasForUser(user);

  if (areas.length === 0) {
    redirect("/profile");
  }

  return <AdminHubShell areas={areas} />;
}
