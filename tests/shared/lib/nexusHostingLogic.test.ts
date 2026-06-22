/**
 * @fileoverview Unit tests for hosting mode resolution and env validation.
 *
 * Run: `npm run test:nexus-hosting-logic`
 * Registry: `.ai/docs/testing.md`
 *
 * @module tests/shared/lib/nexusHostingLogic.test
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildNexusHostingPolicy,
  hasCronSecretConfigured,
  resolveNexusHostingMode,
  validateNexusHostingConfiguration,
} from "@shared/lib/nexusHostingLogic";

describe("nexusHostingLogic", () => {
  it("defaults to vps when mode unset and not on Vercel", () => {
    assert.equal(resolveNexusHostingMode({}), "vps");
  });

  it("infers serverless on Vercel when mode unset", () => {
    assert.equal(resolveNexusHostingMode({ vercel: "1" }), "serverless");
  });

  it("respects explicit NEXUS_HOSTING_MODE", () => {
    assert.equal(resolveNexusHostingMode({ hostingMode: "hybrid" }), "hybrid");
  });

  it("disables in-process scheduler on serverless", () => {
    const policy = buildNexusHostingPolicy("serverless", {
      scheduledEventsTickIntervalSeconds: "15",
    });
    assert.equal(policy.scheduledEventsTickIntervalMs, 0);
    assert.equal(policy.allowInProcessScheduler, false);
  });

  it("allows in-process scheduler on vps", () => {
    const policy = buildNexusHostingPolicy("vps", {
      scheduledEventsTickIntervalSeconds: "15",
    });
    assert.equal(policy.scheduledEventsTickIntervalMs, 15000);
  });

  it("errors when serverless sets in-process tick", () => {
    const result = validateNexusHostingConfiguration({
      hostingMode: "serverless",
      nodeEnv: "production",
      scheduledEventsTickIntervalSeconds: "15",
      cronSecret: "secret",
      mediaStorageDriver: "gcs",
    });
    assert.ok(result.errors.some((e) => e.includes("SCHEDULED_EVENTS_TICK_INTERVAL_SECONDS")));
    assert.equal(result.shouldAbortBoot, true);
  });

  it("requires CRON_SECRET in production serverless", () => {
    const result = validateNexusHostingConfiguration({
      hostingMode: "serverless",
      nodeEnv: "production",
      mediaStorageDriver: "gcs",
    });
    assert.ok(result.errors.some((e) => e.includes("CRON_SECRET")));
  });

  it("rejects local media in production serverless", () => {
    const result = validateNexusHostingConfiguration({
      hostingMode: "serverless",
      nodeEnv: "production",
      cronSecret: "secret",
      mediaStorageDriver: "local",
    });
    assert.ok(result.errors.some((e) => e.includes("MEDIA_STORAGE_DRIVER=local")));
  });

  it("detects cron secret from either env var", () => {
    assert.equal(hasCronSecretConfigured({ cronSecret: "a" }), true);
    assert.equal(hasCronSecretConfigured({ nexusCronSecret: "b" }), true);
    assert.equal(hasCronSecretConfigured({}), false);
  });

  it("hybrid expects telegram worker warning when session missing", () => {
    const result = validateNexusHostingConfiguration({
      hostingMode: "hybrid",
      nodeEnv: "development",
      cronSecret: "secret",
      mediaStorageDriver: "gcs",
    });
    assert.ok(result.warnings.some((w) => w.includes("telegram-worker")));
  });
});
