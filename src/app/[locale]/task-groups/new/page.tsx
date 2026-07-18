/**
 * @fileoverview Task group creation page.
 *
 * @module src/app/task-groups/new/page
 */

import { setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/serverRedirect";
import { auth } from "@/auth";
import { AuthDomain } from "@shared/domains/AuthDomain";
import { AccessControlDomain } from "@shared/domains/AccessControlDomain";
import { buildTaskActor } from "@shared/domains/TaskDomain";
import { canCreateTaskGroup } from "@shared/lib/taskGroupAccessLogic";
import { TaskGroupCreateForm } from "@/components/tasks/TaskGroupCreateForm";

/**
 * New task group compose route — requires task dispatch authority.
 *
 * @param props - Locale route params.
 * @returns Task group create form page.
 */
export default async function NewTaskGroupPage({
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

  if (!canCreateTaskGroup(actor)) await redirect("/task-groups");

  return <TaskGroupCreateForm />;
}
