/**
 * @fileoverview Web notification permission prompt state API.
 *
 * GET /api/notifications/web-prompt — whether to show the post-auth prompt.
 * POST /api/notifications/web-prompt — record enable/dismiss outcome.
 *
 * @module src/app/api/notifications/web-prompt/route
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { AuthDomain } from "@shared/domains/AuthDomain";
import { normalizeUserNotificationChannels } from "@shared/lib/userNotificationSettingsLogic";
import { webNotificationPromptSchema } from "@shared/validation/notificationPromptSchemas";

/**
 * Return prompt state for the signed-in user.
 *
 * @returns Prompt visibility flag and current channel preferences.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const user = await AuthDomain.getUserById(session.user.id);
  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  return NextResponse.json({
    needsPrompt: user.webNotificationPromptAt == null,
    notificationChannels: normalizeUserNotificationChannels(user.notificationChannels),
    hasLinkedTelegram: user.telegramId != null,
  });
}

/**
 * Record the user's response to the browser notification permission prompt.
 *
 * @param req - JSON body with `outcome` and optional `browserPermission`.
 * @returns Updated public user snapshot.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = webNotificationPromptSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }

    const user = await AuthDomain.getUserById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const patch: Parameters<typeof AuthDomain.updateProfile>[1] = {
      recordWebNotificationPrompt: true,
    };

    if (
      parsed.data.outcome === "enabled" &&
      parsed.data.browserPermission === "granted"
    ) {
      const channels = normalizeUserNotificationChannels(user.notificationChannels);
      if (!channels.includes("web")) {
        patch.notificationChannels = [...channels, "web"];
      }
    }

    const updated = await AuthDomain.updateProfile(session.user.id, patch);

    return NextResponse.json({
      ok: true,
      user: AuthDomain.toPublicUser(updated),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to save notification prompt.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
