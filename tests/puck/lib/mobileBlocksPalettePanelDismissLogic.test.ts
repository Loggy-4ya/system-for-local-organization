/**
 * @fileoverview Unit tests for compact-mode Blocks palette panel auto-dismiss logic.
 *
 * Module under test: src/components/puck/lib/mobileBlocksPalettePanelDismissLogic.ts
 * Related: src/components/puck/NexusMobileBlocksPalettePanelDismiss.tsx
 * Registry: .ai/docs/testing.md
 * Run: `npm run test:mobile-blocks-palette-dismiss`
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  isPointerOutsideMobilePluginPanelBounds,
  MOBILE_BLOCKS_PALETTE_PANEL_DISMISS_EDGE_TOLERANCE_PX,
  shouldRequestMobilePanelDismissOnBlocksPaletteDrag,
  shouldRequestMobilePanelDismissOnPaletteDragStart,
} from "@/components/puck/lib/mobileBlocksPalettePanelDismissLogic";

const PANEL_RECT = {
  left: 0,
  top: 500,
  right: 390,
  bottom: 700,
};

describe("isPointerOutsideMobilePluginPanelBounds", () => {
  it("returns false for pointers inside the panel", () => {
    assert.equal(isPointerOutsideMobilePluginPanelBounds(200, 600, PANEL_RECT, 0), false);
  });

  it("returns true when the pointer moves above the panel toward the canvas", () => {
    assert.equal(
      isPointerOutsideMobilePluginPanelBounds(
        200,
        PANEL_RECT.top - MOBILE_BLOCKS_PALETTE_PANEL_DISMISS_EDGE_TOLERANCE_PX - 1,
        PANEL_RECT,
      ),
      true,
    );
  });

  it("allows a small inset before counting as outside", () => {
    assert.equal(
      isPointerOutsideMobilePluginPanelBounds(
        200,
        PANEL_RECT.top + MOBILE_BLOCKS_PALETTE_PANEL_DISMISS_EDGE_TOLERANCE_PX,
        PANEL_RECT,
      ),
      false,
    );
  });
});

describe("shouldRequestMobilePanelDismissOnBlocksPaletteDrag", () => {
  it("requests dismiss when palette drag leaves the panel on the Blocks tab", () => {
    assert.equal(
      shouldRequestMobilePanelDismissOnBlocksPaletteDrag({
        clientX: 200,
        clientY: 450,
        panelRect: PANEL_RECT,
        panelVisible: true,
        blocksTabActive: true,
        paletteDragActive: true,
        alreadyDismissedThisDrag: false,
      }),
      true,
    );
  });

  it("does not dismiss while the pointer stays inside the panel", () => {
    assert.equal(
      shouldRequestMobilePanelDismissOnBlocksPaletteDrag({
        clientX: 200,
        clientY: 600,
        panelRect: PANEL_RECT,
        panelVisible: true,
        blocksTabActive: true,
        paletteDragActive: true,
        alreadyDismissedThisDrag: false,
      }),
      false,
    );
  });

  it("ignores palette drags on other tabs or when the panel is closed", () => {
    assert.equal(
      shouldRequestMobilePanelDismissOnBlocksPaletteDrag({
        clientX: 200,
        clientY: 450,
        panelRect: PANEL_RECT,
        panelVisible: true,
        blocksTabActive: false,
        paletteDragActive: true,
        alreadyDismissedThisDrag: false,
      }),
      false,
    );

    assert.equal(
      shouldRequestMobilePanelDismissOnBlocksPaletteDrag({
        clientX: 200,
        clientY: 450,
        panelRect: PANEL_RECT,
        panelVisible: false,
        blocksTabActive: true,
        paletteDragActive: true,
        alreadyDismissedThisDrag: false,
      }),
      false,
    );
  });

  it("dismisses only once per drag session", () => {
    assert.equal(
      shouldRequestMobilePanelDismissOnBlocksPaletteDrag({
        clientX: 200,
        clientY: 450,
        panelRect: PANEL_RECT,
        panelVisible: true,
        blocksTabActive: true,
        paletteDragActive: true,
        alreadyDismissedThisDrag: true,
      }),
      false,
    );
  });
});

describe("shouldRequestMobilePanelDismissOnPaletteDragStart", () => {
  it("dismisses immediately for Blocks palette drags only", () => {
    assert.equal(
      shouldRequestMobilePanelDismissOnPaletteDragStart({
        panelVisible: true,
        paletteDragActive: true,
        blocksTabActive: true,
      }),
      true,
    );

    assert.equal(
      shouldRequestMobilePanelDismissOnPaletteDragStart({
        panelVisible: true,
        paletteDragActive: true,
        blocksTabActive: false,
      }),
      false,
    );

    assert.equal(
      shouldRequestMobilePanelDismissOnPaletteDragStart({
        panelVisible: false,
        paletteDragActive: true,
        blocksTabActive: true,
      }),
      false,
    );
  });
});
