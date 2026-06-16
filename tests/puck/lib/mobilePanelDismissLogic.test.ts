/**
 * @fileoverview Unit tests for compact-mode plugin panel swipe-to-dismiss drag logic.
 *
 * Module under test: src/components/puck/lib/mobilePanelDismissLogic.ts
 * Related: src/components/puck/NexusMobilePanelResizer.tsx
 * Registry: .ai/docs/testing.md
 * Run: `npm run test:mobile-panel-dismiss`
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  NEXUS_MOBILE_PANEL_DISMISS_RATIO,
  NEXUS_MOBILE_PANEL_DISMISS_THRESHOLD_PX,
  resolveMobilePanelDismissThresholdPx,
  resolveMobilePanelDragHeightPx,
  resolveMobilePanelDragSettleHeightPx,
  shouldDismissMobilePanelOnDragEnd,
} from "@/components/puck/lib/mobilePanelDismissLogic";
import {
  isMobilePanelHeightClosedPx,
  resetMobilePanelPersistedHeightToDefault,
} from "@/components/puck/lib/mobilePanelLayout";
import {
  NEXUS_MOBILE_PANEL_HEIGHT_STORAGE_KEY,
  NEXUS_MOBILE_PANEL_MIN_HEIGHT_PX,
  resolveMobilePanelDefaultOpenHeightPx,
} from "@/components/puck/lib/sidebarLayoutLimits";

describe("resolveMobilePanelDismissThresholdPx", () => {
  it("uses ratio for tall panels and absolute cap for short panels", () => {
    assert.equal(
      resolveMobilePanelDismissThresholdPx(480),
      Math.min(NEXUS_MOBILE_PANEL_DISMISS_THRESHOLD_PX, Math.round(480 * NEXUS_MOBILE_PANEL_DISMISS_RATIO)),
    );
    assert.equal(
      resolveMobilePanelDismissThresholdPx(NEXUS_MOBILE_PANEL_MIN_HEIGHT_PX),
      Math.round(NEXUS_MOBILE_PANEL_MIN_HEIGHT_PX * NEXUS_MOBILE_PANEL_DISMISS_RATIO),
    );
  });
});

describe("resolveMobilePanelDragHeightPx", () => {
  it("clamps upward drags to max height", () => {
    assert.equal(resolveMobilePanelDragHeightPx(200, 400, 900), 480);
  });

  it("allows downward drags below the resize minimum toward zero", () => {
    const start = 200;
    assert.equal(resolveMobilePanelDragHeightPx(start, -100, 900), 100);
    assert.equal(resolveMobilePanelDragHeightPx(start, -200, 900), 0);
    assert.equal(resolveMobilePanelDragHeightPx(start, -20, 900), 180);
  });
});

describe("shouldDismissMobilePanelOnDragEnd", () => {
  it("dismisses at or below the threshold", () => {
    const start = 400;
    const threshold = resolveMobilePanelDismissThresholdPx(start);
    assert.equal(shouldDismissMobilePanelOnDragEnd(threshold, start), true);
    assert.equal(shouldDismissMobilePanelOnDragEnd(threshold + 1, start), false);
  });
});

describe("resolveMobilePanelDragSettleHeightPx", () => {
  it("snaps sub-min releases back to the resize minimum", () => {
    const viewport = 900;
    const threshold = resolveMobilePanelDismissThresholdPx(400);
    assert.equal(
      resolveMobilePanelDragSettleHeightPx(threshold + 1, viewport),
      NEXUS_MOBILE_PANEL_MIN_HEIGHT_PX,
    );
  });

  it("clamps valid releases within min/max", () => {
    const viewport = 900;
    assert.equal(resolveMobilePanelDragSettleHeightPx(240, viewport), 240);
  });
});

describe("isMobilePanelHeightClosedPx", () => {
  it("treats zero and undefined as closed", () => {
    assert.equal(isMobilePanelHeightClosedPx(undefined), true);
    assert.equal(isMobilePanelHeightClosedPx(0), true);
    assert.equal(isMobilePanelHeightClosedPx(40), false);
  });
});

describe("resetMobilePanelPersistedHeightToDefault", () => {
  it("writes the default open height to localStorage", () => {
    const store = new Map<string, string>();
    const original = globalThis.localStorage;

    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => {
          store.set(key, value);
        },
        removeItem: (key: string) => {
          store.delete(key);
        },
      },
    });

    try {
      resetMobilePanelPersistedHeightToDefault(1000);
      assert.equal(
        store.get(NEXUS_MOBILE_PANEL_HEIGHT_STORAGE_KEY),
        String(resolveMobilePanelDefaultOpenHeightPx(1000)),
      );
    } finally {
      Object.defineProperty(globalThis, "localStorage", {
        configurable: true,
        value: original,
      });
    }
  });
});
