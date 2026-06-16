/**
 * @fileoverview Unit tests for preview iframe grid backing resolution.
 *
 * Module under test: src/components/puck/lib/previewIframeGridBacking.ts
 * Run: `npm run test:preview-iframe-grid-backing`
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  resolveShowPreviewIframeGrid,
  shouldSuppressShellScrollportGridForIframeContainedEdit,
} from "@/components/puck/lib/previewIframeGridBacking";

describe("resolveShowPreviewIframeGrid", () => {
  const base = {
    showEditorBackground: true,
    background: "site-default",
    shellScrollportGrid: true,
    insidePuckEditorShell: true,
    isPuckEditMode: false,
    requiresIframeContainedEditGrid: false,
  };

  it("never mounts iframe grid inside the Puck shell when shell bleed-through works", () => {
    assert.equal(
      resolveShowPreviewIframeGrid({
        ...base,
        isPuckEditMode: true,
      }),
      false,
    );
  });

  it("mounts iframe grid during Puck edit when shell bleed-through fails", () => {
    assert.equal(
      resolveShowPreviewIframeGrid({
        ...base,
        isPuckEditMode: true,
        requiresIframeContainedEditGrid: true,
      }),
      true,
    );
  });

  it("keeps shell grid path on interactive preview when bleed-through fails in edit only", () => {
    assert.equal(
      resolveShowPreviewIframeGrid({
        ...base,
        isPuckEditMode: false,
        requiresIframeContainedEditGrid: true,
      }),
      false,
    );
  });
});

describe("shouldSuppressShellScrollportGridForIframeContainedEdit", () => {
  it("suppresses shell grid on edit layout only when iframe-contained grid is required", () => {
    assert.equal(
      shouldSuppressShellScrollportGridForIframeContainedEdit({
        requiresIframeContainedEditGrid: true,
        previewMode: "edit",
      }),
      true,
    );
    assert.equal(
      shouldSuppressShellScrollportGridForIframeContainedEdit({
        requiresIframeContainedEditGrid: true,
        previewMode: "interactive",
      }),
      false,
    );
  });
});
