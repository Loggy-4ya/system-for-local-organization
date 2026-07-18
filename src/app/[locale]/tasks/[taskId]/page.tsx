/**
 * @fileoverview Task detail page.
 *
 * @module src/app/tasks/[taskId]/page
 */

import { setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/serverRedirect";
import { auth } from "@/auth";
import { AuthDomain } from "@shared/domains/AuthDomain";
import { AccessControlDomain } from "@shared/domains/AccessControlDomain";
import { buildTaskActor } from "@shared/domains/TaskDomain";
import { canCreateTask } from "@shared/lib/taskAccessLogic";
import { TaskDetailShell } from "@/components/tasks/TaskDetailShell";

/** Route params. */
interface TaskDetailPageProps {
  params: Promise<{ locale: string; taskId: string }>;
}

/**
 * Task detail route for authors, performers, and dispatchers.
 *
 * @param props - Dynamic task id param.
 * @returns Task detail page.
 */
export default async function TaskDetailPage({ params }: TaskDetailPageProps) {
  const { locale, taskId } = await params;
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
    <TaskDetailShell
      taskId={taskId}
      viewerUserId={actor.userId}
      canDispatch={canCreateTask(actor)}
    />
  );
}
