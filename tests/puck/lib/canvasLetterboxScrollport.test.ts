/**
 * Canvas letterbox scrollport — shell overflow detection and wheel chaining.
 *
 * Run: `npm run test:canvas-letterbox-scrollport`
 * Registry: `.ai/docs/testing.md`
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { chainWheelDeltaToCanvasShell } from "@/components/puck/lib/canvasLetterboxScrollport";

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
