/**
 * @fileoverview Deployment hosting modes for VPS, serverless, and hybrid layouts.
 *
 * @module shared/constants/nexusHosting
 */

/** Supported Nexus deployment profiles. */
export const NEXUS_HOSTING_MODES = ["vps", "serverless", "hybrid"] as const;

/** Active hosting profile — drives scheduler and storage guardrails. */
export type NexusHostingMode = (typeof NEXUS_HOSTING_MODES)[number];

/** Human-readable labels for admin and logs. */
export const NEXUS_HOSTING_MODE_LABELS: Record<NexusHostingMode, string> = {
  vps: "VPS / Docker (always-on Node)",
  serverless: "Serverless (Vercel / HTTP cron)",
  hybrid: "Hybrid (serverless web + always-on worker)",
};

/** Env var that selects the hosting profile. */
export const NEXUS_HOSTING_MODE_ENV = "NEXUS_HOSTING_MODE";

/** When true, misconfigured hosting env vars fail server boot. */
export const NEXUS_HOSTING_STRICT_ENV = "NEXUS_HOSTING_STRICT";
