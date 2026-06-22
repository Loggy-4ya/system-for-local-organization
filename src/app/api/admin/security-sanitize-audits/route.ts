/**
 * @fileoverview REST API for listing security sanitization audit records.
 *
 * GET /api/admin/security-sanitize-audits — paginated audit log (legacy Admin).
 *
 * @module src/app/api/admin/security-sanitize-audits/route
 */

import { NextRequest, NextResponse } from "next/server";
import { SecuritySanitizeDomain } from "@shared/domains/SecuritySanitizeDomain";
import { authGuardErrorStatus, requireAdminRole } from "@/lib/authGuards";

/**
 * GET /api/admin/security-sanitize-audits — list sanitization audit rows.
 *
 * Query: `page`, `limit`, `pagePathPrefix`
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
    const pagePathPrefix = searchParams.get("pagePathPrefix") || undefined;

    const result = await SecuritySanitizeDomain.listAudits({
      page: Number.isInteger(page) && page! > 0 ? page : undefined,
      limit: Number.isInteger(limit) && limit! > 0 ? limit : undefined,
      pagePathPrefix,
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
    console.error("[API /api/admin/security-sanitize-audits GET]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
