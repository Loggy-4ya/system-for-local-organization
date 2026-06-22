/**
 * @fileoverview Task group list page.
 *
 * @module src/app/task-groups/page
 */

import { redirect } from "next/navigation";
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
 * @returns Task group manager page.
 */
export default async function TaskGroupsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await AuthDomain.getUserById(session.user.id);
  if (!user) redirect("/login");

  const permissions = await AccessControlDomain.resolvePermissionsForUser(user);
  const actor = buildTaskActor(user, permissions);

  if (!canListTaskGroups(actor)) redirect("/profile");

  return <TaskGroupManagerShell canDispatch={canCreateTask(actor)} />;
}
