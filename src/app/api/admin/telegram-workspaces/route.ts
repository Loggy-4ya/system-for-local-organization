/**
 * @fileoverview GET/PATCH institutional Telegram workspace automation settings.
 *
 * @module src/app/api/admin/telegram-workspaces/route
 */

import { NextRequest, NextResponse } from "next/server";
import { TelegramWorkspaceDomain } from "@shared/domains/TelegramWorkspaceDomain";
import { telegramAutomationSettingsUpdateSchema } from "@shared/validation/telegramWorkspaceSchemas";
import { formatZodErrors } from "@shared/validation/formatValidationErrors";
import { authGuardErrorStatus, requireAdminRole } from "@/lib/authGuards";

/**
 * GET /api/admin/telegram-workspaces
 */
export async function GET() {
  try {
    await requireAdminRole();
    const config = await TelegramWorkspaceDomain.getPublicConfig();
    return NextResponse.json({ config });
  } catch (err) {
    const status = authGuardErrorStatus(err);
    if (status === 401 || status === 403) {
      return NextResponse.json({ error: "Forbidden." }, { status });
    }
    console.error("[API /api/admin/telegram-workspaces GET]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/telegram-workspaces
 */
export async function PATCH(req: NextRequest) {
  try {
    await requireAdminRole();
    const body = await req.json();
    const parsed = telegramAutomationSettingsUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: formatZodErrors(parsed.error) }, { status: 400 });
    }

    const config = await TelegramWorkspaceDomain.updateSettings(parsed.data);
    return NextResponse.json({ config });
  } catch (err) {
    const status = authGuardErrorStatus(err);
    if (status === 401 || status === 403) {
      return NextResponse.json({ error: "Forbidden." }, { status });
    }
    console.error("[API /api/admin/telegram-workspaces PATCH]", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
