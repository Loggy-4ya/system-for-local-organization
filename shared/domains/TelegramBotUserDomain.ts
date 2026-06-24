/**
 * @fileoverview Resolve Telegram senders to Nexus users for bot command gating.
 *
 * @module shared/domains/TelegramBotUserDomain
 *
 * Tests: `npm run test:telegram-bot-user-logic`
 */

import connectDB from "@shared/lib/db";
import { AccessControlDomain } from "@shared/domains/AccessControlDomain";
import { buildTaskActor } from "@shared/domains/TaskDomain";
import {
  classifyTelegramBotUser,
  formatTelegramBotMissingFieldLabels,
  profileOnboardingSliceFromTelegramUser,
  type TelegramBotUserKind,
} from "@shared/lib/telegramBotUserLogic";
import type { TaskActorSlice } from "@shared/lib/taskAccessLogic";
import User from "@shared/models/User";

/** Resolved Nexus identity for a Telegram sender. */
export interface TelegramBotUserResolution {
  /** Registration readiness relative to bot task commands. */
  kind: TelegramBotUserKind;
  /** Task actor when {@link kind} is `ready`. */
  actor: TaskActorSlice | null;
  /** Comma-separated missing field labels when {@link kind} is `incomplete`. */
  missingFieldLabels: string | null;
}

/**
 * Telegram bot user resolution domain.
 */
export const TelegramBotUserDomain = {
  /**
   * Resolve a Telegram user id to Nexus registration state and optional actor.
   *
   * @param telegramUserId - Numeric Telegram sender id from Bot API updates.
   * @returns Registration kind, actor when ready, and missing-field labels when incomplete.
   */
  async resolve(telegramUserId: number): Promise<TelegramBotUserResolution> {
    await connectDB();

    const user = await User.findOne({ telegramId: telegramUserId });
    if (!user) {
      return { kind: "unknown", actor: null, missingFieldLabels: null };
    }

    const slice = profileOnboardingSliceFromTelegramUser(user);
    const kind = classifyTelegramBotUser(slice);

    if (kind === "incomplete") {
      return {
        kind,
        actor: null,
        missingFieldLabels: formatTelegramBotMissingFieldLabels(slice),
      };
    }

    const permissions = await AccessControlDomain.resolvePermissionsForUser(user);
    return {
      kind: "ready",
      actor: buildTaskActor(user, permissions),
      missingFieldLabels: null,
    };
  },
};

export default TelegramBotUserDomain;
