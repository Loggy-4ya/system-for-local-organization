/**
 * @fileoverview Unit tests for Global Layout Editor list reorder helpers.
 *
 * Run: npm run test:global-layout-sortable
 * Registry: .ai/docs/testing.md
 *
 * @module tests/global-layout/lib/editorSortableLogic.test
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  moveHeaderNavItem,
  reorderEditorList,
  resolveEditorRowDropPosition,
  shouldShowEditorDropSlotAfter,
  shouldShowEditorDropSlotBefore,
} from "@/components/global-layout/lib/editorSortableLogic";

describe("reorderEditorList", () => {
  it("moves an item down when dropping after a lower row", () => {
    const items = ["a", "b", "c"];
    assert.deepEqual(reorderEditorList(items, 0, 2, "after"), ["b", "c", "a"]);
  });

  it("returns the same reference when the destination is unchanged", () => {
    const items = ["a", "b", "c"];
    assert.equal(reorderEditorList(items, 1, 1, "before"), items);
  });
});

describe("moveHeaderNavItem", () => {
  const categories = [
    { id: "main", label: "Main", items: [{ id: "a", href: "/a", label: "A" }] },
    { id: "tools", label: "Tools", items: [{ id: "b", href: "/b", label: "B" }] },
  ] as const;

  it("moves a nav item into another category", () => {
    const next = moveHeaderNavItem(
      categories,
      { categoryId: "main", itemIndex: 0 },
      { categoryId: "tools", itemIndex: 0, position: "before" },
    );

    assert.equal(next[0]?.items.length, 0);
    assert.equal(next[1]?.items.length, 2);
    assert.equal(next[1]?.items[0]?.id, "a");
    assert.equal(next[1]?.items[1]?.id, "b");
  });

  it("reorders within the same category", () => {
    const localCategories = [
      {
        id: "main",
        label: "Main",
        items: [
          { id: "a", href: "/a", label: "A" },
          { id: "b", href: "/b", label: "B" },
        ],
      },
    ];

    const next = moveHeaderNavItem(
      localCategories,
      { categoryId: "main", itemIndex: 0 },
      { categoryId: "main", itemIndex: 1, position: "after" },
    );

    assert.deepEqual(
      next[0]?.items.map((item) => item.id),
      ["b", "a"],
    );
  });
});

describe("resolveEditorRowDropPosition", () => {
  it("returns before when the pointer is in the top half", () => {
    assert.equal(
      resolveEditorRowDropPosition({ top: 100, height: 40 }, 110),
      "before",
    );
  });

  it("returns after when the pointer is in the bottom half", () => {
    assert.equal(
      resolveEditorRowDropPosition({ top: 100, height: 40 }, 130),
      "after",
    );
  });
});

describe("shouldShowEditorDropSlotBefore", () => {
  it("shows only for the hovered before target", () => {
    assert.equal(shouldShowEditorDropSlotBefore(2, 2, "before"), true);
    assert.equal(shouldShowEditorDropSlotBefore(2, 1, "before"), false);
  });
});

describe("shouldShowEditorDropSlotAfter", () => {
  it("shows only for the final row after target", () => {
    assert.equal(shouldShowEditorDropSlotAfter(2, 2, 3, "after"), true);
    assert.equal(shouldShowEditorDropSlotAfter(1, 2, 3, "after"), false);
  });
});
