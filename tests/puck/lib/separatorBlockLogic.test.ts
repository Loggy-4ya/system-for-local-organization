/**
 * @fileoverview Unit tests for unified spacer/divider preset logic.
 *
 * Run: npm run test:separator-block
 * Registry: .ai/docs/testing.md
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applySeparatorStylePreset,
  inferSeparatorStylePreset,
  normalizeSeparatorProps,
  resolveSeparatorRenderModel,
} from "../../../src/components/puck/lib/separatorBlockLogic";

describe("applySeparatorStylePreset", () => {
  it("bundles space-only presets without a line", () => {
    const props = applySeparatorStylePreset("space-md");
    assert.equal(props.showLine, "no");
    assert.deepEqual(props.height, { preset: "md", custom: "16px" });
  });

  it("bundles full-width divider presets with zero height", () => {
    const props = applySeparatorStylePreset("line-full-thick");
    assert.equal(props.showLine, "yes");
    assert.deepEqual(props.height, { preset: "none", custom: "0px" });
    assert.deepEqual(props.thickness, { preset: "4px", custom: "4px" });
  });

  it("bundles section breaks with spacing and a line", () => {
    const props = applySeparatorStylePreset("break-md");
    assert.equal(props.showLine, "yes");
    assert.deepEqual(props.height, { preset: "md", custom: "16px" });
  });
});

describe("inferSeparatorStylePreset", () => {
  it("infers legacy spacer props without a line", () => {
    assert.equal(
      inferSeparatorStylePreset({
        height: { preset: "lg", custom: "24px" },
        showLine: "no",
      }),
      "space-lg",
    );
  });

  it("infers legacy divider props", () => {
    assert.equal(
      inferSeparatorStylePreset({
        thickness: { preset: "2px", custom: "2px" },
        width: { preset: "100%", custom: "100%" },
        align: "center",
      }),
      "line-full-medium",
    );
  });

  it("respects an explicit custom preset", () => {
    assert.equal(
      inferSeparatorStylePreset({
        stylePreset: "custom",
        height: { preset: "md", custom: "16px" },
        showLine: "no",
      }),
      "custom",
    );
  });
});

describe("normalizeSeparatorProps", () => {
  it("migrates legacy spacer line fields", () => {
    const normalized = normalizeSeparatorProps({
      height: { preset: "sm", custom: "8px" },
      showLine: "yes",
      lineColor: "#ff0000",
      lineWidth: { preset: "50%", custom: "50%" },
    });

    assert.equal(normalized.stylePreset, "break-sm");
    assert.equal(normalized.showLine, "yes");
  });

  it("infers divider-style props without an explicit height", () => {
    const normalized = normalizeSeparatorProps({
      thickness: { preset: "1px", custom: "1px" },
      borderColorPreset: "border-default",
      width: { preset: "20%", custom: "20%" },
      align: "center",
    });

    assert.equal(normalized.stylePreset, "line-center-20");
    assert.equal(normalized.showLine, "yes");
  });
});

describe("resolveSeparatorRenderModel", () => {
  it("renders space-only blocks without a line", () => {
    const model = resolveSeparatorRenderModel({ stylePreset: "space-sm" });
    assert.equal(model.showLine, false);
    assert.match(model.containerHeight, /8px|var\(--spacing-sm\)/);
  });

  it("renders divider presets with line thickness and width", () => {
    const model = resolveSeparatorRenderModel({ stylePreset: "line-center-50" });
    assert.equal(model.showLine, true);
    assert.equal(model.lineWidth, "50%");
    assert.equal(model.lineThickness, "1px");
  });
});
