/**
 * @fileoverview Task creation page for self-government administrators.
 *
 * @module src/app/tasks/new/page
 */

import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AuthDomain } from "@shared/domains/AuthDomain";
import { AccessControlDomain } from "@shared/domains/AccessControlDomain";
import { buildTaskActor } from "@shared/domains/TaskDomain";
import { canCreateTask } from "@shared/lib/taskAccessLogic";
import { TaskCreateForm } from "@/components/tasks/TaskCreateForm";

/**
 * New task compose route — requires `tasks.dispatch`.
 *
 * @returns Task create form page.
 */
export default async function NewTaskPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await AuthDomain.getUserById(session.user.id);
  if (!user) redirect("/login");

  const permissions = await AccessControlDomain.resolvePermissionsForUser(user);
  const actor = buildTaskActor(user, permissions);

  if (!canCreateTask(actor)) redirect("/tasks");

  return (
    <Suspense fallback={null}>
      <TaskCreateForm />
    </Suspense>
  );
}
