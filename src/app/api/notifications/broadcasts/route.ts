/**
 * @fileoverview Active web broadcast toasts for the signed-in user.
 *
 * GET /api/notifications/broadcasts — undismissed toast messages.
 *
 * @module src/app/api/notifications/broadcasts/route
 */

import { NextResponse } from "next/server";
import { BroadcastDomain } from "@shared/domains/BroadcastDomain";
import { requireApiSession } from "@/lib/authGuards";

/**
 * Return active web toast broadcasts for the current session user.
 *
 * @returns Newest-first toast payloads.
 */
export async function GET() {
  try {
    const session = await requireApiSession();
    const toasts = await BroadcastDomain.getActiveWebToastsForUser(session.user.id);
    return NextResponse.json({ toasts });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load notifications.";
    const status = message === "Unauthorized." ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
