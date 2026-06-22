/**
 * @fileoverview Active web task reminder toasts for the signed-in user.
 *
 * GET /api/notifications/task-reminders — undismissed performer reminders.
 *
 * @module src/app/api/notifications/task-reminders/route
 */

import { NextResponse } from "next/server";
import { TaskDomain } from "@shared/domains/TaskDomain";
import { requireApiSession } from "@/lib/authGuards";

/**
 * Return active task reminder toasts for the current session user.
 *
 * @returns Newest-first reminder toast payloads.
 */
export async function GET() {
  try {
    const session = await requireApiSession();
    const toasts = await TaskDomain.getActiveWebReminderToastsForUser(session.user.id);
    return NextResponse.json({ toasts });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load task reminders.";
    const status = message === "Unauthorized." ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
