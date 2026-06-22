/**
 * Canvas letterbox scrollport — shell overflow detection, wheel chaining, expand logic.
 *
 * Run: `npm run test:canvas-letterbox-scrollport`
 * Registry: `.ai/docs/testing.md`
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { chainWheelDeltaToCanvasShell } from "@/components/puck/lib/canvasLetterboxScrollport";
import {
  LETTERBOX_SCROLLPORT_HYSTERESIS_PX,
  resolveLetterboxVisualHeightPx,
  shouldExpandLetterboxScrollport,
} from "@/components/puck/lib/letterboxScrollportLogic";

describe("chainWheelDeltaToCanvasShell", () => {
  it("returns false when the shell has no vertical overflow", () => {
    const iframeDocument = {
      documentElement: { scrollHeight: 800 },
    } as Document;

    const iframeWindow = {
      scrollY: 0,
      innerHeight: 800,
      scrollBy: () => undefined,
    } as unknown as Window;

    const result = chainWheelDeltaToCanvasShell(iframeWindow, iframeDocument, 120, 0);
    assert.equal(result, false);
  });
});

describe("resolveLetterboxVisualHeightPx", () => {
  it("prefers zoom-config math over clipped DOM measurements", () => {
    const visual = resolveLetterboxVisualHeightPx(
      { rootHeight: 800, zoom: 1.42, autoZoom: 1.42 },
      420,
    );

    assert.equal(visual, 1136);
  });
});

describe("shouldExpandLetterboxScrollport", () => {
  it("requires crossing the shell height plus hysteresis before expanding", () => {
    const shell = 600;
    assert.equal(
      shouldExpandLetterboxScrollport(shell + LETTERBOX_SCROLLPORT_HYSTERESIS_PX, shell, false),
      false,
    );
    assert.equal(
      shouldExpandLetterboxScrollport(shell + LETTERBOX_SCROLLPORT_HYSTERESIS_PX + 1, shell, false),
      true,
    );
  });

  it("keeps expansion until visual height falls below shell minus hysteresis", () => {
    const shell = 600;
    assert.equal(shouldExpandLetterboxScrollport(shell - 1, shell, true), true);
    assert.equal(
      shouldExpandLetterboxScrollport(shell - LETTERBOX_SCROLLPORT_HYSTERESIS_PX, shell, true),
      false,
    );
  });
});
