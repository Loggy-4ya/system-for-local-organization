/**
 * @fileoverview Pure hosting-mode resolution and environment validation.
 *
 * Nexus deploys on always-on AWS EC2 / Docker (`vps`). In-process scheduler and
 * optional HTTP cron via `CRON_SECRET` / `NEXUS_CRON_SECRET`.
 *
 * @module shared/lib/nexusHostingLogic
 *
 * Tests: `npm run test:nexus-hosting-logic`
 * Registry: `.ai/docs/testing.md`
 */

import {
  NEXUS_HOSTING_MODE_ENV,
  NEXUS_HOSTING_MODES,
  NEXUS_HOSTING_STRICT_ENV,
  type NexusHostingMode,
} from "@shared/constants/nexusHosting";

/** Snapshot of env vars relevant to hosting validation. */
export interface NexusHostingEnvSnapshot {
  /** Explicit {@link NEXUS_HOSTING_MODE_ENV} value. */
  hostingMode?: string;
  /** In-process scheduled-events tick interval (seconds). */
  scheduledEventsTickIntervalSeconds?: string;
  /** In-process media orphan cleanup interval (hours). */
  mediaOrphanCleanupIntervalHours?: string;
  /** Bearer secret for HTTP cron routes. */
  cronSecret?: string;
  /** Alias cron secret for external crontab. */
  nexusCronSecret?: string;
  /** Media storage driver (`local` | `s3`). */
  mediaStorageDriver?: string;
  /** MTProto operator session for telegram-worker. */
  telegramOperatorSession?: string;
  /** Node environment. */
  nodeEnv?: string;
  /** Fail boot on validation errors. */
  hostingStrict?: string;
}

/** Effective capabilities after applying hosting mode rules. */
export interface NexusHostingEffectivePolicy {
  /** Hosting profile in use. */
  mode: NexusHostingMode;
  /** Whether in-process `setInterval` scheduler may run. */
  allowInProcessScheduler: boolean;
  /** Whether in-process media orphan cleanup may run. */
  allowInProcessMediaCleanup: boolean;
  /** Whether HTTP cron secret is required (production). */
  requireCronSecretInProduction: boolean;
  /** Whether `MEDIA_STORAGE_DRIVER=local` is allowed in production. */
  allowLocalMediaInProduction: boolean;
  /** Whether a separate telegram-worker is expected for auto-create. */
  telegramWorkerExpected: boolean;
  /** Resolved tick interval ms (0 when disallowed). */
  scheduledEventsTickIntervalMs: number;
  /** Resolved cleanup interval hours (0 when disallowed). */
  mediaOrphanCleanupIntervalHours: number;
}

/** Result of validating hosting configuration. */
export interface NexusHostingValidationResult {
  /** Resolved hosting mode. */
  mode: NexusHostingMode;
  /** Effective policy after mode rules. */
  policy: NexusHostingEffectivePolicy;
  /** Non-fatal misconfiguration hints. */
  warnings: string[];
  /** Fatal misconfiguration messages. */
  errors: string[];
  /** Whether boot should abort when strict or production. */
  shouldAbortBoot: boolean;
}

/**
 * Read hosting-related env from `process.env`.
 *
 * @param env - Environment map (defaults to `process.env`).
 * @returns Normalized snapshot for validation.
 */
export function readNexusHostingEnvSnapshot(
  env: Record<string, string | undefined> = process.env,
): NexusHostingEnvSnapshot {
  return {
    hostingMode: env[NEXUS_HOSTING_MODE_ENV]?.trim(),
    scheduledEventsTickIntervalSeconds: env.SCHEDULED_EVENTS_TICK_INTERVAL_SECONDS?.trim(),
    mediaOrphanCleanupIntervalHours: env.MEDIA_ORPHAN_CLEANUP_INTERVAL_HOURS?.trim(),
    cronSecret: env.CRON_SECRET?.trim(),
    nexusCronSecret: env.NEXUS_CRON_SECRET?.trim(),
    mediaStorageDriver: env.MEDIA_STORAGE_DRIVER?.trim()?.toLowerCase(),
    telegramOperatorSession: env.TELEGRAM_OPERATOR_SESSION?.trim(),
    nodeEnv: env.NODE_ENV?.trim(),
    hostingStrict: env[NEXUS_HOSTING_STRICT_ENV]?.trim(),
  };
}

/**
 * Whether a string is a valid hosting mode slug.
 *
 * @param value - Candidate mode.
 * @returns True when registered.
 */
export function isNexusHostingMode(value: string): value is NexusHostingMode {
  return (NEXUS_HOSTING_MODES as readonly string[]).includes(value);
}

/**
 * Resolve hosting mode from explicit env (defaults to `vps`).
 *
 * @param snapshot - Hosting env snapshot.
 * @returns Resolved mode.
 */
export function resolveNexusHostingMode(snapshot: NexusHostingEnvSnapshot): NexusHostingMode {
  const explicit = snapshot.hostingMode?.toLowerCase();
  if (explicit && isNexusHostingMode(explicit)) {
    return explicit;
  }
  return "vps";
}

/**
 * Parse a positive float from an env string.
 *
 * @param raw - Env value.
 * @returns Parsed number or 0.
 */
function parsePositiveFloat(raw: string | undefined): number {
  if (!raw) return 0;
  const value = Number.parseFloat(raw);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

/**
 * Whether production-grade HTTP cron auth is configured.
 *
 * @param snapshot - Hosting env snapshot.
 * @returns True when CRON_SECRET or NEXUS_CRON_SECRET is set.
 */
export function hasCronSecretConfigured(snapshot: NexusHostingEnvSnapshot): boolean {
  return Boolean(snapshot.cronSecret || snapshot.nexusCronSecret);
}

/**
 * Build effective policy for always-on VPS / EC2 hosting.
 *
 * @param mode - Hosting profile (always `vps`).
 * @param snapshot - Raw env snapshot.
 * @returns Policy with clamped scheduler intervals.
 */
export function buildNexusHostingPolicy(
  mode: NexusHostingMode,
  snapshot: NexusHostingEnvSnapshot,
): NexusHostingEffectivePolicy {
  const tickSeconds = parsePositiveFloat(snapshot.scheduledEventsTickIntervalSeconds);
  const cleanupHours = parsePositiveFloat(snapshot.mediaOrphanCleanupIntervalHours);
  const hasOperatorSession = Boolean(snapshot.telegramOperatorSession);

  return {
    mode,
    allowInProcessScheduler: true,
    allowInProcessMediaCleanup: true,
    requireCronSecretInProduction: false,
    allowLocalMediaInProduction: false,
    telegramWorkerExpected: hasOperatorSession,
    scheduledEventsTickIntervalMs: tickSeconds > 0 ? tickSeconds * 1000 : 0,
    mediaOrphanCleanupIntervalHours: cleanupHours,
  };
}

/**
 * Validate hosting env against the resolved mode policy.
 *
 * @param snapshot - Hosting env snapshot.
 * @returns Validation result with warnings, errors, and effective policy.
 */
export function validateNexusHostingConfiguration(
  snapshot: NexusHostingEnvSnapshot = readNexusHostingEnvSnapshot(),
): NexusHostingValidationResult {
  const warnings: string[] = [];
  const errors: string[] = [];
  const isProduction = snapshot.nodeEnv === "production";

  const explicit = snapshot.hostingMode?.toLowerCase();
  if (explicit && !isNexusHostingMode(explicit)) {
    errors.push(
      `Invalid ${NEXUS_HOSTING_MODE_ENV}="${snapshot.hostingMode}". Use: ${NEXUS_HOSTING_MODES.join(", ")}.`,
    );
  }

  const mode = resolveNexusHostingMode(snapshot);
  const policy = buildNexusHostingPolicy(mode, snapshot);

  const tickSeconds = parsePositiveFloat(snapshot.scheduledEventsTickIntervalSeconds);
  const driver = snapshot.mediaStorageDriver ?? "local";

  if (isProduction && driver !== "s3") {
    errors.push(
      "MEDIA_STORAGE_DRIVER=s3 is required in production. Configure S3_MEDIA_BUCKET, S3_MEDIA_REGION, and IAM credentials on EC2.",
    );
  }

  if (isProduction && tickSeconds === 0 && !hasCronSecretConfigured(snapshot)) {
    warnings.push(
      "Production has no in-process scheduler: set SCHEDULED_EVENTS_TICK_INTERVAL_SECONDS or configure HTTP cron with CRON_SECRET.",
    );
  }

  if (tickSeconds > 0 && hasCronSecretConfigured(snapshot)) {
    warnings.push(
      "Both in-process scheduler and HTTP cron secrets are set — only one is usually needed on EC2.",
    );
  }

  if (!snapshot.telegramOperatorSession) {
    warnings.push(
      "TELEGRAM_OPERATOR_SESSION is unset — telegram-worker cannot auto-create project groups (manual /link only).",
    );
  }

  const strict = snapshot.hostingStrict === "true" || snapshot.hostingStrict === "1";
  const shouldAbortBoot = errors.length > 0 && (strict || isProduction);

  return {
    mode,
    policy,
    warnings,
    errors,
    shouldAbortBoot,
  };
}
