/**
 * @fileoverview Unit tests for Puck preview iframe document readiness guard.
 *
 * Module under test: src/components/puck/lib/previewIframeDocumentReady.ts
 * Run: `npm run test:run -- preview-iframe-document-ready`
 * Registry: `.ai/docs/testing.md`
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isPreviewIframeDocumentReady } from "@/components/puck/lib/previewIframeDocumentReady";

describe("isPreviewIframeDocumentReady", () => {
  it("returns false for nullish documents", () => {
    assert.equal(isPreviewIframeDocumentReady(null), false);
    assert.equal(isPreviewIframeDocumentReady(undefined), false);
  });

  it("returns false when documentElement or head is missing", () => {
    assert.equal(
      isPreviewIframeDocumentReady({
        documentElement: null,
        head: {},
      } as unknown as Document),
      false,
    );
    assert.equal(
      isPreviewIframeDocumentReady({
        documentElement: {},
        head: null,
      } as unknown as Document),
      false,
    );
  });

  it("returns true when documentElement and head exist", () => {
    assert.equal(
      isPreviewIframeDocumentReady({
        documentElement: {},
        head: {},
      } as unknown as Document),
      true,
    );
  });
});
