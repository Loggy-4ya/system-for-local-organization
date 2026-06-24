/**
 * @fileoverview Page comments block derivation helpers.
 *
 * Run: `npm run test:page-comments-block-logic`
 * Registry: `.ai/docs/testing.md`
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  normalizeNexusCommentsBlockEnabled,
  resolvePageCommentsEnabledFromPuckContent,
} from "@shared/lib/pageCommentsBlockLogic";

describe("normalizeNexusCommentsBlockEnabled", () => {
  it("defaults to enabled when unset", () => {
    assert.equal(normalizeNexusCommentsBlockEnabled(undefined), true);
    assert.equal(normalizeNexusCommentsBlockEnabled("on"), true);
  });

  it("treats off/no/false as disabled", () => {
    assert.equal(normalizeNexusCommentsBlockEnabled("off"), false);
    assert.equal(normalizeNexusCommentsBlockEnabled("no"), false);
    assert.equal(normalizeNexusCommentsBlockEnabled(false), false);
  });
});

describe("resolvePageCommentsEnabledFromPuckContent", () => {
  it("returns false when the comments block is absent", () => {
    assert.equal(resolvePageCommentsEnabledFromPuckContent([]), false);
    assert.equal(
      resolvePageCommentsEnabledFromPuckContent([
        { type: "NexusText", props: { id: "t1" } },
      ]),
      false,
    );
  });

  it("returns true when the comments block is present and enabled", () => {
    assert.equal(
      resolvePageCommentsEnabledFromPuckContent([
        { type: "NexusComments", props: { id: "c1", commentsEnabled: "on" } },
      ]),
      true,
    );
  });

  it("returns false when the comments block is toggled off", () => {
    assert.equal(
      resolvePageCommentsEnabledFromPuckContent([
        { type: "NexusComments", props: { id: "c1", commentsEnabled: "off" } },
      ]),
      false,
    );
  });

  it("finds nested comments blocks inside sections", () => {
    assert.equal(
      resolvePageCommentsEnabledFromPuckContent([
        {
          type: "NexusSection",
          props: {
            id: "s1",
            content: [{ type: "NexusComments", props: { id: "c1", commentsEnabled: "on" } }],
          },
        },
      ]),
      true,
    );
  });
});
