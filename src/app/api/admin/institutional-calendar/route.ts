/**
 * @fileoverview REST API for institutional calendar rules.
 *
 * @module src/app/api/admin/institutional-calendar/route
 */

import { NextRequest, NextResponse } from "next/server";
import { InstitutionalCalendarDomain } from "@shared/domains/InstitutionalCalendarDomain";
import {
  institutionalCalendarCreateSchema,
} from "@shared/validation/institutionalCalendarSchemas";
import { formatZodErrors } from "@shared/validation/formatValidationErrors";
import { AuthDomain } from "@shared/domains/AuthDomain";
import { authGuardErrorStatus, requireAdminRole } from "@/lib/authGuards";

/**
 * GET /api/admin/institutional-calendar — list all rules.
 */
export async function GET() {
  try {
    await requireAdminRole();
    const rules = await InstitutionalCalendarDomain.listRules();
    return NextResponse.json({ rules });
  } catch (err) {
    const status = authGuardErrorStatus(err);
    if (status === 401 || status === 403) {
      return NextResponse.json({ error: "Forbidden." }, { status });
    }
    console.error("[API /api/admin/institutional-calendar GET]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

/**
 * POST /api/admin/institutional-calendar — create a rule.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await requireAdminRole();
    const author = await AuthDomain.getUserById(session.user!.id!);
    if (!author) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = await req.json();
    const parsed = institutionalCalendarCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: formatZodErrors(parsed.error) }, { status: 400 });
    }

    const rule = await InstitutionalCalendarDomain.createRule(author, parsed.data);
    return NextResponse.json(rule, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    const status = authGuardErrorStatus(err);
    if (status === 401 || status === 403) {
      return NextResponse.json({ error: "Forbidden." }, { status });
    }
    if (message === "RULE_LIMIT_EXCEEDED") {
      return NextResponse.json({ error: "Maximum number of calendar rules reached." }, { status: 400 });
    }
    console.error("[API /api/admin/institutional-calendar POST]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
