/**
 * @fileoverview PATCH per-project Telegram workspace strategy.
 *
 * @module src/app/api/task-groups/[groupId]/telegram-workspace/route
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { AuthDomain } from "@shared/domains/AuthDomain";
import { AccessControlDomain } from "@shared/domains/AccessControlDomain";
import { TaskGroupDomain } from "@shared/domains/TaskGroupDomain";
import { buildTaskActor } from "@shared/domains/TaskDomain";
import { taskGroupTelegramWorkspacePatchSchema } from "@shared/validation/telegramWorkspaceSchemas";
import { formatZodErrors } from "@shared/validation/formatValidationErrors";
import { authGuardErrorStatus } from "@/lib/authGuards";

/** Route params. */
interface RouteParams {
  params: Promise<{ groupId: string }>;
}

/**
 * PATCH /api/task-groups/[groupId]/telegram-workspace
 */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const user = await AuthDomain.getUserById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const permissions = await AccessControlDomain.resolvePermissionsForUser(user);
    const actor = buildTaskActor(user, permissions);
    const { groupId } = await params;

    const body = await req.json();
    const parsed = taskGroupTelegramWorkspacePatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: formatZodErrors(parsed.error) }, { status: 400 });
    }

    const detail = await TaskGroupDomain.patchTelegramWorkspace(actor, groupId, parsed.data);
    return NextResponse.json({ telegramWorkspace: detail.telegramWorkspace });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    const status = authGuardErrorStatus(err);
    if (message === "GROUP_NOT_FOUND") {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }
    if (status === 401 || status === 403 || message === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }
    console.error("[API /api/task-groups/[groupId]/telegram-workspace PATCH]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
