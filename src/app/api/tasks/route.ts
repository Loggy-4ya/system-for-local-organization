/**
 * @fileoverview REST API for institutional task list and creation.
 *
 * GET /api/tasks — paginated task list.
 * POST /api/tasks — create and optionally dispatch a task.
 *
 * @module src/app/api/tasks/route
 */

import { NextRequest, NextResponse } from "next/server";
import { AccessControlDomain } from "@shared/domains/AccessControlDomain";
import { AuthDomain } from "@shared/domains/AuthDomain";
import { TaskDomain, buildTaskActor } from "@shared/domains/TaskDomain";
import { taskCreateSchema, taskListQuerySchema } from "@shared/validation/taskSchemas";
import { formatZodErrors } from "@shared/validation/formatValidationErrors";
import { authGuardErrorStatus, requireAuthenticatedActor } from "@/lib/authGuards";

/**
 * GET /api/tasks — list tasks visible to the authenticated actor.
 */
export async function GET(req: NextRequest) {
  try {
    const { actor } = await requireAuthenticatedActor();
    const permissions = await AccessControlDomain.resolvePermissionsForUser(actor);
    const taskActor = buildTaskActor(actor, permissions);

    const parsed = taskListQuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
    if (!parsed.success) {
      return NextResponse.json({ error: formatZodErrors(parsed.error) }, { status: 400 });
    }

    const result = await TaskDomain.listTasks(taskActor, parsed.data);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    const guardStatus = authGuardErrorStatus(err);
    if (guardStatus === 401 || guardStatus === 403 || message === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden." }, { status: guardStatus === 401 ? 401 : 403 });
    }
    console.error("[API /api/tasks GET]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

/**
 * POST /api/tasks — create a task (requires `tasks.dispatch`).
 */
export async function POST(req: NextRequest) {
  try {
    const { actor } = await requireAuthenticatedActor();
    const permissions = await AccessControlDomain.resolvePermissionsForUser(actor);
    const taskActor = buildTaskActor(actor, permissions);

    const body = await req.json();
    const parsed = taskCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: formatZodErrors(parsed.error) }, { status: 400 });
    }

    const task = await TaskDomain.createTask(taskActor, actor, parsed.data);
    return NextResponse.json(task, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    const guardStatus = authGuardErrorStatus(err);
    if (guardStatus === 401 || guardStatus === 403 || message === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden." }, { status: guardStatus === 401 ? 401 : 403 });
    }
    console.error("[API /api/tasks POST]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
