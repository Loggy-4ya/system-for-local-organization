/**
 * @fileoverview Unit tests for legacy NexusGrid → items array migration.
 *
 * Module under test: src/components/puck/lib/puckDataTree.ts
 * Registry: .ai/docs/testing.md
 * Run: `npm run test:nexus-grid-migration`
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { migrateLegacyNexusGridItems } from "@/components/puck/lib/puckDataTree";

describe("migrateLegacyNexusGridItems", () => {
  it("converts legacy grid content zone into props.items", () => {
    const data = {
      content: [
        {
          type: "NexusGrid",
          props: {
            id: "grid-1",
            columns: "12",
            gap: { preset: "md", custom: "16px" },
          },
        },
      ],
      zones: {
        "grid-1:content": [
          {
            type: "NexusGridItem",
            props: {
              id: "cell-1",
              spanCol: "6",
              spanRow: "2",
            },
          },
        ],
        "cell-1:content": [
          {
            type: "NexusText",
            props: { id: "text-1", text: "<p>Hello</p>" },
          },
        ],
      },
      root: { props: {} },
    };

    const migrated = migrateLegacyNexusGridItems(data as never);

    const grid = migrated.content?.[0] as {
      props: {
        items: Array<{ spanCol: string; content: Array<{ type: string }> }>;
      };
    };

    assert.equal(grid.props.items.length, 1);
    assert.equal(grid.props.items[0]?.spanCol, "6");
    assert.equal(grid.props.items[0]?.content[0]?.type, "NexusText");
    assert.equal(migrated.zones?.["grid-1:content"], undefined);
    assert.equal(migrated.zones?.["cell-1:content"], undefined);
  });
});
