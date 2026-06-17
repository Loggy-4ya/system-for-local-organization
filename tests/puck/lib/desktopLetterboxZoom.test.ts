/**
 * Desktop letterbox device preview zoom floor (no shrink-to-fit on fixed presets).
 *
 * Run: `npm run test:desktop-letterbox-zoom`
 * Registry: `.ai/docs/testing.md`
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  floorLetterboxDevicePreviewZoom,
  floorDesktopLetterboxDevicePreviewZoom,
  type PuckZoomConfig,
} from "@/components/puck/lib/sanitizePuckZoomConfig";

const shrunk: PuckZoomConfig = { autoZoom: 0.72, rootHeight: 900, zoom: 0.72 };

describe("floorLetterboxDevicePreviewZoom", () => {
  it("floors shrunk zoom to 1 when phone preset is letterboxed on desktop", () => {
    const result = floorLetterboxDevicePreviewZoom(shrunk, 360, 900);
    assert.equal(result.zoom, 1);
    assert.equal(result.autoZoom, 1);
    assert.equal(result.rootHeight, 900);
  });

  it("does not shrink below 1 when Puck emits sub-1 zoom", () => {
    const tiny: PuckZoomConfig = { autoZoom: 0.45, rootHeight: 900, zoom: 0.45 };
    const result = floorLetterboxDevicePreviewZoom(tiny, 360, 800);
    assert.equal(result.zoom, 1);
    assert.equal(result.autoZoom, 1);
  });

  it("does not boost zoom above 1 on letterboxed presets", () => {
    const atOne: PuckZoomConfig = { autoZoom: 1, rootHeight: 900, zoom: 1 };
    const result = floorLetterboxDevicePreviewZoom(atOne, 360, 900);
    assert.equal(result.zoom, 1);
    assert.equal(result.autoZoom, 1);
  });

  it("floors auto-fit shrink when desktop preset is wider than the frame", () => {
    const result = floorLetterboxDevicePreviewZoom(shrunk, 1280, 450);
    assert.equal(result.zoom, 1);
    assert.equal(result.autoZoom, 1);
  });

  it("preserves sub-1 user zoom when autoZoom is already 1", () => {
    const manual: PuckZoomConfig = { autoZoom: 1, rootHeight: 900, zoom: 0.5 };
    const result = floorLetterboxDevicePreviewZoom(manual, 1280, 450);
    assert.equal(result.zoom, 0.5);
    assert.equal(result.autoZoom, 1);
  });

  it("ignores full-width presets", () => {
    const result = floorLetterboxDevicePreviewZoom(shrunk, "100%", 900);
    assert.equal(result.zoom, 0.72);
  });
});
