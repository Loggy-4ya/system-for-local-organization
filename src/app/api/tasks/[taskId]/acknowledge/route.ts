/**
 * @fileoverview REST API for task performer acknowledgement.
 *
 * POST /api/tasks/[taskId]/acknowledge
 *
 * @module src/app/api/tasks/[taskId]/acknowledge/route
 */

import { NextRequest, NextResponse } from "next/server";
import { AccessControlDomain } from "@shared/domains/AccessControlDomain";
import { TaskDomain, buildTaskActor } from "@shared/domains/TaskDomain";
import { authGuardErrorStatus, requireAuthenticatedActor } from "@/lib/authGuards";

/** POST /api/tasks/[taskId]/acknowledge */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> },
) {
  try {
    const { actor } = await requireAuthenticatedActor();
    const permissions = await AccessControlDomain.resolvePermissionsForUser(actor);
    const taskActor = buildTaskActor(actor, permissions);
    const { taskId } = await params;
    const task = await TaskDomain.acknowledgeTask(taskActor, taskId);
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
    console.error("[API /api/tasks/[taskId]/acknowledge POST]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
