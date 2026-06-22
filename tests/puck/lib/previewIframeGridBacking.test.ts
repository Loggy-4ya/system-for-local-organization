/**
 * @fileoverview Unit tests for Puck editor shell detection and single-grid policy.
 *
 * Module under test: src/components/puck/lib/previewIframeGridBacking.ts
 * Run: `npm run test:preview-iframe-grid-backing`
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isInsidePuckEditorShell,
  resolveShowPreviewIframeGrid,
  shouldSuppressShellScrollportGridForIframeContainedEdit,
} from "@/components/puck/lib/previewIframeGridBacking";

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

describe("resolveShowPreviewIframeGrid", () => {
  it("never mounts a duplicate grid inside the preview iframe", () => {
    assert.equal(
      resolveShowPreviewIframeGrid({
        showEditorBackground: true,
        background: "site-default",
        shellScrollportGrid: true,
        insidePuckEditorShell: true,
        requiresIframeContainedEditGrid: false,
      }),
      false,
    );

    assert.equal(
      resolveShowPreviewIframeGrid({
        showEditorBackground: true,
        background: "site-default",
        insidePuckEditorShell: true,
        requiresIframeContainedEditGrid: true,
      }),
      false,
    );
  });
});

describe("shouldSuppressShellScrollportGridForIframeContainedEdit", () => {
  it("always suppresses shell scrollport grid (global grid only)", () => {
    assert.equal(
      shouldSuppressShellScrollportGridForIframeContainedEdit({
        requiresIframeContainedEditGrid: true,
      }),
      true,
    );
    assert.equal(shouldSuppressShellScrollportGridForIframeContainedEdit({}), true);
  });
});
