/**
 * @fileoverview Paginated personal notification inbox for the signed-in user.
 *
 * GET /api/notifications/inbox — list rows with unread count and pagination meta.
 *
 * @module src/app/api/notifications/inbox/route
 */

import { NextRequest, NextResponse } from "next/server";
import { NotificationDomain } from "@shared/domains/NotificationDomain";
import { notificationInboxListQuerySchema } from "@shared/validation/notificationInboxSchemas";
import { requireApiSession } from "@/lib/authGuards";

/**
 * Return paginated inbox notifications for the current session user.
 *
 * @param req - Incoming request with optional `page`, `limit`, `unreadOnly`.
 * @returns Inbox list payload.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await requireApiSession();
    const params = Object.fromEntries(req.nextUrl.searchParams.entries());
    const query = notificationInboxListQuerySchema.parse(params);
    const result = await NotificationDomain.listForUser(session.user.id, query);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load notifications.";
    const status = message === "Unauthorized." ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
