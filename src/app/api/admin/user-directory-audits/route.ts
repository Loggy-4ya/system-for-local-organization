/**
 * @fileoverview REST API for listing User Directory admin audit records.
 *
 * GET /api/admin/user-directory-audits — paginated audit log (legacy Admin).
 *
 * @module src/app/api/admin/user-directory-audits/route
 */

import { NextRequest, NextResponse } from "next/server";
import { UserDirectoryAuditDomain } from "@shared/domains/UserDirectoryAuditDomain";
import { authGuardErrorStatus, requireAdminRole } from "@/lib/authGuards";

/**
 * GET /api/admin/user-directory-audits — list user directory audit rows.
 *
 * Query: `page`, `limit`, `targetUserId`, `successOnly`
 *
 * @param req - Incoming request.
 * @returns Paginated audit list JSON.
 */
export async function GET(req: NextRequest) {
  try {
    await requireAdminRole();

    const { searchParams } = new URL(req.url);
    const pageRaw = searchParams.get("page");
    const page = pageRaw ? Number.parseInt(pageRaw, 10) : undefined;
    const limitRaw = searchParams.get("limit");
    const limit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
    const targetUserId = searchParams.get("targetUserId") || undefined;
    const successOnly = searchParams.get("successOnly") === "true";

    const result = await UserDirectoryAuditDomain.listAudits({
      page: Number.isInteger(page) && page! > 0 ? page : undefined,
      limit: Number.isInteger(limit) && limit! > 0 ? limit : undefined,
      targetUserId,
      successOnly,
    });

    return NextResponse.json(result);
  } catch (err) {
    const status = authGuardErrorStatus(err);
    if (status === 401 || status === 403) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Forbidden." },
        { status },
      );
    }
    console.error("[API /api/admin/user-directory-audits GET]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
