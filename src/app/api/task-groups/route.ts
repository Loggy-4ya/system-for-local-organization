/**
 * @fileoverview REST API for task group list and creation.
 *
 * GET /api/task-groups — paginated group list.
 * POST /api/task-groups — create a multi-part project.
 *
 * @module src/app/api/task-groups/route
 */

import { NextRequest, NextResponse } from "next/server";
import { AccessControlDomain } from "@shared/domains/AccessControlDomain";
import { TaskGroupDomain } from "@shared/domains/TaskGroupDomain";
import { buildTaskActor } from "@shared/domains/TaskDomain";
import { taskGroupCreateSchema, taskGroupListQuerySchema } from "@shared/validation/taskGroupSchemas";
import { formatZodErrors } from "@shared/validation/formatValidationErrors";
import { authGuardErrorStatus, requireAuthenticatedActor } from "@/lib/authGuards";

/**
 * GET /api/task-groups — list groups visible to the authenticated actor.
 */
export async function GET(req: NextRequest) {
  try {
    const { actor } = await requireAuthenticatedActor();
    const permissions = await AccessControlDomain.resolvePermissionsForUser(actor);
    const taskActor = buildTaskActor(actor, permissions);

    const parsed = taskGroupListQuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
    if (!parsed.success) {
      return NextResponse.json({ error: formatZodErrors(parsed.error) }, { status: 400 });
    }

    const result = await TaskGroupDomain.listTaskGroups(taskActor, parsed.data);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    const guardStatus = authGuardErrorStatus(err);
    if (guardStatus === 401 || guardStatus === 403 || message === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden." }, { status: guardStatus === 401 ? 401 : 403 });
    }
    console.error("[API /api/task-groups GET]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

/**
 * POST /api/task-groups — create a task group.
 */
export async function POST(req: NextRequest) {
  try {
    const { actor } = await requireAuthenticatedActor();
    const permissions = await AccessControlDomain.resolvePermissionsForUser(actor);
    const taskActor = buildTaskActor(actor, permissions);

    const body = await req.json();
    const parsed = taskGroupCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: formatZodErrors(parsed.error) }, { status: 400 });
    }

    const group = await TaskGroupDomain.createTaskGroup(taskActor, actor, parsed.data);
    return NextResponse.json(group, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    const guardStatus = authGuardErrorStatus(err);
    if (guardStatus === 401 || guardStatus === 403 || message === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden." }, { status: guardStatus === 401 ? 401 : 403 });
    }
    console.error("[API /api/task-groups POST]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
