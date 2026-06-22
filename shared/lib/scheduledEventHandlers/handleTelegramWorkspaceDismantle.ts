/**
 * @fileoverview Handler for Telegram workspace dismantle scheduler events.
 *
 * @module shared/lib/scheduledEventHandlers/handleTelegramWorkspaceDismantle
 */

import { TelegramWorkspaceDomain } from "@shared/domains/TelegramWorkspaceDomain";

/**
 * Execute Telegram workspace dismantle for a completed/cancelled project.
 *
 * @param payload - Scheduler payload — must include `groupId`.
 */
export async function handleTelegramWorkspaceDismantle(
  payload: Record<string, unknown>,
): Promise<void> {
  const groupId = typeof payload.groupId === "string" ? payload.groupId.trim() : "";
  if (!groupId) {
    throw new Error("telegram_workspace_dismantle payload requires a non-empty groupId.");
  }
  await TelegramWorkspaceDomain.executeDismantleJob(groupId);
}
