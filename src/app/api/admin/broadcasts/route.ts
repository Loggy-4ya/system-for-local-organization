/**
 * @fileoverview Admin API for institution-wide broadcast messages.
 *
 * POST /api/admin/broadcasts — send to all users via web toast and/or Telegram DM.
 *
 * @module src/app/api/admin/broadcasts/route
 */

import { NextRequest, NextResponse } from "next/server";
import { BroadcastDomain } from "@shared/domains/BroadcastDomain";
import { sendBroadcastSchema } from "@shared/validation/broadcastSchemas";
import { formatZodErrors } from "@shared/validation/formatValidationErrors";
import { requireBroadcastSender } from "@/lib/authGuards";

/**
 * Send a system-wide broadcast to all registered users.
 *
 * Requires `notifications.broadcast` permission or legacy Admin role.
 *
 * @param req - JSON body with title, body, variant, channels, optional expiresAt.
 * @returns Delivery summary with broadcast id and per-channel stats.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await requireBroadcastSender();
    const body = await req.json();

    const parsed = sendBroadcastSchema.safeParse(body);
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

    const result = await BroadcastDomain.sendBroadcast(parsed.data, session.user.id);

    return NextResponse.json(
      {
        ok: true,
        broadcastId: result.broadcastId,
        deliveryStats: result.deliveryStats,
      },
      { status: 201 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Broadcast failed.";
    const status =
      message === "Unauthorized."
        ? 401
        : message === "Forbidden."
          ? 403
          : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
