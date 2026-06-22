/**
 * @fileoverview Handler for Telegram workspace provisioning scheduler events.
 *
 * @module shared/lib/scheduledEventHandlers/handleTelegramWorkspaceProvision
 */

import { TelegramWorkspaceDomain } from "@shared/domains/TelegramWorkspaceDomain";

/**
 * Execute Telegram workspace provisioning for a task group.
 *
 * @param payload - Scheduler payload — must include `groupId`.
 */
export async function handleTelegramWorkspaceProvision(
  payload: Record<string, unknown>,
): Promise<void> {
  const groupId = typeof payload.groupId === "string" ? payload.groupId.trim() : "";
  if (!groupId) {
    throw new Error("telegram_workspace_provision payload requires a non-empty groupId.");
  }
  await TelegramWorkspaceDomain.executeProvisionJob(groupId);
}
