/**
 * @fileoverview Telegram Bot API webhook route.
 *
 * POST /api/telegram/webhook — handles `/start` and future bot commands.
 *
 * @module src/app/api/telegram/webhook/route
 */

import { NextRequest, NextResponse } from "next/server";
import { TelegramBotDomain, type TelegramBotUpdate } from "@shared/domains/TelegramBotDomain";

/**
 * Handle inbound Telegram Bot API updates.
 *
 * @param req - Webhook POST body from Telegram.
 * @returns Empty 200 response per Bot API requirements.
 */
export async function POST(req: NextRequest) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    return NextResponse.json({ error: "Telegram bot is not configured." }, { status: 503 });
  }

  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  if (webhookSecret) {
    const headerSecret = req.headers.get("x-telegram-bot-api-secret-token");
    if (headerSecret !== webhookSecret) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
  }

  try {
    const update = (await req.json()) as TelegramBotUpdate;
    await TelegramBotDomain.handleUpdate(update, botToken);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[telegram/webhook]", err);
    return NextResponse.json({ ok: true });
  }
}
