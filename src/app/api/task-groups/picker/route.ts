/**
 * @fileoverview Task group picker options for task create forms.
 *
 * GET /api/task-groups/picker — authored active/draft groups.
 *
 * @module src/app/api/task-groups/picker/route
 */

import { NextResponse } from "next/server";
import { AccessControlDomain } from "@shared/domains/AccessControlDomain";
import { TaskGroupDomain } from "@shared/domains/TaskGroupDomain";
import { buildTaskActor } from "@shared/domains/TaskDomain";
import { authGuardErrorStatus, requireAuthenticatedActor } from "@/lib/authGuards";

/**
 * GET /api/task-groups/picker — list groups the actor may attach tasks to.
 */
export async function GET() {
  try {
    const { actor } = await requireAuthenticatedActor();
    const permissions = await AccessControlDomain.resolvePermissionsForUser(actor);
    const taskActor = buildTaskActor(actor, permissions);

    const groups = await TaskGroupDomain.listGroupsForTaskPicker(taskActor);
    return NextResponse.json({ groups });
  } catch (err) {
    const guardStatus = authGuardErrorStatus(err);
    if (guardStatus === 401 || guardStatus === 403) {
      return NextResponse.json({ error: "Forbidden." }, { status: guardStatus });
    }
    console.error("[API /api/task-groups/picker GET]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
