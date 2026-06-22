/**
 * @fileoverview REST API for single institutional calendar rule.
 *
 * @module src/app/api/admin/institutional-calendar/[ruleId]/route
 */

import { NextRequest, NextResponse } from "next/server";
import { InstitutionalCalendarDomain } from "@shared/domains/InstitutionalCalendarDomain";
import { institutionalCalendarUpdateSchema } from "@shared/validation/institutionalCalendarSchemas";
import { formatZodErrors } from "@shared/validation/formatValidationErrors";
import { authGuardErrorStatus, requireAdminRole } from "@/lib/authGuards";

/** Route params. */
interface RouteParams {
  params: Promise<{ ruleId: string }>;
}

/**
 * GET /api/admin/institutional-calendar/[ruleId]
 */
export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    await requireAdminRole();
    const { ruleId } = await params;
    const rule = await InstitutionalCalendarDomain.getRule(ruleId);
    return NextResponse.json(rule);
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    const status = authGuardErrorStatus(err);
    if (message === "RULE_NOT_FOUND") {
      return NextResponse.json({ error: "Rule not found." }, { status: 404 });
    }
    if (status === 401 || status === 403) {
      return NextResponse.json({ error: "Forbidden." }, { status });
    }
    console.error("[API /api/admin/institutional-calendar/[ruleId] GET]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/institutional-calendar/[ruleId]
 */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    await requireAdminRole();
    const { ruleId } = await params;
    const body = await req.json();
    const parsed = institutionalCalendarUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: formatZodErrors(parsed.error) }, { status: 400 });
    }

    const rule = await InstitutionalCalendarDomain.updateRule(ruleId, parsed.data);
    return NextResponse.json(rule);
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    const status = authGuardErrorStatus(err);
    if (message === "RULE_NOT_FOUND") {
      return NextResponse.json({ error: "Rule not found." }, { status: 404 });
    }
    if (status === 401 || status === 403) {
      return NextResponse.json({ error: "Forbidden." }, { status });
    }
    console.error("[API /api/admin/institutional-calendar/[ruleId] PATCH]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/institutional-calendar/[ruleId]
 */
export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    await requireAdminRole();
    const { ruleId } = await params;
    await InstitutionalCalendarDomain.deleteRule(ruleId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    const status = authGuardErrorStatus(err);
    if (message === "RULE_NOT_FOUND") {
      return NextResponse.json({ error: "Rule not found." }, { status: 404 });
    }
    if (status === 401 || status === 403) {
      return NextResponse.json({ error: "Forbidden." }, { status });
    }
    console.error("[API /api/admin/institutional-calendar/[ruleId] DELETE]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
