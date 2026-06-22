/**
 * @fileoverview REST API for task completion reports.
 *
 * POST /api/tasks/[taskId]/report
 *
 * @module src/app/api/tasks/[taskId]/report/route
 */

import { NextRequest, NextResponse } from "next/server";
import { AccessControlDomain } from "@shared/domains/AccessControlDomain";
import { TaskDomain, buildTaskActor } from "@shared/domains/TaskDomain";
import { taskReportSchema } from "@shared/validation/taskSchemas";
import { formatZodErrors } from "@shared/validation/formatValidationErrors";
import { authGuardErrorStatus, requireAuthenticatedActor } from "@/lib/authGuards";

/** POST /api/tasks/[taskId]/report */
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
    const parsed = taskReportSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: formatZodErrors(parsed.error) }, { status: 400 });
    }

    const task = await TaskDomain.submitReport(taskActor, taskId, parsed.data);
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
    console.error("[API /api/tasks/[taskId]/report POST]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
