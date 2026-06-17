/**
 * @fileoverview Telegram account unlink API route.
 *
 * DELETE /api/profile/telegram — session-required Telegram disconnection.
 *
 * @module src/app/api/profile/telegram/route
 */

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { AuthDomain } from "@shared/domains/AuthDomain";

/**
 * Unlink Telegram from the authenticated user's account.
 *
 * @returns Updated public user object.
 */
export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const user = await AuthDomain.unlinkTelegram(session.user.id);
    return NextResponse.json({ user: AuthDomain.toPublicUser(user) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to unlink Telegram.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
