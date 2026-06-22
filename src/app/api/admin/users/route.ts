/**
 * @fileoverview REST API for listing and searching users in the directory.
 *
 * GET /api/admin/users — search and list users with field-level PII redaction.
 *
 * @module src/app/api/admin/users/route
 */

import { NextRequest, NextResponse } from "next/server";
import { AccessControlDomain } from "@shared/domains/AccessControlDomain";
import { userDirectoryQuerySchema } from "@shared/validation/userDirectorySchemas";
import { formatZodErrors } from "@shared/validation/formatValidationErrors";
import {
  authGuardErrorStatus,
  requireDirectoryViewerActor,
} from "@/lib/authGuards";

/**
 * GET /api/admin/users — search and list users in the directory.
 *
 * Requires `users.view_directory` permission or legacy Admin role.
 *
 * @param req - Request with query params: q, level, page, limit (cursor legacy).
 * @returns Paginated list of redacted user rows.
 */
export async function GET(req: NextRequest) {
  try {
    const { actor } = await requireDirectoryViewerActor();

    const { searchParams } = new URL(req.url);
    const queryObj = {
      q: searchParams.get("q") || undefined,
      level: searchParams.get("level") || undefined,
      cursor: searchParams.get("cursor") || undefined,
      limit: searchParams.get("limit") || undefined,
    };

    const parsed = userDirectoryQuerySchema.safeParse(queryObj);
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

    const result = await AccessControlDomain.listDirectoryUsers(actor, parsed.data);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    const status = authGuardErrorStatus(err);
    if (status === 401 || status === 403) {
      return NextResponse.json(
        { error: message === "FORBIDDEN" ? "Forbidden." : message || "Forbidden." },
        { status },
      );
    }
    console.error("[API /api/admin/users GET]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
