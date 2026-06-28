/**
 * @fileoverview Unit tests for hosting mode resolution and env validation.
 *
 * Run: `npm run test:run -- nexus-hosting-logic`
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
  it("defaults to vps when mode unset", () => {
    assert.equal(resolveNexusHostingMode({}), "vps");
  });

  it("respects explicit NEXUS_HOSTING_MODE=vps", () => {
    assert.equal(resolveNexusHostingMode({ hostingMode: "vps" }), "vps");
  });

  it("allows in-process scheduler on vps", () => {
    const policy = buildNexusHostingPolicy("vps", {
      scheduledEventsTickIntervalSeconds: "15",
    });
    assert.equal(policy.scheduledEventsTickIntervalMs, 15000);
  });

  it("requires S3 media in production", () => {
    const result = validateNexusHostingConfiguration({
      nodeEnv: "production",
      mediaStorageDriver: "local",
      scheduledEventsTickIntervalSeconds: "15",
    });
    assert.ok(result.errors.some((e) => e.includes("MEDIA_STORAGE_DRIVER=s3")));
    assert.equal(result.shouldAbortBoot, true);
  });

  it("accepts S3 media in production", () => {
    const result = validateNexusHostingConfiguration({
      nodeEnv: "production",
      mediaStorageDriver: "s3",
      scheduledEventsTickIntervalSeconds: "15",
    });
    assert.equal(result.errors.length, 0);
  });

  it("rejects invalid hosting mode", () => {
    const result = validateNexusHostingConfiguration({
      hostingMode: "serverless",
      nodeEnv: "production",
      mediaStorageDriver: "s3",
    });
    assert.ok(result.errors.some((e) => e.includes("Invalid NEXUS_HOSTING_MODE")));
  });

  it("detects cron secret from either env var", () => {
    assert.equal(hasCronSecretConfigured({ cronSecret: "a" }), true);
    assert.equal(hasCronSecretConfigured({ nexusCronSecret: "b" }), true);
    assert.equal(hasCronSecretConfigured({}), false);
  });

  it("warns when telegram operator session missing", () => {
    const result = validateNexusHostingConfiguration({
      nodeEnv: "development",
      mediaStorageDriver: "local",
    });
    assert.ok(result.warnings.some((w) => w.includes("TELEGRAM_OPERATOR_SESSION")));
  });
});
