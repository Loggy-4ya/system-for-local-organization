/**
 * @fileoverview Telegram Mini App onboarding registration API route.
 *
 * POST /api/auth/telegram/mini-app/register — create account + link telegramId.
 *
 * @module src/app/api/auth/telegram/mini-app/register/route
 */

import { NextRequest, NextResponse } from "next/server";
import { AuthDomain } from "@shared/domains/AuthDomain";
import { createTelegramBridgeToken } from "@/lib/telegramBridge";
import { signupSchema } from "@shared/validation/authSchemas";
import { formatZodErrors } from "@shared/validation/formatValidationErrors";

/**
 * Register a new user from Telegram Mini App onboarding.
 *
 * @param req - JSON body with `initData` and signup fields.
 * @returns Bridge token for session sign-in.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const initData = typeof body.initData === "string" ? body.initData.trim() : "";

    if (!initData) {
      return NextResponse.json({ error: "initData is required." }, { status: 400 });
    }

    const parsed = signupSchema.safeParse({
      login: body.login,
      email: body.email,
      password: body.password,
      phone: body.phone,
      specialty: body.specialty,
      group: body.group,
      studentTitle: body.studentTitle,
    });

    if (!parsed.success) {
      const formatted = formatZodErrors(parsed.error);
      return NextResponse.json(
        {
          error: formatted.formError || "Validation failed.",
          fieldErrors: formatted.fieldErrors,
        },
        { status: 400 },
      );
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      return NextResponse.json(
        { error: "Telegram bot is not configured." },
        { status: 503 },
      );
    }

    const user = await AuthDomain.registerFromTelegramMiniApp(initData, {
      login: parsed.data.login,
      email: parsed.data.email,
      password: parsed.data.password,
      phone: parsed.data.phone,
      name: parsed.data.login,
      specialty: parsed.data.specialty,
      group: parsed.data.group,
      studentTitle: parsed.data.studentTitle,
    }, botToken);

    const bridgeToken = createTelegramBridgeToken(String(user._id));

    return NextResponse.json({
      bridgeToken,
      userId: String(user._id),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Telegram registration failed.";
    const status = message.includes("already exists") || message.includes("already linked")
      ? 409
      : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
