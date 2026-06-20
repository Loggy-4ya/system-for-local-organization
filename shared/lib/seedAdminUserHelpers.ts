/**
 * @fileoverview Pure helpers for admin seed user maintenance.
 *
 * Tests: `tests/shared/lib/seedAdminUser.test.ts` — `npm run test:seed-admin-user`
 *
 * @module shared/lib/seedAdminUserHelpers
 */

import type { IUser } from "@shared/models/User";

/**
 * Remove Telegram linkage fields from a user document in memory.
 *
 * @param user - User fields to mutate.
 * @returns Whether any Telegram fields were cleared.
 */
export function clearTelegramLinkage(
  user: Pick<IUser, "telegramId" | "username" | "lastTelegramSyncAt">,
): boolean {
  if (!user.telegramId) {
    return false;
  }

  user.telegramId = null;
  user.username = null;
  user.lastTelegramSyncAt = null;
  return true;
}
