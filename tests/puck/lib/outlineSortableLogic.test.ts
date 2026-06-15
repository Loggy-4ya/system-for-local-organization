/**
 * @fileoverview Unit tests for outline sibling reorder index math.
 *
 * Module under test: src/components/puck/lib/outlineSortableLogic.ts
 * Registry: .ai/docs/testing.md
 * Run: `npm run test:outline-sortable`
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildOutlineReorderMove,
  isOutlineRootZone,
  resolveOutlineDestinationIndex,
  resolveOutlineNestDropTarget,
  resolveOutlineOutdentDropTarget,
  resolveOutlineOutdentPosition,
  resolveOutlineRowDropTarget,
  resolveOutlineZoneDropTarget,
} from "@/components/puck/lib/outlineSortableLogic";

describe("resolveOutlineDestinationIndex", () => {
  it("moves an item down by inserting after a lower sibling", () => {
    assert.equal(resolveOutlineDestinationIndex(0, 1, "after"), 1);
  });

  it("moves an item up by inserting before a higher sibling", () => {
    assert.equal(resolveOutlineDestinationIndex(2, 0, "before"), 0);
  });

  it("moves an item down by inserting before a lower sibling", () => {
    assert.equal(resolveOutlineDestinationIndex(0, 2, "before"), 1);
  });

  it("keeps the same index when dropping on itself", () => {
    assert.equal(resolveOutlineDestinationIndex(1, 1, "before"), 1);
    assert.equal(resolveOutlineDestinationIndex(1, 1, "after"), 1);
  });
});

describe("buildOutlineReorderMove", () => {
  it("returns null for no-op drops", () => {
    assert.equal(buildOutlineReorderMove(1, 1, "before"), null);
  });

  it("returns Puck reorder indices for a valid move", () => {
    assert.deepEqual(buildOutlineReorderMove(0, 2, "before"), {
      source: 0,
      target: 1,
    });
  });
});

describe("resolveOutlineRowDropTarget", () => {
  it("reorders within the same zone", () => {
    assert.deepEqual(
      resolveOutlineRowDropTarget(
        { itemId: "a", sourceZone: "parent:slot", sourceIndex: 0 },
        "parent:slot",
        1,
        "after",
      ),
      { destinationZone: "parent:slot", destinationIndex: 1 },
    );
  });

  it("moves across carousel slide zones", () => {
    assert.deepEqual(
      resolveOutlineRowDropTarget(
        { itemId: "video", sourceZone: "carousel:slides[0].content", sourceIndex: 0 },
        "carousel:slides[1].content",
        0,
        "before",
      ),
      { destinationZone: "carousel:slides[1].content", destinationIndex: 0 },
    );
  });
});

describe("resolveOutlineZoneDropTarget", () => {
  it("moves into an empty slide slot", () => {
    assert.deepEqual(
      resolveOutlineZoneDropTarget(
        { itemId: "video", sourceZone: "carousel:slides[0].content", sourceIndex: 0 },
        "carousel:slides[2].content",
        0,
      ),
      { destinationZone: "carousel:slides[2].content", destinationIndex: 0 },
    );
  });

  it("moves a nested block to the root zone", () => {
    assert.deepEqual(
      resolveOutlineZoneDropTarget(
        { itemId: "video", sourceZone: "carousel:slides[0].content", sourceIndex: 0 },
        "root:default-zone",
        0,
      ),
      { destinationZone: "root:default-zone", destinationIndex: 0 },
    );
  });

  it("reorders siblings via an explicit insertion index", () => {
    assert.deepEqual(
      resolveOutlineZoneDropTarget(
        { itemId: "section", sourceZone: "root:default-zone", sourceIndex: 0 },
        "root:default-zone",
        1,
      ),
      { destinationZone: "root:default-zone", destinationIndex: 1 },
    );
  });
});

describe("resolveOutlineOutdentDropTarget", () => {
  it("moves a nested block to the parent zone after its container", () => {
    assert.deepEqual(
      resolveOutlineOutdentDropTarget(
        { itemId: "video", sourceZone: "section-1:content", sourceIndex: 0 },
        "root:default-zone",
        0,
        "after",
      ),
      {
        destinationZone: "root:default-zone",
        destinationIndex: 1,
        intent: "outdent",
        outdentPosition: "after",
      },
    );
  });

  it("moves a nested block to the parent zone before its container", () => {
    assert.deepEqual(
      resolveOutlineOutdentDropTarget(
        { itemId: "video", sourceZone: "section-1:content", sourceIndex: 0 },
        "root:default-zone",
        1,
        "before",
      ),
      {
        destinationZone: "root:default-zone",
        destinationIndex: 1,
        intent: "outdent",
        outdentPosition: "before",
      },
    );
  });

  it("returns null when the source is already at the root zone", () => {
    assert.equal(
      resolveOutlineOutdentDropTarget(
        { itemId: "section", sourceZone: "root:default-zone", sourceIndex: 0 },
        "root:default-zone",
        0,
      ),
      null,
    );
  });
});

describe("resolveOutlineOutdentPosition", () => {
  it("prefers inserting before the container when the pointer is nearer the top edge", () => {
    assert.equal(
      resolveOutlineOutdentPosition({ top: 100, bottom: 200 }, 110),
      "before",
    );
  });

  it("prefers inserting after the container when the pointer is nearer the bottom edge", () => {
    assert.equal(
      resolveOutlineOutdentPosition({ top: 100, bottom: 200 }, 185),
      "after",
    );
  });
});

describe("resolveOutlineNestDropTarget", () => {
  it("moves a root block into a section content slot", () => {
    assert.deepEqual(
      resolveOutlineNestDropTarget(
        { itemId: "video", sourceZone: "root:default-zone", sourceIndex: 1 },
        "section-1:content",
        2,
      ),
      {
        destinationZone: "section-1:content",
        destinationIndex: 2,
        intent: "nest",
      },
    );
  });
});

describe("isOutlineRootZone", () => {
  it("detects root zone compound keys", () => {
    assert.equal(isOutlineRootZone("root:default-zone"), true);
    assert.equal(isOutlineRootZone("section-1:content"), false);
  });
});
