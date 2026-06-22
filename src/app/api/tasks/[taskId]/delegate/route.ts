/**
 * @fileoverview REST API for task delegation to another performer.
 *
 * POST /api/tasks/[taskId]/delegate
 *
 * @module src/app/api/tasks/[taskId]/delegate/route
 */

import { NextRequest, NextResponse } from "next/server";
import { AccessControlDomain } from "@shared/domains/AccessControlDomain";
import { TaskDomain, buildTaskActor } from "@shared/domains/TaskDomain";
import { taskDelegateSchema } from "@shared/validation/taskSchemas";
import { formatZodErrors } from "@shared/validation/formatValidationErrors";
import { authGuardErrorStatus, requireAuthenticatedActor } from "@/lib/authGuards";

/** POST /api/tasks/[taskId]/delegate */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> },
) {
  try {
    const { actor } = await requireAuthenticatedActor();
    const permissions = await AccessControlDomain.resolvePermissionsForUser(actor);
    const taskActor = buildTaskActor(actor, permissions);
    const { taskId } = await params;

    const body = await req.json();
    const parsed = taskDelegateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: formatZodErrors(parsed.error) }, { status: 400 });
    }

    const task = await TaskDomain.delegateTask(taskActor, taskId, parsed.data);
    return NextResponse.json(task);
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    const guardStatus = authGuardErrorStatus(err);
    if (guardStatus === 401 || guardStatus === 403 || message === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden." }, { status: guardStatus === 401 ? 401 : 403 });
    }
    if (message === "TASK_NOT_FOUND") {
      return NextResponse.json({ error: "Task not found." }, { status: 404 });
    }
    if (message === "DELEGATION_QUOTA_EXCEEDED") {
      return NextResponse.json({ error: "Delegation quota exceeded for your role." }, { status: 403 });
    }
    if (message === "ALREADY_ASSIGNED") {
      return NextResponse.json({ error: "User is already assigned to this task." }, { status: 409 });
    }
    console.error("[API /api/tasks/[taskId]/delegate POST]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
