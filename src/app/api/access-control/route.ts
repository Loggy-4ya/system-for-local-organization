/**
 * @fileoverview REST API for singleton access-control settings.
 *
 * @module src/app/api/access-control/route
 */

import { NextRequest, NextResponse } from "next/server";
import { AccessControlDomain } from "@shared/domains/AccessControlDomain";
import {
  authGuardErrorStatus,
  requireAccessControlManager,
} from "@/lib/authGuards";

/**
 * GET /api/access-control — return public access-control configuration.
 *
 * @returns JSON hierarchy, permission matrix, and grant rules.
 */
export async function GET() {
  try {
    const doc = await AccessControlDomain.loadOrSeed();
    return NextResponse.json(AccessControlDomain.toPublicConfig(doc));
  } catch (err) {
    console.error("[API /api/access-control GET]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

/**
 * POST /api/access-control — update access-control settings.
 *
 * Requires `access_control.manage_settings` or legacy Admin role.
 *
 * @param req - JSON body partial {@link AccessControlSettingsConfig}.
 * @returns Updated configuration.
 */
export async function POST(req: NextRequest) {
  try {
    await requireAccessControlManager();
  } catch (err) {
    const status = authGuardErrorStatus(err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Forbidden." },
      { status: status === 500 ? 403 : status },
    );
  }

  try {
    const body = await req.json();
    const updated = await AccessControlDomain.update(body);
    return NextResponse.json({
      ok: true,
      config: AccessControlDomain.toPublicConfig(updated),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error.";
    console.error("[API /api/access-control POST]", err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
