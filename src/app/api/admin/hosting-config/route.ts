/**
 * @fileoverview GET current hosting mode and validation summary (admin).
 *
 * @module src/app/api/admin/hosting-config/route
 */

import { NextResponse } from "next/server";
import { NEXUS_HOSTING_MODE_LABELS } from "@shared/constants/nexusHosting";
import { validateNexusHostingConfiguration } from "@shared/lib/nexusHostingLogic";
import { authGuardErrorStatus, requireAdminRole } from "@/lib/authGuards";

/**
 * GET /api/admin/hosting-config — resolved mode, policy, warnings, errors.
 */
export async function GET() {
  try {
    await requireAdminRole();
    const validation = validateNexusHostingConfiguration();

    return NextResponse.json({
      mode: validation.mode,
      modeLabel: NEXUS_HOSTING_MODE_LABELS[validation.mode],
      policy: validation.policy,
      warnings: validation.warnings,
      errors: validation.errors,
      healthy: validation.errors.length === 0,
    });
  } catch (err) {
    const status = authGuardErrorStatus(err);
    if (status === 401 || status === 403) {
      return NextResponse.json({ error: "Forbidden." }, { status });
    }
    console.error("[API /api/admin/hosting-config GET]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
