/**
 * @fileoverview Unit tests for interactive preview scrollport helpers.
 *
 * Module under test: src/components/puck/lib/interactivePreviewScrollport.ts
 * Registry: .ai/docs/testing.md
 * Run: `npm run test:interactive-preview-scrollport`
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  INTERACTIVE_CANVAS_CONTROLS_INSET_FALLBACK_PX,
  resolveDesktopCanvasControlsInsetPx,
  resolveInteractivePreviewInnerContentHeightPx,
  resolveInteractivePreviewShellViewportPx,
  syncInteractivePreviewIframeDocumentViewport,
} from "@/components/puck/lib/interactivePreviewScrollport";

describe("resolveInteractivePreviewInnerContentHeightPx", () => {
  it("measures PuckCanvas-inner client height when mounted", () => {
    const doc = {
      querySelector: () => ({ clientHeight: 740 }),
    } as unknown as Document;

    assert.equal(resolveInteractivePreviewInnerContentHeightPx(doc), 740);
  });

  it("returns null when the inner host is not mounted", () => {
    assert.equal(
      resolveInteractivePreviewInnerContentHeightPx({ querySelector: () => null } as unknown as Document),
      null,
    );
  });
});

describe("resolveInteractivePreviewShellViewportPx", () => {
  it("subtracts the controls inset from the shell viewport", () => {
    assert.equal(resolveInteractivePreviewShellViewportPx(820, 52), 768);
  });

  it("uses the full shell height when inset is zero", () => {
    assert.equal(resolveInteractivePreviewShellViewportPx(820, 0), 820);
  });

  it("returns null when shell height is unavailable", () => {
    assert.equal(resolveInteractivePreviewShellViewportPx(null, 52), null);
  });
});

describe("syncInteractivePreviewIframeDocumentViewport", () => {
  it("locks iframe document min-heights to the frame client height", () => {
    const frameRoot = {
      style: { minHeight: "", height: "12px", removeProperty: (key: string) => {
        if (key === "height") frameRoot.style.height = "";
      } },
    };
    const body = {
      style: { minHeight: "", height: "12px", removeProperty: (key: string) => {
        if (key === "height") body.style.height = "";
      } },
    };
    const documentElement = { style: { minHeight: "" } };
    const iframeDoc = {
      documentElement,
      body,
      getElementById: (id: string) => (id === "frame-root" ? frameRoot : null),
      defaultView: {
        frameElement: { clientHeight: 962 },
      },
    } as unknown as Document;

    syncInteractivePreviewIframeDocumentViewport(iframeDoc);

    assert.equal(documentElement.style.minHeight, "962px");
    assert.equal(body.style.minHeight, "962px");
    assert.equal(frameRoot.style.minHeight, "962px");
    assert.equal(frameRoot.style.height, "");
  });
});

describe("resolveDesktopCanvasControlsInsetPx", () => {
  it("falls back when controls are not mounted", () => {
    assert.equal(
      resolveDesktopCanvasControlsInsetPx({ querySelector: () => null } as unknown as Document),
      INTERACTIVE_CANVAS_CONTROLS_INSET_FALLBACK_PX,
    );
  });

  it("measures the controls block height when present", () => {
    const doc = {
      querySelector: () => ({
        getBoundingClientRect: () => ({ height: 48 }),
      }),
    } as unknown as Document;

    assert.equal(resolveDesktopCanvasControlsInsetPx(doc), 48);
  });
});
