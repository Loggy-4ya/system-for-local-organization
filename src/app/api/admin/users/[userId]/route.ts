/**
 * @fileoverview REST API for retrieving and updating a specific user in the directory.
 *
 * GET /api/admin/users/[userId] — get redacted user detail.
 * PATCH /api/admin/users/[userId] — update user access/profile fields.
 * DELETE /api/admin/users/[userId] — permanently delete a user account.
 *
 * @module src/app/api/admin/users/[userId]/route
 */

import { NextRequest, NextResponse } from "next/server";
import { AccessControlDomain } from "@shared/domains/AccessControlDomain";
import { UserDirectoryAuditDomain } from "@shared/domains/UserDirectoryAuditDomain";
import type { UserDirectoryAuditAction } from "@shared/models/UserDirectoryAudit";
import type { IUser } from "@shared/models/User";
import {
  adminUserUpdateSchema,
  DIRECTORY_ERROR_CODES,
} from "@shared/validation/userDirectorySchemas";
import { formatZodErrors } from "@shared/validation/formatValidationErrors";
import {
  authGuardErrorStatus,
  requireDirectoryViewerActor,
} from "@/lib/authGuards";

/**
 * Best-effort audit row for a rejected user directory mutation.
 *
 * @param actor - Acting admin.
 * @param targetUserId - Target user id from the route.
 * @param action - Mutation kind.
 * @param errorCode - Machine-readable failure code.
 * @param changedFields - Patch keys attempted, when known.
 */
async function recordDirectoryMutationFailure(
  actor: IUser,
  targetUserId: string,
  action: UserDirectoryAuditAction,
  errorCode: string,
  changedFields?: string[],
): Promise<void> {
  await UserDirectoryAuditDomain.recordFailure({
    actor,
    targetUserId,
    action,
    errorCode,
    changedFields,
  }).catch((error) => {
    console.error("[UserDirectoryAudit] Failed to record rejection:", error);
  });
}

/**
 * GET /api/admin/users/[userId] — get redacted user details.
 *
 * Requires `users.view_directory` permission or legacy Admin role.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const { actor } = await requireDirectoryViewerActor();
    const { userId } = await params;
    const result = await AccessControlDomain.getDirectoryUser(actor, userId);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    const guardStatus = authGuardErrorStatus(err);
    if (guardStatus === 401 || guardStatus === 403) {
      return NextResponse.json({ error: message || "Forbidden." }, { status: guardStatus });
    }
    if (message === "USER_NOT_FOUND") {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }
    if (message === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }
    console.error("[API /api/admin/users/[userId] GET]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/users/[userId] — update user access/profile fields.
 *
 * Requires `users.view_directory` plus at least one assignment/delegation permission,
 * and strict outranking hierarchy per field.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  let actor: IUser | null = null;
  let patchKeys: string[] | undefined;

  try {
    const auth = await requireDirectoryViewerActor();
    actor = auth.actor;

    const canMutate = await AccessControlDomain.canUserMutateDirectory(actor);
    if (!canMutate) {
      const { userId } = await params;
      await recordDirectoryMutationFailure(actor, userId, "user_update", "FORBIDDEN");
      return NextResponse.json({ error: "Forbidden.", code: "FORBIDDEN" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = adminUserUpdateSchema.safeParse(body);
    if (!parsed.success) {
      const formatted = formatZodErrors(parsed.error);
      const { userId } = await params;
      const attemptedFields =
        body && typeof body === "object"
          ? Object.keys(body as Record<string, unknown>)
          : [];
      await recordDirectoryMutationFailure(
        actor,
        userId,
        "user_update",
        "VALIDATION_FAILED",
        attemptedFields,
      );
      return NextResponse.json(
        {
          error: formatted.formError || "Validation failed.",
          fieldErrors: formatted.fieldErrors,
        },
        { status: 400 },
      );
    }

    patchKeys = Object.keys(parsed.data as Record<string, unknown>);
    const { userId } = await params;
    const result = await AccessControlDomain.adminUpdateUser(actor, userId, parsed.data);
    return NextResponse.json({ ok: true, user: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    const guardStatus = authGuardErrorStatus(err);
    if (guardStatus === 401 || guardStatus === 403) {
      return NextResponse.json({ error: message || "Forbidden." }, { status: guardStatus });
    }

    if (message in DIRECTORY_ERROR_CODES) {
      let status = 403;
      if (message === "USER_NOT_FOUND") status = 404;
      if (
        message === "SELF_MODIFICATION_FORBIDDEN" ||
        message === "LEVEL_NOT_ASSIGNABLE" ||
        message === "PERMISSION_NOT_DELEGATABLE"
      ) {
        status = 400;
      }

      if (actor) {
        const { userId } = await params;
        await recordDirectoryMutationFailure(
          actor,
          userId,
          "user_update",
          message,
          patchKeys,
        );
      }

      return NextResponse.json({ error: message, code: message }, { status });
    }

    console.error("[API /api/admin/users/[userId] PATCH]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/users/[userId] — permanently delete a user account.
 *
 * Requires `users.delete` permission (or legacy Admin role), strict outranking, and
 * cannot delete self or the last system administrator.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  let actor: IUser | null = null;

  try {
    const auth = await requireDirectoryViewerActor();
    actor = auth.actor;
    const { userId } = await params;
    await AccessControlDomain.adminDeleteUser(actor, userId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    const guardStatus = authGuardErrorStatus(err);
    if (guardStatus === 401 || guardStatus === 403) {
      return NextResponse.json({ error: message || "Forbidden." }, { status: guardStatus });
    }

    if (message in DIRECTORY_ERROR_CODES) {
      let status = 403;
      if (message === "USER_NOT_FOUND") status = 404;
      if (
        message === "SELF_MODIFICATION_FORBIDDEN" ||
        message === "LAST_SYSTEM_ADMIN_DELETE_FORBIDDEN"
      ) {
        status = 400;
      }

      if (actor) {
        const { userId } = await params;
        await recordDirectoryMutationFailure(
          actor,
          userId,
          "user_delete",
          message,
          ["account"],
        );
      }

      return NextResponse.json({ error: message, code: message }, { status });
    }

    console.error("[API /api/admin/users/[userId] DELETE]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
