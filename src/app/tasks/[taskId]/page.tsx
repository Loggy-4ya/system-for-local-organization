/**
 * @fileoverview Task detail page.
 *
 * @module src/app/tasks/[taskId]/page
 */

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AuthDomain } from "@shared/domains/AuthDomain";
import { AccessControlDomain } from "@shared/domains/AccessControlDomain";
import { buildTaskActor } from "@shared/domains/TaskDomain";
import { canCreateTask } from "@shared/lib/taskAccessLogic";
import { TaskDetailShell } from "@/components/tasks/TaskDetailShell";

/** Route params. */
interface TaskDetailPageProps {
  params: Promise<{ taskId: string }>;
}

/**
 * Task detail route for authors, performers, and dispatchers.
 *
 * @param props - Dynamic task id param.
 * @returns Task detail page.
 */
export default async function TaskDetailPage({ params }: TaskDetailPageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await AuthDomain.getUserById(session.user.id);
  if (!user) redirect("/login");

  const permissions = await AccessControlDomain.resolvePermissionsForUser(user);
  const actor = buildTaskActor(user, permissions);
  const { taskId } = await params;

  return (
    <TaskDetailShell
      taskId={taskId}
      viewerUserId={actor.userId}
      canDispatch={canCreateTask(actor)}
    />
  );
}
