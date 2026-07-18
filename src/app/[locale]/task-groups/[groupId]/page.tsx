/**
 * @fileoverview Task group detail page.
 *
 * @module src/app/task-groups/[groupId]/page
 */

import { setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/serverRedirect";
import { auth } from "@/auth";
import { AuthDomain } from "@shared/domains/AuthDomain";
import { AccessControlDomain } from "@shared/domains/AccessControlDomain";
import { buildTaskActor } from "@shared/domains/TaskDomain";
import { canCreateTask } from "@shared/lib/taskAccessLogic";
import { TaskGroupDetailShell } from "@/components/tasks/TaskGroupDetailShell";

/** Route params for group detail. */
interface PageProps {
  params: Promise<{ locale: string; groupId: string }>;
}

/**
 * Task group detail with child task list.
 *
 * @param props - Route params.
 * @returns Group detail page.
 */
export default async function TaskGroupDetailPage({ params }: PageProps) {
  const { locale, groupId } = await params;
  setRequestLocale(locale);

  const session = await auth();
  if (!session?.user?.id) {
    return await redirect("/login");
  }

  const user = await AuthDomain.getUserById(session.user.id);
  if (!user) {
    return await redirect("/login");
  }

  const permissions = await AccessControlDomain.resolvePermissionsForUser(user);
  const actor = buildTaskActor(user, permissions);

  return (
    <TaskGroupDetailShell groupId={groupId} canDispatch={canCreateTask(actor)} />
  );
}
