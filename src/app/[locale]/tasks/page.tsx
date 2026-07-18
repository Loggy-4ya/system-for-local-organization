/**
 * @fileoverview Task manager list page.
 *
 * @module src/app/tasks/page
 */

import { setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/serverRedirect";
import { auth } from "@/auth";
import { AuthDomain } from "@shared/domains/AuthDomain";
import { AccessControlDomain } from "@shared/domains/AccessControlDomain";
import { buildTaskActor } from "@shared/domains/TaskDomain";
import { canCreateTask, canListTasks } from "@shared/lib/taskAccessLogic";
import { TaskManagerShell } from "@/components/tasks/TaskManagerShell";

/**
 * Paginated task list for dispatchers and performers.
 *
 * @param props - Locale route params.
 * @returns Task manager page.
 */
export default async function TasksPage({
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

  if (!canListTasks(actor)) await redirect("/profile");

  return <TaskManagerShell canDispatch={canCreateTask(actor)} />;
}
