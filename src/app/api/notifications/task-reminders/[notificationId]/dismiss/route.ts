/**
 * @fileoverview Dismiss a task reminder web toast for the signed-in user.
 *
 * POST /api/notifications/task-reminders/[notificationId]/dismiss
 *
 * @module src/app/api/notifications/task-reminders/[notificationId]/dismiss/route
 */

import { NextRequest, NextResponse } from "next/server";
import { TaskDomain } from "@shared/domains/TaskDomain";
import { requireApiSession } from "@/lib/authGuards";

/**
 * Mark a task reminder toast as dismissed for the current user.
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
    await TaskDomain.dismissWebReminderToast(session.user.id, notificationId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to dismiss notification.";
    const status =
      message === "Unauthorized."
        ? 401
        : message === "NOTIFICATION_NOT_FOUND"
          ? 404
          : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
