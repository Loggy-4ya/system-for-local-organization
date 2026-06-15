/**
 * @fileoverview Unit tests for canvas drag reparent commit helpers.
 *
 * Module under test: src/components/puck/lib/canvasReparentLogic.ts
 * Registry: .ai/docs/testing.md
 * Run: `npm run test:canvas-reparent`
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildCanvasReparentCommit,
  isCanvasNestIntoDescendant,
  resolveCanvasDestinationIndex,
  shouldForceCanvasReparentCommit,
  shouldOverridePuckDrop,
} from "@/components/puck/lib/canvasReparentLogic";

describe("isCanvasNestIntoDescendant", () => {
  it("blocks dropping into the dragged block's own slot", () => {
    assert.equal(
      isCanvasNestIntoDescendant("section-1", "section-1:content", {}),
      true,
    );
  });

  it("blocks dropping into a descendant container zone", () => {
    assert.equal(
      isCanvasNestIntoDescendant("section-1", "grid-1:content", {
        "grid-1": { path: ["root:content", "section-1:content"] },
      }),
      true,
    );
  });

  it("allows dropping into a sibling section slot", () => {
    assert.equal(
      isCanvasNestIntoDescendant("video-1", "section-2:content", {
        "section-2": { path: ["root:content"] },
      }),
      false,
    );
  });
});

describe("resolveCanvasDestinationIndex", () => {
  it("returns zero for empty zones", () => {
    assert.equal(
      resolveCanvasDestinationIndex({
        clientY: 200,
        sourceZone: "root:content",
        sourceIndex: 0,
        zoneCompound: "section-1:content",
        isEmpty: true,
        childRects: [],
        hitboxTop: null,
      }),
      0,
    );
  });

  it("inserts before the hovered child midpoint", () => {
    assert.equal(
      resolveCanvasDestinationIndex({
        clientY: 110,
        sourceZone: "root:content",
        sourceIndex: 0,
        zoneCompound: "section-1:content",
        isEmpty: false,
        childRects: [
          { index: 0, top: 100, bottom: 200, height: 100 },
          { index: 1, top: 200, bottom: 300, height: 100 },
        ],
        hitboxTop: null,
      }),
      0,
    );
  });

  it("appends when the pointer is in the hitbox region", () => {
    assert.equal(
      resolveCanvasDestinationIndex({
        clientY: 280,
        sourceZone: "root:content",
        sourceIndex: 0,
        zoneCompound: "section-1:content",
        isEmpty: false,
        childRects: [{ index: 0, top: 100, bottom: 200, height: 100 }],
        hitboxTop: 250,
      }),
      1,
    );
  });

  it("adjusts same-zone indices when moving downward", () => {
    assert.equal(
      resolveCanvasDestinationIndex({
        clientY: 280,
        sourceZone: "section-1:content",
        sourceIndex: 0,
        zoneCompound: "section-1:content",
        isEmpty: false,
        childRects: [
          { index: 0, top: 100, bottom: 200, height: 100 },
          { index: 1, top: 200, bottom: 300, height: 100 },
        ],
        hitboxTop: 250,
      }),
      1,
    );
  });
});

describe("buildCanvasReparentCommit", () => {
  it("builds a cross-zone move commit", () => {
    const commit = buildCanvasReparentCommit(
      { itemId: "video-1", sourceZone: "root:content", sourceIndex: 1 },
      "carousel:slides[0].content",
      0,
    );

    assert.deepEqual(commit, {
      itemId: "video-1",
      sourceZone: "root:content",
      sourceIndex: 1,
      destinationZone: "carousel:slides[0].content",
      destinationIndex: 0,
      dispatchType: "move",
    });
  });

  it("builds a same-zone reorder commit", () => {
    const commit = buildCanvasReparentCommit(
      { itemId: "text-1", sourceZone: "root:content", sourceIndex: 0 },
      "root:content",
      2,
    );

    assert.deepEqual(commit, {
      itemId: "text-1",
      sourceZone: "root:content",
      sourceIndex: 0,
      destinationZone: "root:content",
      destinationIndex: 2,
      dispatchType: "reorder",
    });
  });

  it("returns null for no-op drops", () => {
    assert.equal(
      buildCanvasReparentCommit(
        { itemId: "text-1", sourceZone: "root:content", sourceIndex: 1 },
        "root:content",
        1,
      ),
      null,
    );
  });
});

describe("shouldOverridePuckDrop", () => {
  it("returns false when Puck landed on the intended target", () => {
    assert.equal(
      shouldOverridePuckDrop(
        { destinationZone: "section-1:content", destinationIndex: 0 },
        { zone: "section-1:content", index: 0 },
      ),
      false,
    );
  });

  it("returns true when Puck kept the block in the wrong zone", () => {
    assert.equal(
      shouldOverridePuckDrop(
        { destinationZone: "section-1:content", destinationIndex: 0 },
        { zone: "root:content", index: 1 },
      ),
      true,
    );
  });

  it("returns false when no intended target was resolved", () => {
    assert.equal(shouldOverridePuckDrop(null, { zone: "root:content", index: 0 }), false);
  });
});

describe("shouldForceCanvasReparentCommit", () => {
  it("forces commit when drag started in root but user hovered a nested slot", () => {
    assert.equal(
      shouldForceCanvasReparentCommit(
        { itemId: "video-1", sourceZone: "root:content", sourceIndex: 0 },
        { destinationZone: "section-1:content", destinationIndex: 0 },
        { zone: "root:content", index: 1 },
      ),
      true,
    );
  });

  it("does not force when drag started and ended in the same zone", () => {
    assert.equal(
      shouldForceCanvasReparentCommit(
        { itemId: "text-1", sourceZone: "root:content", sourceIndex: 0 },
        { destinationZone: "root:content", destinationIndex: 2 },
        { zone: "root:content", index: 2 },
      ),
      false,
    );
  });

  it("forces when user hovered a nested slot but Puck kept the block on root", () => {
    assert.equal(
      shouldForceCanvasReparentCommit(
        { itemId: "video-1", sourceZone: "root:content", sourceIndex: 1 },
        { destinationZone: "carousel:slides[0].content", destinationIndex: 0 },
        { zone: "root:content", index: 0 },
      ),
      true,
    );
  });
});
