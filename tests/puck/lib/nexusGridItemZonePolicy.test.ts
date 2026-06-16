/**
 * @fileoverview Unit tests for NexusGridItem placement zone policy.
 *
 * Module under test: src/components/puck/lib/nexusGridItemZonePolicy.ts
 * Policy spec: .ai/docs/features/puck_grid_item_zone_policy.md
 * Registry: .ai/docs/testing.md
 * Run: `npm run test:nexus-grid-item-zone`
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  findMisplacedNexusGridItemIds,
  isValidNexusGridItemDestinationZone,
  NEXUS_GRID_ITEM_TYPE,
  NEXUS_GRID_TYPE,
  PUCK_ROOT_DROPPABLE_ID,
  shouldRejectNexusGridItemInsert,
} from "@/components/puck/lib/nexusGridItemZonePolicy";
import { filterOutlineDropTargetForGridItem } from "@/components/puck/lib/outlineSortableLogic";

const nodes = {
  grid1: { data: { type: NEXUS_GRID_TYPE } },
  section1: { data: { type: "NexusSection" } },
  item1: { data: { type: NEXUS_GRID_ITEM_TYPE } },
};

const zones = {
  [PUCK_ROOT_DROPPABLE_ID]: { contentIds: [] as string[] },
  "grid1:content": { contentIds: ["item1"] },
  "section1:content": { contentIds: [] as string[] },
  "item1:content": { contentIds: [] as string[] },
};

describe("isValidNexusGridItemDestinationZone", () => {
  it("accepts a NexusGrid content slot", () => {
    assert.equal(isValidNexusGridItemDestinationZone("grid1:content", nodes), true);
  });

  it("rejects the page root zone", () => {
    assert.equal(isValidNexusGridItemDestinationZone(PUCK_ROOT_DROPPABLE_ID, nodes), false);
  });

  it("rejects section and grid-item content slots", () => {
    assert.equal(isValidNexusGridItemDestinationZone("section1:content", nodes), false);
    assert.equal(isValidNexusGridItemDestinationZone("item1:content", nodes), false);
  });

  it("rejects carousel slide slots", () => {
    assert.equal(isValidNexusGridItemDestinationZone("carousel:slides[0].content", nodes), false);
  });
});

describe("findMisplacedNexusGridItemIds", () => {
  it("returns empty when all grid items sit in grid content zones", () => {
    assert.deepEqual(findMisplacedNexusGridItemIds({ nodes, zones }), []);
  });

  it("flags grid items on the page root", () => {
    const rootZones = {
      ...zones,
      [PUCK_ROOT_DROPPABLE_ID]: { contentIds: ["item1"] },
      "grid1:content": { contentIds: [] as string[] },
    };

    assert.deepEqual(findMisplacedNexusGridItemIds({ nodes, zones: rootZones }), ["item1"]);
  });
});

describe("shouldRejectNexusGridItemInsert", () => {
  it("rejects insert into the page root", () => {
    assert.equal(
      shouldRejectNexusGridItemInsert(
        {
          type: "insert",
          componentType: NEXUS_GRID_ITEM_TYPE,
          destinationZone: PUCK_ROOT_DROPPABLE_ID,
        },
        nodes,
      ),
      true,
    );
  });

  it("allows insert into a grid content slot", () => {
    assert.equal(
      shouldRejectNexusGridItemInsert(
        {
          type: "insert",
          componentType: NEXUS_GRID_ITEM_TYPE,
          destinationZone: "grid1:content",
        },
        nodes,
      ),
      false,
    );
  });
});

describe("filterOutlineDropTargetForGridItem", () => {
  const source = { itemId: "item1", sourceZone: "grid1:content", sourceIndex: 0 };

  it("blocks cross-zone moves into section content", () => {
    assert.equal(
      filterOutlineDropTargetForGridItem(
        source,
        { destinationZone: "section1:content", destinationIndex: 0 },
        nodes,
      ),
      null,
    );
  });

  it("allows reorder within the same grid content zone", () => {
    assert.deepEqual(
      filterOutlineDropTargetForGridItem(
        source,
        { destinationZone: "grid1:content", destinationIndex: 1 },
        nodes,
      ),
      { destinationZone: "grid1:content", destinationIndex: 1 },
    );
  });
});
