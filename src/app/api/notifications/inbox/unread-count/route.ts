/**
 * @fileoverview Unread notification count for header badge polling.
 *
 * GET /api/notifications/inbox/unread-count
 *
 * @module src/app/api/notifications/inbox/unread-count/route
 */

import { NextResponse } from "next/server";
import { NotificationDomain } from "@shared/domains/NotificationDomain";
import { requireApiSession } from "@/lib/authGuards";

/**
 * Return unread inbox row count for the signed-in user.
 *
 * @returns `{ unreadCount }` payload.
 */
export async function GET() {
  try {
    const session = await requireApiSession();
    const unreadCount = await NotificationDomain.getUnreadCount(session.user.id);
    return NextResponse.json({ unreadCount });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load unread count.";
    const status = message === "Unauthorized." ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
