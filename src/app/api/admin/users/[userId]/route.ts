/**
 * @fileoverview REST API for retrieving and updating a specific user in the directory.
 *
 * GET /api/admin/users/[userId] — get redacted user detail.
 * PATCH /api/admin/users/[userId] — update user access/profile fields.
 *
 * @module src/app/api/admin/users/[userId]/route
 */

import { NextRequest, NextResponse } from "next/server";
import { AccessControlDomain } from "@shared/domains/AccessControlDomain";
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
  try {
    const { actor } = await requireDirectoryViewerActor();

    const canMutate = await AccessControlDomain.canUserMutateDirectory(actor);
    if (!canMutate) {
      return NextResponse.json({ error: "Forbidden.", code: "FORBIDDEN" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = adminUserUpdateSchema.safeParse(body);
    if (!parsed.success) {
      const formatted = formatZodErrors(parsed.error);
      return NextResponse.json(
        {
          error: formatted.formError || "Validation failed.",
          fieldErrors: formatted.fieldErrors,
        },
        { status: 400 },
      );
    }

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

      return NextResponse.json({ error: message, code: message }, { status });
    }

    console.error("[API /api/admin/users/[userId] PATCH]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
