/**
 * Auto viewport preset selection and manual preset preservation.
 *
 * Run: `npm run test:resolve-auto-viewport`
 * Registry: `.ai/docs/testing.md`
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  resolveAutoViewport,
  shouldPreserveFixedViewportPreset,
} from "@/components/puck/lib/resolveAutoViewport";

describe("shouldPreserveFixedViewportPreset", () => {
  it("preserves numeric Phone / Tablet / Desktop widths", () => {
    assert.equal(shouldPreserveFixedViewportPreset(360), true);
    assert.equal(shouldPreserveFixedViewportPreset(1280), true);
  });

  it("allows auto-sync for full-width", () => {
    assert.equal(shouldPreserveFixedViewportPreset("100%"), false);
  });
});

describe("resolveAutoViewport", () => {
  it("prefers full-width when closest fixed preset is narrower than the frame", () => {
    const preset = resolveAutoViewport(1400, 900);
    assert.equal(preset.width, "100%");
  });
});
