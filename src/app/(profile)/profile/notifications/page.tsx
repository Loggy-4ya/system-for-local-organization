/**
 * @fileoverview Personal notification center page.
 *
 * @module src/app/(profile)/profile/notifications/page
 */

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { NotificationCenterShell } from "@/components/notifications/NotificationCenterShell";

/**
 * Authenticated notification inbox at `/profile/notifications`.
 *
 * @returns Notification center shell.
 */
export default async function ProfileNotificationsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return <NotificationCenterShell />;
}
