/**
 * @fileoverview Dismiss a web broadcast toast for the signed-in user.
 *
 * POST /api/notifications/broadcasts/[broadcastId]/dismiss
 *
 * @module src/app/api/notifications/broadcasts/[broadcastId]/dismiss/route
 */

import { NextRequest, NextResponse } from "next/server";
import { BroadcastDomain } from "@shared/domains/BroadcastDomain";
import { requireApiSession } from "@/lib/authGuards";

/**
 * Mark a web toast as dismissed for the current user.
 *
 * @param _req - Incoming request (unused).
 * @param context - Route params with broadcast id.
 * @returns Success payload.
 */
export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ broadcastId: string }> },
) {
  try {
    const session = await requireApiSession();
    const { broadcastId } = await context.params;
    await BroadcastDomain.dismissWebToast(session.user.id, broadcastId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to dismiss notification.";
    const status =
      message === "Unauthorized."
        ? 401
        : message === "Broadcast not found."
          ? 404
          : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
