/**
 * @fileoverview Unit tests for PageRoot background grid motion resolution.
 *
 * Module under test: src/components/puck/lib/pageRootFieldProps.ts
 * Registry: .ai/docs/testing.md
 * Run: `npm run test:page-root-field-props`
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  resolvePageBackgroundGridIsStatic,
  resolvePageBackgroundProps,
} from "@/components/puck/lib/pageRootFieldProps";
import {
  getPageBackgroundGridIsStatic,
  resetPageBackgroundGrid,
  setPageBackgroundGridFromRootProps,
} from "@/components/background/pageBackgroundGridStore";

describe("resolvePageBackgroundGridIsStatic", () => {
  it("returns false for dynamic site-default backgrounds", () => {
    assert.equal(
      resolvePageBackgroundGridIsStatic({
        pageBackground: {
          background: "site-default",
          backgroundGridMotion: "dynamic",
        },
      }),
      false,
    );
  });

  it("returns true for static site-default backgrounds", () => {
    assert.equal(
      resolvePageBackgroundGridIsStatic({
        pageBackground: {
          background: "site-default",
          backgroundGridMotion: "static",
        },
      }),
      true,
    );
  });

  it("ignores static motion when the page uses a solid background", () => {
    assert.equal(
      resolvePageBackgroundGridIsStatic({
        pageBackground: {
          background: "solid",
          backgroundGridMotion: "static",
        },
      }),
      false,
    );
  });

  it("reads legacy appearance.backgroundGridMotion", () => {
    assert.equal(
      resolvePageBackgroundGridIsStatic({
        appearance: {
          background: "site-default",
          backgroundGridMotion: "static",
        },
      }),
      true,
    );
  });
});

describe("pageBackgroundGridStore", () => {
  it("syncs static mode from root props and resets to dynamic", () => {
    resetPageBackgroundGrid();
    assert.equal(getPageBackgroundGridIsStatic(), false);

    setPageBackgroundGridFromRootProps({
      pageBackground: {
        background: "site-default",
        backgroundGridMotion: "static",
      },
    });
    assert.equal(getPageBackgroundGridIsStatic(), true);

    resetPageBackgroundGrid();
    assert.equal(getPageBackgroundGridIsStatic(), false);
  });
});

describe("resolvePageBackgroundProps", () => {
  it("defaults grid motion to dynamic", () => {
    assert.equal(
      resolvePageBackgroundProps({
        pageBackground: { background: "site-default" },
      }).backgroundGridMotion,
      "dynamic",
    );
  });
});
