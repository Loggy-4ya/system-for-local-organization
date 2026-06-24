/**
 * @fileoverview Mark one inbox notification read for the signed-in user.
 *
 * POST /api/notifications/inbox/[notificationId]/read
 *
 * @module src/app/api/notifications/inbox/[notificationId]/read/route
 */

import { NextRequest, NextResponse } from "next/server";
import { NotificationDomain } from "@shared/domains/NotificationDomain";
import { requireApiSession } from "@/lib/authGuards";

/**
 * Mark a single inbox row read.
 *
 * @param _req - Incoming request (unused).
 * @param context - Route params with notification id.
 * @returns Success payload.
 */
export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ notificationId: string }> },
) {
  try {
    const session = await requireApiSession();
    const { notificationId } = await context.params;
    await NotificationDomain.markRead(session.user.id, notificationId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to mark notification read.";
    const status =
      message === "Unauthorized."
        ? 401
        : message === "NOTIFICATION_NOT_FOUND"
          ? 404
          : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
