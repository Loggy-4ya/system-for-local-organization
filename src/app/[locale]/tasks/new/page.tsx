/**
 * @fileoverview Task creation page for self-government administrators.
 *
 * @module src/app/tasks/new/page
 */

import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/serverRedirect";
import { auth } from "@/auth";
import { AuthDomain } from "@shared/domains/AuthDomain";
import { AccessControlDomain } from "@shared/domains/AccessControlDomain";
import { buildTaskActor } from "@shared/domains/TaskDomain";
import { canCreateTask } from "@shared/lib/taskAccessLogic";
import { TaskCreateForm } from "@/components/tasks/TaskCreateForm";

/**
 * New task compose route — requires `tasks.dispatch`.
 *
 * @param props - Locale route params.
 * @returns Task create form page.
 */
export default async function NewTaskPage({
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

  if (!canCreateTask(actor)) await redirect("/tasks");

  return (
    <Suspense fallback={null}>
      <TaskCreateForm />
    </Suspense>
  );
}
