/**
 * @fileoverview Environment readers for the MTProto telegram-worker service.
 *
 * @module shared/lib/telegramOperatorEnv
 *
 * Tests: `npm run test:telegram-operator-env`
 */

/** Snapshot of operator MTProto credentials. */
export interface TelegramOperatorEnvSnapshot {
  /** Telegram API id from my.telegram.org. */
  apiId?: string;
  /** Telegram API hash from my.telegram.org. */
  apiHash?: string;
  /** GramJS string session export. */
  operatorSession?: string;
  /** Bot token for promoting the bot inside created groups. */
  botToken?: string;
}

/**
 * Read operator env from `process.env`.
 *
 * @param env - Environment map (defaults to `process.env`).
 * @returns Normalized snapshot.
 */
export function readTelegramOperatorEnv(
  env: Record<string, string | undefined> = process.env,
): TelegramOperatorEnvSnapshot {
  return {
    apiId: env.TELEGRAM_API_ID?.trim(),
    apiHash: env.TELEGRAM_API_HASH?.trim(),
    operatorSession: env.TELEGRAM_OPERATOR_SESSION?.trim(),
    botToken: env.TELEGRAM_BOT_TOKEN?.trim(),
  };
}

/**
 * Whether MTProto auto-provision can run in the current environment.
 *
 * @param snapshot - Operator env snapshot.
 * @returns True when api id/hash, session, and bot token are set.
 */
export function isTelegramOperatorEnvConfigured(
  snapshot: TelegramOperatorEnvSnapshot = readTelegramOperatorEnv(),
): boolean {
  return Boolean(
    snapshot.apiId &&
      snapshot.apiHash &&
      snapshot.operatorSession &&
      snapshot.botToken &&
      Number.parseInt(snapshot.apiId, 10) > 0,
  );
}

/**
 * List missing operator env keys for diagnostics.
 *
 * @param snapshot - Operator env snapshot.
 * @returns Human-readable missing variable names.
 */
export function missingTelegramOperatorEnvKeys(
  snapshot: TelegramOperatorEnvSnapshot = readTelegramOperatorEnv(),
): string[] {
  const missing: string[] = [];
  if (!snapshot.apiId || Number.parseInt(snapshot.apiId, 10) <= 0) {
    missing.push("TELEGRAM_API_ID");
  }
  if (!snapshot.apiHash) missing.push("TELEGRAM_API_HASH");
  if (!snapshot.operatorSession) missing.push("TELEGRAM_OPERATOR_SESSION");
  if (!snapshot.botToken) missing.push("TELEGRAM_BOT_TOKEN");
  return missing;
}
