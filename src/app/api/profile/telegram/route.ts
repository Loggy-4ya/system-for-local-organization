/**
 * @fileoverview Telegram account link and unlink API routes.
 *
 * POST /api/profile/telegram — link Login Widget identity to the session user.
 * DELETE /api/profile/telegram — session-required Telegram disconnection.
 *
 * @module src/app/api/profile/telegram/route
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { AuthDomain } from "@shared/domains/AuthDomain";
import type { TelegramWidgetPayload } from "@shared/domains/AuthDomain";
import { telegramWidgetPayloadSchema } from "@shared/validation/authSchemas";

/**
 * Link Telegram to the authenticated user's account.
 *
 * @param req - JSON body matching Telegram Login Widget callback shape.
 * @returns Updated public user object.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = (await req.json()) as TelegramWidgetPayload;
    const parsed = telegramWidgetPayloadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid Telegram payload." }, { status: 400 });
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      return NextResponse.json({ error: "Telegram bot is not configured." }, { status: 503 });
    }

    const user = await AuthDomain.linkTelegramProfile(
      session.user.id,
      parsed.data,
      botToken,
    );

    return NextResponse.json({ user: AuthDomain.toPublicUser(user) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to link Telegram.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

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
