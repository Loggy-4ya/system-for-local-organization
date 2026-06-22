/**
 * @fileoverview Telegram Mini App authentication API route.
 *
 * POST /api/auth/telegram/mini-app — verify initData, auto-login or onboarding flag.
 *
 * @module src/app/api/auth/telegram/mini-app/route
 */

import { NextRequest, NextResponse } from "next/server";
import { AuthDomain } from "@shared/domains/AuthDomain";
import { createTelegramBridgeToken } from "@/lib/telegramBridge";

/**
 * Authenticate a Telegram Mini App visitor.
 *
 * @param req - JSON body `{ initData: string }`.
 * @returns Bridge token for returning users or onboarding metadata.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { initData?: string };
    const initData = body.initData?.trim();

    if (!initData) {
      return NextResponse.json({ error: "initData is required." }, { status: 400 });
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      return NextResponse.json(
        { error: "Telegram bot is not configured." },
        { status: 503 },
      );
    }

    const result = await AuthDomain.authenticateTelegramMiniApp(initData, botToken);

    if (result.status === "authenticated") {
      const bridgeToken = createTelegramBridgeToken(String(result.user._id));
      return NextResponse.json({
        needsOnboarding: false,
        bridgeToken,
        userId: String(result.user._id),
        harvestedPhone: result.user.phone ?? null,
      });
    }

    return NextResponse.json({
      needsOnboarding: true,
      telegramUser: result.telegramUser,
      harvestedPhone: result.harvestedPhone,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Telegram Mini App auth failed.";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
