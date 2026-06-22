/**
 * @fileoverview Admin REST API for institutional general rules settings.
 *
 * @module src/app/api/admin/general-rules/route
 */

import { NextRequest, NextResponse } from "next/server";
import { GeneralRulesDomain } from "@shared/domains/GeneralRulesDomain";
import { generalRulesUpdateSchema } from "@shared/validation/generalRulesSchemas";
import { authGuardErrorStatus, requireAdminRole } from "@/lib/authGuards";

/**
 * GET /api/admin/general-rules — load singleton general rules config.
 */
export async function GET() {
  try {
    await requireAdminRole();
  } catch (err) {
    const status = authGuardErrorStatus(err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Forbidden." },
      { status: status === 500 ? 403 : status },
    );
  }

  try {
    const doc = await GeneralRulesDomain.loadOrSeed();
    return NextResponse.json(GeneralRulesDomain.toPublicConfig(doc));
  } catch (err) {
    console.error("[API /api/admin/general-rules GET]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

/**
 * POST /api/admin/general-rules — persist general rules updates.
 *
 * @param req - JSON body partial general rules config.
 */
export async function POST(req: NextRequest) {
  try {
    await requireAdminRole();
  } catch (err) {
    const status = authGuardErrorStatus(err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Forbidden." },
      { status: status === 500 ? 403 : status },
    );
  }

  try {
    const body = await req.json();
    const parsed = generalRulesUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed.", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const doc = await GeneralRulesDomain.update(parsed.data);
    return NextResponse.json({
      ok: true,
      config: GeneralRulesDomain.toPublicConfig(doc),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error.";
    console.error("[API /api/admin/general-rules POST]", err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
