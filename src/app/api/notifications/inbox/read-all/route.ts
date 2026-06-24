/**
 * @fileoverview Mark all inbox notifications read for the signed-in user.
 *
 * POST /api/notifications/inbox/read-all
 *
 * @module src/app/api/notifications/inbox/read-all/route
 */

import { NextResponse } from "next/server";
import { NotificationDomain } from "@shared/domains/NotificationDomain";
import { requireApiSession } from "@/lib/authGuards";

/**
 * Mark every unread inbox row read for the current user.
 *
 * @returns Count of rows updated.
 */
export async function POST() {
  try {
    const session = await requireApiSession();
    const updatedCount = await NotificationDomain.markAllRead(session.user.id);
    return NextResponse.json({ ok: true, updatedCount });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to mark notifications read.";
    const status = message === "Unauthorized." ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
