/**
 * @fileoverview Personal notification center page.
 *
 * @module src/app/(profile)/profile/notifications/page
 */

import { setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/serverRedirect";
import { auth } from "@/auth";
import { NotificationCenterShell } from "@/components/notifications/NotificationCenterShell";

/**
 * Authenticated notification inbox at `/profile/notifications`.
 *
 * @param props - Locale route params.
 * @returns Notification center shell.
 */
export default async function ProfileNotificationsPage({
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

  return <NotificationCenterShell />;
}
