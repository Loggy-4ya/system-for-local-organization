/**
 * @fileoverview Unit tests for island defaults on insert and move.
 *
 * Module under test: src/components/puck/lib/applyIslandDefaultsOnInsert.ts
 * Registry: .ai/docs/testing.md
 * Run: `npm run test:island-defaults`
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { DEFAULT_ISLAND_COMPONENTS } from "@shared/constants/editorSettings";
import { resolveInsertDefaultsProps } from "@/components/puck/lib/applyIslandDefaultsOnInsert";
import { ISLAND_DEFAULTS, type BlockShellProps } from "@/components/puck/lib/spacingFields";

const settings = { islandDefaultComponents: DEFAULT_ISLAND_COMPONENTS };

/**
 * Build minimal block shell props for resolveData tests.
 *
 * @param islandEnabled - Whether island mode is on.
 * @param spacing - Optional spacing override.
 * @returns Block shell props stub.
 */
function shellProps(
  islandEnabled: boolean,
  spacing: BlockShellProps["spacing"] = { marginTop: "none", marginBottom: "none" },
): BlockShellProps {
  return {
    island: { ...ISLAND_DEFAULTS, islandEnabled },
    spacing,
  };
}

describe("resolveInsertDefaultsProps move trigger", () => {
  it("enables island when a heading moves to the root canvas", () => {
    const result = resolveInsertDefaultsProps(
      "NexusHeading",
      shellProps(false),
      {
        trigger: "move",
        parent: null,
      },
      settings,
    );

    assert.equal(result.island?.islandEnabled, true);
    assert.notEqual(result.spacing?.marginTop, "none");
    assert.notEqual(result.spacing?.marginBottom, "none");
  });

  it("enables island for text, quote, and list blocks moved to root", () => {
    for (const componentType of ["NexusText", "NexusQuote", "NexusList"] as const) {
      const result = resolveInsertDefaultsProps(
        componentType,
        shellProps(false),
        {
          trigger: "move",
          parent: null,
        },
        settings,
      );

      assert.equal(result.island?.islandEnabled, true, componentType);
    }
  });

  it("disables island when a heading moves into a section shell", () => {
    const result = resolveInsertDefaultsProps(
      "NexusHeading",
      shellProps(true, { marginTop: "sm", marginBottom: "sm" }),
      {
        trigger: "move",
        parent: {
          type: "NexusSection",
          props: shellProps(true),
        },
      },
      settings,
    );

    assert.equal(result.island?.islandEnabled, false);
    assert.equal(result.spacing?.marginTop, "none");
    assert.equal(result.spacing?.marginBottom, "none");
  });

  it("keeps island off when reordering inside a section", () => {
    const result = resolveInsertDefaultsProps(
      "NexusHeading",
      shellProps(false),
      {
        trigger: "move",
        parent: {
          type: "NexusSection",
          props: shellProps(true),
        },
      },
      settings,
    );

    assert.equal(result.island?.islandEnabled, false);
  });

  it("clears vertical margins when image is inserted into a grid cell", () => {
    const result = resolveInsertDefaultsProps(
      "NexusImage",
      shellProps(false, { marginTop: "sm", marginBottom: "sm" }),
      {
        trigger: "insert",
        parent: {
          type: "NexusGrid",
          props: shellProps(false),
        },
      },
      settings,
    );

    assert.equal(result.spacing?.marginTop, "none");
    assert.equal(result.spacing?.marginBottom, "none");
  });

  it("clears vertical margins when video is inserted into a grid cell", () => {
    const result = resolveInsertDefaultsProps(
      "NexusVideo",
      shellProps(false, { marginTop: "sm", marginBottom: "sm" }),
      {
        trigger: "insert",
        parent: {
          type: "NexusGrid",
          props: shellProps(false),
        },
      },
      settings,
    );

    assert.equal(result.spacing?.marginTop, "none");
    assert.equal(result.spacing?.marginBottom, "none");
  });

  it("keeps root SM margins when image is inserted on the page root", () => {
    const result = resolveInsertDefaultsProps(
      "NexusImage",
      shellProps(false, { marginTop: "none", marginBottom: "none" }),
      {
        trigger: "insert",
        parent: null,
      },
      settings,
    );

    assert.notEqual(result.spacing?.marginTop, "none");
    assert.notEqual(result.spacing?.marginBottom, "none");
  });

  it("preserves user-chosen vertical margins inside a grid cell on move", () => {
    const result = resolveInsertDefaultsProps(
      "NexusVideo",
      shellProps(false, { marginTop: "md", marginBottom: "lg" }),
      {
        trigger: "move",
        parent: {
          type: "NexusGrid",
          props: shellProps(false),
        },
      },
      settings,
    );

    assert.equal(result.spacing?.marginTop, "md");
    assert.equal(result.spacing?.marginBottom, "lg");
  });

  it("does not reset user SM margins inside a grid cell after insert defaults ran", () => {
    const result = resolveInsertDefaultsProps(
      "NexusVideo",
      shellProps(false, { marginTop: "sm", marginBottom: "sm" }),
      {
        trigger: "load",
        parent: {
          type: "NexusGrid",
          props: shellProps(false),
        },
      },
      settings,
    );

    assert.equal(result.spacing?.marginTop, "sm");
    assert.equal(result.spacing?.marginBottom, "sm");
  });
});
