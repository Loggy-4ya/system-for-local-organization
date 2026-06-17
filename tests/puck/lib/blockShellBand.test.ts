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
  buildWidthConstrainedRootStyle,
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

  it("is false by default when island is off (full bleed)", () => {
    assert.equal(isIslandBandActive(bandProps({ islandEnabled: false })), false);
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

describe("buildWidthConstrainedRootStyle", () => {
  it("centers the root shell with max-width for Puck overlay sizing", () => {
    const style = buildWidthConstrainedRootStyle(
      { marginTop: "8px", marginBottom: "8px", width: "100%" },
      "1200px",
      "center",
    );

    assert.equal(style.maxWidth, "1200px");
    assert.equal(style.marginLeft, "auto");
    assert.equal(style.marginRight, "auto");
    assert.equal(style.marginTop, "8px");
  });
});
