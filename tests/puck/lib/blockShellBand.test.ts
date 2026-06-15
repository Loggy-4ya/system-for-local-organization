/**
 * @fileoverview Unit tests for island-off content width band on block shells.
 *
 * Module under test: src/components/puck/lib/spacingFields.ts
 *
 * Run: `npm run test:block-shell-band`
 * Registry: .ai/docs/testing.md
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  ISLAND_DEFAULTS,
  isIslandBandActive,
  type BlockShellProps,
} from "@/components/puck/lib/spacingFields";

/**
 * Build island props for band tests.
 *
 * @param island - Partial island overrides.
 * @returns Block shell props stub.
 */
function bandProps(island: Partial<BlockShellProps>): BlockShellProps {
  return {
    island: { ...ISLAND_DEFAULTS, ...island },
  };
}

describe("isIslandBandActive", () => {
  it("is false when island chrome is enabled", () => {
    assert.equal(
      isIslandBandActive(bandProps({ islandEnabled: true, islandMaxWidth: "lg" })),
      false,
    );
  });

  it("is true by default when island is off (lg band)", () => {
    assert.equal(isIslandBandActive(bandProps({ islandEnabled: false })), true);
  });

  it("is true for xl band without island chrome", () => {
    assert.equal(
      isIslandBandActive(bandProps({ islandEnabled: false, islandMaxWidth: "xl" })),
      true,
    );
  });

  it("is false when max width is full (edge-to-edge bleed)", () => {
    assert.equal(
      isIslandBandActive(bandProps({ islandEnabled: false, islandMaxWidth: "full" })),
      false,
    );
  });

  it("is true for custom max width without island chrome", () => {
    assert.equal(
      isIslandBandActive(
        bandProps({
          islandEnabled: false,
          islandMaxWidth: "custom",
          islandMaxWidthCustom: "960px",
        }),
      ),
      true,
    );
  });
});
