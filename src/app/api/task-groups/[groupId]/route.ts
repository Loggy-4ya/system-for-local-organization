/**
 * @fileoverview REST API for single task group CRUD.
 *
 * @module src/app/api/task-groups/[groupId]/route
 */

import { NextRequest, NextResponse } from "next/server";
import { AccessControlDomain } from "@shared/domains/AccessControlDomain";
import { TaskGroupDomain } from "@shared/domains/TaskGroupDomain";
import { buildTaskActor } from "@shared/domains/TaskDomain";
import { taskGroupUpdateSchema } from "@shared/validation/taskGroupSchemas";
import { formatZodErrors } from "@shared/validation/formatValidationErrors";
import { authGuardErrorStatus, requireAuthenticatedActor } from "@/lib/authGuards";

/** Route params for task group id. */
interface RouteParams {
  params: Promise<{ groupId: string }>;
}

/**
 * GET /api/task-groups/[groupId] — fetch group detail with child tasks.
 */
export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const { groupId } = await params;
    const { actor } = await requireAuthenticatedActor();
    const permissions = await AccessControlDomain.resolvePermissionsForUser(actor);
    const taskActor = buildTaskActor(actor, permissions);

    const group = await TaskGroupDomain.getTaskGroup(taskActor, groupId);
    return NextResponse.json(group);
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    const guardStatus = authGuardErrorStatus(err);
    if (message === "GROUP_NOT_FOUND") {
      return NextResponse.json({ error: "Task group not found." }, { status: 404 });
    }
    if (guardStatus === 401 || guardStatus === 403 || message === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden." }, { status: guardStatus === 401 ? 401 : 403 });
    }
    console.error("[API /api/task-groups/[groupId] GET]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

/**
 * PATCH /api/task-groups/[groupId] — update group fields.
 */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const { groupId } = await params;
    const { actor } = await requireAuthenticatedActor();
    const permissions = await AccessControlDomain.resolvePermissionsForUser(actor);
    const taskActor = buildTaskActor(actor, permissions);

    const body = await req.json();
    const parsed = taskGroupUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: formatZodErrors(parsed.error) }, { status: 400 });
    }

    const group = await TaskGroupDomain.updateTaskGroup(taskActor, groupId, parsed.data);
    return NextResponse.json(group);
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    const guardStatus = authGuardErrorStatus(err);
    if (message === "GROUP_NOT_FOUND") {
      return NextResponse.json({ error: "Task group not found." }, { status: 404 });
    }
    if (guardStatus === 401 || guardStatus === 403 || message === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden." }, { status: guardStatus === 401 ? 401 : 403 });
    }
    console.error("[API /api/task-groups/[groupId] PATCH]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

/**
 * DELETE /api/task-groups/[groupId] — cancel a task group.
 */
export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    const { groupId } = await params;
    const { actor } = await requireAuthenticatedActor();
    const permissions = await AccessControlDomain.resolvePermissionsForUser(actor);
    const taskActor = buildTaskActor(actor, permissions);

    const group = await TaskGroupDomain.cancelTaskGroup(taskActor, groupId);
    return NextResponse.json(group);
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    const guardStatus = authGuardErrorStatus(err);
    if (message === "GROUP_NOT_FOUND") {
      return NextResponse.json({ error: "Task group not found." }, { status: 404 });
    }
    if (guardStatus === 401 || guardStatus === 403 || message === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden." }, { status: guardStatus === 401 ? 401 : 403 });
    }
    console.error("[API /api/task-groups/[groupId] DELETE]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
