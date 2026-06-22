/**
 * Compact editor viewport detection — media query parity with puck-editor.css.
 *
 * Run: `npm run test:compact-editor-viewport`
 * Registry: `.ai/docs/testing.md`
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  matchesCompactEditorViewport,
  PUCK_COMPACT_EDITOR_MQ,
  PUCK_DESKTOP_EDITOR_MQ,
} from "@/components/puck/usePuckMobileEditorChrome";

describe("matchesCompactEditorViewport", () => {
  it("uses the compact media query instead of raw innerWidth", () => {
    const win = {
      innerWidth: 1200,
      matchMedia: (query: string) => ({
        matches: query === PUCK_COMPACT_EDITOR_MQ,
        addEventListener: () => {},
        removeEventListener: () => {},
      }),
    } as Window;

    assert.equal(matchesCompactEditorViewport(win), true);
  });

  it("returns false when the compact media query does not match", () => {
    const win = {
      innerWidth: 800,
      matchMedia: (query: string) => ({
        matches: query === PUCK_DESKTOP_EDITOR_MQ,
        addEventListener: () => {},
        removeEventListener: () => {},
      }),
    } as Window;

    assert.equal(matchesCompactEditorViewport(win), false);
  });
});
