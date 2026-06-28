/**
 * @fileoverview Deployment hosting mode — always-on AWS EC2 / Docker (VPS).
 *
 * @module shared/constants/nexusHosting
 */

/** Supported Nexus deployment profile (AWS EC2 / Docker always-on Node). */
export const NEXUS_HOSTING_MODES = ["vps"] as const;

/** Active hosting profile — drives scheduler and storage guardrails. */
export type NexusHostingMode = (typeof NEXUS_HOSTING_MODES)[number];

/** Human-readable labels for admin and logs. */
export const NEXUS_HOSTING_MODE_LABELS: Record<NexusHostingMode, string> = {
  vps: "AWS EC2 / Docker (always-on Node)",
};

/** Env var that selects the hosting profile (`vps` — default when unset). */
export const NEXUS_HOSTING_MODE_ENV = "NEXUS_HOSTING_MODE";

/** When true, misconfigured hosting env vars fail server boot. */
export const NEXUS_HOSTING_STRICT_ENV = "NEXUS_HOSTING_STRICT";
