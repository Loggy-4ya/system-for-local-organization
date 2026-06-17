/**
 * @fileoverview Unit tests for Puck editor shell detection.
 *
 * Module under test: src/components/puck/lib/previewIframeGridBacking.ts
 * Run: `npm run test:preview-iframe-grid-backing`
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isInsidePuckEditorShell } from "@/components/puck/lib/previewIframeGridBacking";

describe("isInsidePuckEditorShell", () => {
  it("returns false when no Puck root is mounted", () => {
    const win = {
      document: { querySelector: () => null },
    } as unknown as Window;
    (win as Window & { parent: Window }).parent = win;

    assert.equal(isInsidePuckEditorShell(win), false);
  });

  it("returns true when Puck root exists on the current document", () => {
    const win = {
      document: { querySelector: (sel: string) => (sel === ".Puck" ? {} : null) },
    } as unknown as Window;
    (win as Window & { parent: Window }).parent = win;

    assert.equal(isInsidePuckEditorShell(win), true);
  });
});
