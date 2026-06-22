/**
 * @fileoverview CLI entrypoint for MTProto telegram-worker (`npm run worker:telegram`).
 *
 * Polls MongoDB for operator provisioning and maintenance jobs (forum topics,
 * member sync, group dismantle).
 *
 * @module scripts/telegramWorker
 */

import connectDB from "@shared/lib/db";
import { TelegramOperatorDomain } from "@shared/domains/TelegramOperatorDomain";
import { missingTelegramOperatorEnvKeys } from "@shared/lib/telegramOperatorEnv";

const DEFAULT_POLL_MS = 15_000;

/**
 * Read worker poll interval from env.
 *
 * @returns Interval in milliseconds.
 */
function readPollIntervalMs(): number {
  const raw = process.env.TELEGRAM_WORKER_POLL_SECONDS?.trim();
  if (!raw) return DEFAULT_POLL_MS;
  const seconds = Number.parseFloat(raw);
  return Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : DEFAULT_POLL_MS;
}

/**
 * Run one worker tick.
 */
async function runTick(): Promise<void> {
  const results = await TelegramOperatorDomain.processPendingJobs();
  for (const result of results) {
    if (result.ok) {
      console.info(`[telegram-worker] ${result.kind} ok for group ${result.groupId}`);
    } else {
      console.error(
        `[telegram-worker] ${result.kind} failed for group ${result.groupId}: ${result.error}`,
      );
    }
  }
}

/**
 * Main worker loop.
 */
async function main(): Promise<void> {
  if (!TelegramOperatorDomain.isConfigured()) {
    const missing = missingTelegramOperatorEnvKeys();
    console.error(
      `[telegram-worker] Missing env: ${missing.join(", ")}. Set credentials and restart.`,
    );
    process.exit(1);
  }

  await connectDB();
  const pollMs = readPollIntervalMs();
  console.info(`[telegram-worker] started — polling every ${pollMs / 1000}s`);

  await runTick();
  setInterval(() => {
    void runTick().catch((err) => {
      console.error("[telegram-worker] tick error:", err);
    });
  }, pollMs);
}

main().catch((err) => {
  console.error("[telegram-worker] fatal:", err);
  process.exit(1);
});
