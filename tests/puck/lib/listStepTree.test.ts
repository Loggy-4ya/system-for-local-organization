/**
 * @fileoverview Tests for stepper list flat-index helpers, emphasis, and collapse.
 *
 * Run: npm run test:list-step-tree
 * Registry: .ai/docs/testing.md
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildFlatStepRefs,
  buildVisibleStepRows,
  ensureListStepLabels,
  migrateListItems,
  normalizeListStepHtml,
  normalizeConnectorStyle,
  parseListStepFieldPath,
  resolveFlatStepIndex,
  resolveRowEmphasis,
} from "../../../src/components/puck/lib/listStepTree";

describe("listStepTree", () => {
  const nestedItems = [
    { label: "A", text: "", chapterOpen: "yes" as const, children: [] },
    {
      label: "B",
      text: "",
      chapterOpen: "yes" as const,
      children: [
        { label: "B1", text: "", highlighted: false },
        { label: "B2", text: "", highlighted: true },
      ],
    },
  ];

  it("buildFlatStepRefs respects chapterOpen collapse", () => {
    const closed = buildFlatStepRefs(
      [{ ...nestedItems[1], chapterOpen: "no" }],
      "yes",
    );
    assert.equal(closed.length, 1);

    const open = buildFlatStepRefs([nestedItems[1]], "yes");
    assert.equal(open.length, 3);
    assert.deepEqual(open[1], {
      flatIndex: 1,
      parentIndex: 0,
      childIndex: 0,
    });
  });

  it("buildFlatStepRefs expandAll includes collapsed children for sidebar sync", () => {
    const refs = buildFlatStepRefs(
      [{ ...nestedItems[1], chapterOpen: "no" }],
      "yes",
      { expandAll: true },
    );
    assert.equal(refs.length, 3);
  });

  it("resolveFlatStepIndex finds nested child indices when expanded", () => {
    assert.equal(resolveFlatStepIndex(nestedItems, 1, 0, "yes"), 2);
    assert.equal(
      resolveFlatStepIndex(nestedItems, 1, 0, "yes", { expandAll: true }),
      2,
    );
  });

  it("resolveRowEmphasis returns soft when closed parent has highlighted child", () => {
    const parent = {
      label: "B",
      text: "",
      highlighted: false,
      chapterOpen: "no" as const,
      children: [{ label: "B1", text: "", highlighted: true }],
    };
    assert.equal(resolveRowEmphasis(parent, null, "yes"), "soft");
    assert.equal(resolveRowEmphasis(parent, parent.children![0], "yes"), "full");
  });

  it("buildVisibleStepRows attaches emphasis metadata", () => {
    const rows = buildVisibleStepRows([
      {
        label: "Parent",
        text: "",
        highlighted: true,
        chapterOpen: "yes",
        children: [],
      },
    ]);
    assert.equal(rows[0]?.emphasis, "full");
  });

  it("migrateListItems normalizes chapterOpen from defaultExpandNested", () => {
    const items = migrateListItems(
      [{ label: "", text: "", children: [] }],
      "no",
    );
    assert.equal(items[0]?.chapterOpen, "no");
    assert.equal(items[0]?.highlighted, false);
  });

  it("normalizeConnectorStyle maps legacy segment to dashed", () => {
    assert.equal(normalizeConnectorStyle("segment"), "dashed");
    assert.equal(normalizeConnectorStyle("rail"), "rail");
    assert.equal(normalizeConnectorStyle(undefined), "spine");
  });

  it("parseListStepFieldPath reads parent and child indices", () => {
    assert.deepEqual(parseListStepFieldPath("items[2].text"), {
      parentIndex: 2,
      childIndex: null,
    });
    assert.deepEqual(parseListStepFieldPath("items[2].children"), {
      parentIndex: 2,
      childIndex: null,
    });
  });

  it("ensureListStepLabels fills parent and child labels", () => {
    const items = ensureListStepLabels([
      { label: "", text: "", children: [{ label: "", text: "" }] },
    ]);

    assert.equal(items[0].label, "Step 1");
    assert.equal(items[0].children?.[0].label, "Sub-step 1.1");
  });

  it("normalizeListStepHtml wraps legacy plain strings", () => {
    assert.equal(normalizeListStepHtml("Hello"), "<p>Hello</p>");
    assert.equal(normalizeListStepHtml("<p>Hi</p>"), "<p>Hi</p>");
  });
});
