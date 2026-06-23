/**
 * Puck canvas root zoom presentation heal — DOM drift detection and re-apply.
 *
 * Run: `npm run test:puck-canvas-root-zoom-presentation`
 * Registry: `.ai/docs/testing.md`
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyPuckCanvasRootZoomPresentation,
  parseCssTransformScale,
  puckCanvasRootZoomPresentationDrifted,
  PUCK_CANVAS_TRANSFORM_FROZEN_ATTR,
  type PuckZoomConfig,
} from "@/components/puck/lib/sanitizePuckZoomConfig";

const config: PuckZoomConfig = {
  autoZoom: 0.921875,
  rootHeight: 1085,
  zoom: 0.921875,
};

describe("parseCssTransformScale", () => {
  it("parses scale() values", () => {
    assert.equal(parseCssTransformScale("scale(0.921875)"), 0.921875);
  });

  it("parses matrix() uniform scale", () => {
    assert.equal(parseCssTransformScale("matrix(0.92, 0, 0, 0.92, 0, 0)"), 0.92);
  });

  it("returns null for empty or none", () => {
    assert.equal(parseCssTransformScale(""), null);
    assert.equal(parseCssTransformScale("none"), null);
  });
});

describe("puckCanvasRootZoomPresentationDrifted", () => {
  it("detects missing transform and height", () => {
    const root = {
      style: { transform: "", height: "" },
    } as unknown as HTMLElement;

    assert.equal(puckCanvasRootZoomPresentationDrifted(config, root), true);
  });

  it("returns false when inline presentation matches config", () => {
    const root = {
      style: { transform: "scale(0.921875)", height: "1085" },
    } as unknown as HTMLElement;

    assert.equal(puckCanvasRootZoomPresentationDrifted(config, root), false);
  });
});

describe("applyPuckCanvasRootZoomPresentation", () => {
  it("is a no-op in Node without document", () => {
    assert.equal(applyPuckCanvasRootZoomPresentation(config), false);
  });

  it("skips when transform freeze flag is set", (t) => {
    if (typeof document === "undefined") {
      t.skip("requires DOM");
      return;
    }

    const root = document.createElement("div");
    root.id = "puck-canvas-root";
    root.setAttribute(PUCK_CANVAS_TRANSFORM_FROZEN_ATTR, "");
    document.body.appendChild(root);

    try {
      assert.equal(applyPuckCanvasRootZoomPresentation(config), false);
      assert.equal(root.style.transform, "");
    } finally {
      root.remove();
    }
  });

  it("re-applies transform and height when presentation drifted", (t) => {
    if (typeof document === "undefined") {
      t.skip("requires DOM");
      return;
    }

    const root = document.createElement("div");
    root.id = "puck-canvas-root";
    root.style.width = "1280px";
    document.body.appendChild(root);

    try {
      assert.equal(applyPuckCanvasRootZoomPresentation(config), true);
      assert.equal(root.style.transform, "scale(0.921875)");
      assert.equal(root.style.height, "1085");
    } finally {
      root.remove();
    }
  });
});
