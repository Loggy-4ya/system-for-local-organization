/**
 * @fileoverview Telegram Login Widget verification API route.
 *
 * POST /api/auth/telegram — verifies widget HMAC, upserts user, returns bridge token
 * for client-side signIn("credentials", { bridgeToken }).
 *
 * @module src/app/api/auth/telegram/route
 */

import { NextRequest, NextResponse } from "next/server";
import { AuthDomain } from "@shared/domains/AuthDomain";
import type { TelegramWidgetPayload } from "@shared/domains/AuthDomain";
import { createTelegramBridgeToken } from "@/lib/telegramBridge";

/**
 * Verify Telegram widget payload and issue a session bridge token.
 *
 * @param req - JSON body matching Telegram Login Widget callback shape.
 * @returns Bridge token for Credentials sign-in.
 */
export async function POST(req: NextRequest) {
  try {
    const payload = (await req.json()) as TelegramWidgetPayload;
    const botToken = process.env.TELEGRAM_BOT_TOKEN;

    if (!botToken) {
      return NextResponse.json(
        { error: "Telegram bot is not configured." },
        { status: 503 }
      );
    }

    const user = await AuthDomain.verifyTelegramLoginWidget(payload, botToken);
    const bridgeToken = createTelegramBridgeToken(String(user._id));

    return NextResponse.json({ bridgeToken, userId: String(user._id) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Telegram verification failed.";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
