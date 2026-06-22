/**
 * @fileoverview Task manager list page.
 *
 * @module src/app/tasks/page
 */

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AuthDomain } from "@shared/domains/AuthDomain";
import { AccessControlDomain } from "@shared/domains/AccessControlDomain";
import { buildTaskActor } from "@shared/domains/TaskDomain";
import { canCreateTask, canListTasks } from "@shared/lib/taskAccessLogic";
import { TaskManagerShell } from "@/components/tasks/TaskManagerShell";

/**
 * Paginated task list for dispatchers and performers.
 *
 * @returns Task manager page.
 */
export default async function TasksPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await AuthDomain.getUserById(session.user.id);
  if (!user) redirect("/login");

  const permissions = await AccessControlDomain.resolvePermissionsForUser(user);
  const actor = buildTaskActor(user, permissions);

  if (!canListTasks(actor)) redirect("/profile");

  return <TaskManagerShell canDispatch={canCreateTask(actor)} />;
}
