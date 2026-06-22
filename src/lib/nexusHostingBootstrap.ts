/**
 * @fileoverview Boot-time hosting validation and policy logging.
 *
 * @module src/lib/nexusHostingBootstrap
 */

import {
  NEXUS_HOSTING_MODE_LABELS,
  type NexusHostingMode,
} from "@shared/constants/nexusHosting";
import {
  type NexusHostingEffectivePolicy,
  type NexusHostingValidationResult,
  validateNexusHostingConfiguration,
} from "@shared/lib/nexusHostingLogic";

/** Cached validation from first boot pass. */
let cachedValidation: NexusHostingValidationResult | null = null;

/**
 * Run hosting validation once and cache the result.
 *
 * @returns Validation result.
 */
export function ensureNexusHostingValidated(): NexusHostingValidationResult {
  if (!cachedValidation) {
    cachedValidation = validateNexusHostingConfiguration();
  }
  return cachedValidation;
}

/**
 * Read resolved hosting mode after validation.
 *
 * @returns Active hosting mode.
 */
export function getNexusHostingMode(): NexusHostingMode {
  return ensureNexusHostingValidated().mode;
}

/**
 * Read effective hosting policy (scheduler intervals, storage rules).
 *
 * @returns Policy snapshot.
 */
export function getNexusHostingPolicy(): NexusHostingEffectivePolicy {
  return ensureNexusHostingValidated().policy;
}

/**
 * Validate hosting env on server boot; log warnings/errors and optionally abort.
 *
 * @throws When validation fails and {@link NexusHostingValidationResult.shouldAbortBoot} is true.
 */
export function bootstrapNexusHosting(): void {
  const result = ensureNexusHostingValidated();
  const label = NEXUS_HOSTING_MODE_LABELS[result.mode];

  console.info(
    `[Nexus Hosting] mode=${result.mode} (${label}) · in-process scheduler=${
      result.policy.scheduledEventsTickIntervalMs > 0 ? "on" : "off"
    } · cron required in prod=${result.policy.requireCronSecretInProduction}`,
  );

  for (const warning of result.warnings) {
    console.warn(`[Nexus Hosting] Warning: ${warning}`);
  }

  for (const error of result.errors) {
    console.error(`[Nexus Hosting] Error: ${error}`);
  }

  if (result.shouldAbortBoot) {
    throw new Error(
      `[Nexus Hosting] Invalid configuration for ${result.mode} — fix env vars or set NEXUS_HOSTING_STRICT=false for local experiments. ${result.errors.join(" ")}`,
    );
  }
}
