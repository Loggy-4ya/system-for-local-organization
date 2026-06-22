/**
 * @fileoverview REST API for a single task — detail, update, cancel.
 *
 * @module src/app/api/tasks/[taskId]/route
 */

import { NextRequest, NextResponse } from "next/server";
import { AccessControlDomain } from "@shared/domains/AccessControlDomain";
import { TaskDomain, buildTaskActor } from "@shared/domains/TaskDomain";
import { taskUpdateSchema } from "@shared/validation/taskSchemas";
import { formatZodErrors } from "@shared/validation/formatValidationErrors";
import { authGuardErrorStatus, requireAuthenticatedActor } from "@/lib/authGuards";

/**
 * GET /api/tasks/[taskId] — task detail.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> },
) {
  try {
    const { actor } = await requireAuthenticatedActor();
    const permissions = await AccessControlDomain.resolvePermissionsForUser(actor);
    const taskActor = buildTaskActor(actor, permissions);
    const { taskId } = await params;
    const task = await TaskDomain.getTask(taskActor, taskId);
    return NextResponse.json(task);
  } catch (err) {
    return taskErrorResponse(err, "GET");
  }
}

/**
 * PATCH /api/tasks/[taskId] — update task fields.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> },
) {
  try {
    const { actor } = await requireAuthenticatedActor();
    const permissions = await AccessControlDomain.resolvePermissionsForUser(actor);
    const taskActor = buildTaskActor(actor, permissions);
    const { taskId } = await params;

    const body = await req.json();
    const parsed = taskUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: formatZodErrors(parsed.error) }, { status: 400 });
    }

    const task = await TaskDomain.updateTask(taskActor, taskId, parsed.data);
    return NextResponse.json(task);
  } catch (err) {
    return taskErrorResponse(err, "PATCH");
  }
}

/**
 * DELETE /api/tasks/[taskId] — cancel task.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> },
) {
  try {
    const { actor } = await requireAuthenticatedActor();
    const permissions = await AccessControlDomain.resolvePermissionsForUser(actor);
    const taskActor = buildTaskActor(actor, permissions);
    const { taskId } = await params;
    const task = await TaskDomain.cancelTask(taskActor, taskId);
    return NextResponse.json(task);
  } catch (err) {
    return taskErrorResponse(err, "DELETE");
  }
}

/**
 * Map task domain errors to HTTP responses.
 *
 * @param err - Thrown error.
 * @param method - HTTP method for logging.
 * @returns NextResponse error payload.
 */
function taskErrorResponse(err: unknown, method: string): NextResponse {
  const message = err instanceof Error ? err.message : "";
  const guardStatus = authGuardErrorStatus(err);
  if (guardStatus === 401 || guardStatus === 403 || message === "FORBIDDEN") {
    return NextResponse.json({ error: "Forbidden." }, { status: guardStatus === 401 ? 401 : 403 });
  }
  if (message === "TASK_NOT_FOUND") {
    return NextResponse.json({ error: "Task not found." }, { status: 404 });
  }
  if (message === "INVALID_STATUS_TRANSITION") {
    return NextResponse.json({ error: "Invalid status transition." }, { status: 400 });
  }
  console.error(`[API /api/tasks/[taskId] ${method}]`, err);
  return NextResponse.json({ error: "Internal server error." }, { status: 500 });
}
