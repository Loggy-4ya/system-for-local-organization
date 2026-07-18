/**
 * @fileoverview Task group list page.
 *
 * @module src/app/task-groups/page
 */

import { setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/serverRedirect";
import { auth } from "@/auth";
import { AuthDomain } from "@shared/domains/AuthDomain";
import { AccessControlDomain } from "@shared/domains/AccessControlDomain";
import { buildTaskActor } from "@shared/domains/TaskDomain";
import { canCreateTask } from "@shared/lib/taskAccessLogic";
import { canListTaskGroups } from "@shared/lib/taskGroupAccessLogic";
import { TaskGroupManagerShell } from "@/components/tasks/TaskGroupManagerShell";

/**
 * Paginated task group list for dispatchers and involved performers.
 *
 * @param props - Locale route params.
 * @returns Task group manager page.
 */
export default async function TaskGroupsPage({
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

  const user = await AuthDomain.getUserById(session.user.id);
  if (!user) {
    return await redirect("/login");
  }

  const permissions = await AccessControlDomain.resolvePermissionsForUser(user);
  const actor = buildTaskActor(user, permissions);

  if (!canListTaskGroups(actor)) await redirect("/profile");

  return <TaskGroupManagerShell canDispatch={canCreateTask(actor)} />;
}
