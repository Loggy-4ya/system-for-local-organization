/**
 * @fileoverview REST API for institution user search (task pickers, member lookup).
 *
 * GET /api/users/search?q=&limit=
 *
 * @module src/app/api/users/search/route
 */

import { NextRequest, NextResponse } from "next/server";
import { AccessControlDomain } from "@shared/domains/AccessControlDomain";
import { UserSearchDomain } from "@shared/domains/UserSearchDomain";
import { canListTasks, canReceiveTasks } from "@shared/lib/taskAccessLogic";
import { buildTaskActor } from "@shared/domains/TaskDomain";
import { canActorViewDirectory } from "@shared/lib/accessControlLogic";
import { authGuardErrorStatus, requireAuthenticatedActor } from "@/lib/authGuards";

/**
 * GET /api/users/search — autocomplete users by name, login, group, email (when permitted).
 */
export async function GET(req: NextRequest) {
  try {
    const { actor } = await requireAuthenticatedActor();
    const permissions = await AccessControlDomain.resolvePermissionsForUser(actor);
    const settings = await AccessControlDomain.loadOrSeed();
    const taskActor = buildTaskActor(actor, permissions);

    const maySearch =
      canListTasks(taskActor) ||
      canReceiveTasks(taskActor) ||
      canActorViewDirectory(
        {
          role: actor.role,
          accessLevelIndex: actor.accessLevelIndex,
          delegatedPermissions: actor.delegatedPermissions ?? [],
          sociumRoles: actor.sociumRoles ?? [],
          studentTitle: actor.studentTitle,
        },
        AccessControlDomain.toPublicConfig(settings),
      ) ||
      actor.role === "Admin";

    if (!maySearch) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const query = req.nextUrl.searchParams.get("q") ?? "";
    const limitRaw = req.nextUrl.searchParams.get("limit");
    const limit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;

    const users = await UserSearchDomain.searchMembers(
      actor,
      permissions,
      query,
      Number.isFinite(limit) ? limit : undefined,
    );

    return NextResponse.json({ users });
  } catch (err) {
    const guardStatus = authGuardErrorStatus(err);
    if (guardStatus === 401 || guardStatus === 403) {
      return NextResponse.json({ error: "Forbidden." }, { status: guardStatus });
    }
    console.error("[API /api/users/search GET]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
