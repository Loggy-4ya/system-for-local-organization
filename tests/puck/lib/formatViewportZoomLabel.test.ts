/**
 * Viewport zoom trigger labels — auto-fit vs manual percentage display.
 *
 * Run: `npm run test:viewport-zoom-label`
 * Registry: `.ai/docs/testing.md`
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatViewportZoomLabel,
  isViewportZoomAutoSelection,
  type ViewportZoomOption,
} from "@/components/puck/lib/formatViewportZoomLabel";

const presetOptions: ViewportZoomOption[] = [
  { label: "50%", value: "0.5" },
  { label: "75%", value: "0.75" },
  { label: "100%", value: "1" },
  { label: "125%", value: "1.25" },
];

describe("isViewportZoomAutoSelection", () => {
  it("detects Puck auto-fit options with an (Auto) suffix", () => {
    const options: ViewportZoomOption[] = [
      ...presetOptions,
      { label: "72% (Auto)", value: "0.72" },
    ];

    assert.equal(isViewportZoomAutoSelection("0.72", options), true);
    assert.equal(isViewportZoomAutoSelection("1", options), false);
  });

  it("treats preset 100% as auto when Puck omits a separate auto option", () => {
    assert.equal(isViewportZoomAutoSelection("1", presetOptions), true);
  });
});

describe("formatViewportZoomLabel", () => {
  it("shows Auto for default 100% auto-fit in compact mode", () => {
    assert.equal(formatViewportZoomLabel("1", presetOptions, true), "Auto");
  });

  it("shows Auto for shrink-to-fit auto zoom", () => {
    const options: ViewportZoomOption[] = [
      ...presetOptions,
      { label: "72% (Auto)", value: "0.72" },
    ];

    assert.equal(formatViewportZoomLabel("0.72", options, true), "Auto");
  });

  it("shows a percentage for manual zoom selections", () => {
    assert.equal(formatViewportZoomLabel("0.5", presetOptions, true), "50%");
    assert.equal(formatViewportZoomLabel("1.25", presetOptions, true), "125%");
  });

  it("preserves the Auto suffix in non-compact mode", () => {
    assert.equal(formatViewportZoomLabel("1", presetOptions, false), "100% (Auto)");
  });
});
