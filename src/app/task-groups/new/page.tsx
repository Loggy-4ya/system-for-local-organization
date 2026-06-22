/**
 * @fileoverview Task group creation page.
 *
 * @module src/app/task-groups/new/page
 */

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AuthDomain } from "@shared/domains/AuthDomain";
import { AccessControlDomain } from "@shared/domains/AccessControlDomain";
import { buildTaskActor } from "@shared/domains/TaskDomain";
import { canCreateTaskGroup } from "@shared/lib/taskGroupAccessLogic";
import { TaskGroupCreateForm } from "@/components/tasks/TaskGroupCreateForm";

/**
 * New task group compose route — requires task dispatch authority.
 *
 * @returns Task group create form page.
 */
export default async function NewTaskGroupPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await AuthDomain.getUserById(session.user.id);
  if (!user) redirect("/login");

  const permissions = await AccessControlDomain.resolvePermissionsForUser(user);
  const actor = buildTaskActor(user, permissions);

  if (!canCreateTaskGroup(actor)) redirect("/task-groups");

  return <TaskGroupCreateForm />;
}
