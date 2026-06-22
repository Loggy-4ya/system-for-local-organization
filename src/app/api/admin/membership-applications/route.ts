/**
 * @fileoverview Admin membership application queue API.
 *
 * @module src/app/api/admin/membership-applications/route
 */

import { NextRequest, NextResponse } from "next/server";
import { MembershipApplicationDomain } from "@shared/domains/MembershipApplicationDomain";
import { membershipApplicationListQuerySchema } from "@shared/validation/membershipApplicationSchemas";
import { formatZodErrors } from "@shared/validation/formatValidationErrors";
import { AuthDomain } from "@shared/domains/AuthDomain";
import { authGuardErrorStatus, requireSociumRoleAssigner } from "@/lib/authGuards";

/**
 * GET /api/admin/membership-applications — paginated pending application queue.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await requireSociumRoleAssigner();
    const actor = await AuthDomain.getUserById(session.user!.id!);
    if (!actor) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const parsed = membershipApplicationListQuerySchema.safeParse(
      Object.fromEntries(req.nextUrl.searchParams.entries()),
    );
    if (!parsed.success) {
      return NextResponse.json({ error: formatZodErrors(parsed.error) }, { status: 400 });
    }

    const result = await MembershipApplicationDomain.listPendingApplications(actor, parsed.data);
    return NextResponse.json(result);
  } catch (err) {
    const status = authGuardErrorStatus(err);
    if (status === 401 || status === 403) {
      return NextResponse.json({ error: "Forbidden." }, { status });
    }
    const message = err instanceof Error ? err.message : "";
    if (message === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }
    console.error("[API /api/admin/membership-applications GET]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
