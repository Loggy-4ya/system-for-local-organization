/**
 * @fileoverview Administration hub — `/admin` landing page.
 *
 * @module src/app/[locale]/admin/page
 */

import { setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/serverRedirect";
import { auth } from "@/auth";
import { AuthDomain } from "@shared/domains/AuthDomain";
import { AdminHubShell } from "@/components/admin/AdminHubShell";
import { resolveAdminHubAreasForUser } from "@/lib/adminHubAreas";

/**
 * Administration hub — area picker for privileged users.
 *
 * @param props - Route params promise with locale segment.
 * @returns Server-rendered hub or redirect when unauthorised / no areas.
 */
export default async function AdminPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();

  if (!session?.user?.id) {
    return await redirect("/login?callbackUrl=/admin");
  }

  const user = await AuthDomain.getUserById(session.user.id);
  if (!user) {
    return await redirect("/login");
  }

  const areas = await resolveAdminHubAreasForUser(user);

  if (areas.length === 0) {
    return await redirect("/profile");
  }

  return <AdminHubShell areas={areas} />;
}
