/**
 * Desktop letterbox device preview zoom — shrink-to-fit on narrow frames, scale-up when wider.
 *
 * Run: `npm run test:desktop-letterbox-zoom`
 * Registry: `.ai/docs/testing.md`
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  floorLetterboxDevicePreviewZoom,
  floorDesktopLetterboxDevicePreviewZoom,
  LETTERBOX_DEVICE_MAX_ZOOM,
  resolveLetterboxDeviceTargetZoom,
  resolveShrinkToFitDeviceZoom,
  type PuckZoomConfig,
} from "@/components/puck/lib/sanitizePuckZoomConfig";

const shrunk: PuckZoomConfig = { autoZoom: 0.72, rootHeight: 900, zoom: 0.72 };

describe("floorLetterboxDevicePreviewZoom", () => {
  it("boosts shrunk zoom when phone preset is letterboxed on desktop", () => {
    const result = floorLetterboxDevicePreviewZoom(shrunk, 360, 900);
    assert.equal(result.zoom, LETTERBOX_DEVICE_MAX_ZOOM);
    assert.equal(result.autoZoom, LETTERBOX_DEVICE_MAX_ZOOM);
    assert.equal(result.rootHeight, 900);
  });

  it("boosts sub-1 auto-fit zoom when phone preset letterboxes on desktop", () => {
    const tiny: PuckZoomConfig = { autoZoom: 0.45, rootHeight: 900, zoom: 0.45 };
    const result = floorLetterboxDevicePreviewZoom(tiny, 360, 800);
    const target = resolveLetterboxDeviceTargetZoom(360, 800);
    assert.equal(result.zoom, target);
    assert.equal(result.autoZoom, target);
  });

  it("boosts 1× zoom to fill the canvas when phone preset is letterboxed", () => {
    const atOne: PuckZoomConfig = { autoZoom: 1, rootHeight: 900, zoom: 1 };
    const result = floorLetterboxDevicePreviewZoom(atOne, 360, 900);
    assert.equal(result.zoom, LETTERBOX_DEVICE_MAX_ZOOM);
    assert.equal(result.autoZoom, LETTERBOX_DEVICE_MAX_ZOOM);
  });

  it("targets a moderate scale on mid-width desktop canvas frames", () => {
    const atOne: PuckZoomConfig = { autoZoom: 1, rootHeight: 900, zoom: 1 };
    const result = floorLetterboxDevicePreviewZoom(atOne, 360, 700);
    assert.equal(result.zoom, resolveLetterboxDeviceTargetZoom(360, 700));
    assert.ok(result.zoom < LETTERBOX_DEVICE_MAX_ZOOM);
  });

  it("does not over-boost tablet preset when it already nearly fills the frame", () => {
    const atOne: PuckZoomConfig = { autoZoom: 1, rootHeight: 900, zoom: 1 };
    const result = floorLetterboxDevicePreviewZoom(atOne, 768, 800);
    assert.equal(result.zoom, 1);
    assert.equal(result.autoZoom, 1);
  });

  it("shrinks 1× desktop preset when the canvas frame is narrower", () => {
    const atOne: PuckZoomConfig = { autoZoom: 1, rootHeight: 900, zoom: 1 };
    const result = floorLetterboxDevicePreviewZoom(atOne, 1280, 450);
    const fitZoom = resolveShrinkToFitDeviceZoom(1280, 450);
    assert.equal(result.zoom, fitZoom);
    assert.equal(result.autoZoom, fitZoom);
  });

  it("clamps insufficient shrink when desktop preset is wider than the frame", () => {
    const result = floorLetterboxDevicePreviewZoom(shrunk, 1280, 450);
    const fitZoom = resolveShrinkToFitDeviceZoom(1280, 450);
    assert.equal(result.zoom, fitZoom);
    assert.equal(result.autoZoom, fitZoom);
  });

  it("clamps insufficient shrink when tablet preset is wider than the frame", () => {
    const result = floorLetterboxDevicePreviewZoom(shrunk, 768, 390);
    const fitZoom = resolveShrinkToFitDeviceZoom(768, 390);
    assert.equal(result.zoom, fitZoom);
    assert.equal(result.autoZoom, fitZoom);
  });

  it("preserves sub-1 user zoom when autoZoom is already 1", () => {
    const manual: PuckZoomConfig = { autoZoom: 1, rootHeight: 900, zoom: 0.5 };
    const result = floorLetterboxDevicePreviewZoom(manual, 1280, 450);
    assert.equal(result.zoom, 0.5);
    assert.equal(result.autoZoom, 1);
  });

  it("preserves manual zoom-out on letterboxed phone preset", () => {
    const manual: PuckZoomConfig = { autoZoom: 1, rootHeight: 900, zoom: 0.5 };
    const result = floorLetterboxDevicePreviewZoom(manual, 360, 900);
    assert.equal(result.zoom, 0.5);
    assert.equal(result.autoZoom, 1);
  });

  it("ignores full-width presets", () => {
    const result = floorLetterboxDevicePreviewZoom(shrunk, "100%", 900);
    assert.equal(result.zoom, 0.72);
  });
});
