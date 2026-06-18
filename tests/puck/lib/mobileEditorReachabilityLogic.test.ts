/**
 * @fileoverview Unit tests for mobile Puck editor panel visibility and user reachability.
 *
 * Module under test: src/components/puck/lib/mobileEditorReachabilityLogic.ts
 * Related: src/components/puck/NexusMobilePanelOpenAnimation.tsx, src/app/puck-editor.css
 * Registry: .ai/docs/testing.md
 * Run: `npm run test:mobile-editor-reachability`
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  MOBILE_PANEL_SIDEBAR_INTERACTION_BLOCKING_ATTRS,
  MOBILE_PANEL_TAB_CONTENT_MARKERS,
  evaluateMobileEditorReachability,
  findMissingMobileEditorCssContract,
  isMobileNavRailAbovePanel,
  isMobilePanelHeightOpen,
  isMobilePanelTabContentPresent,
  isMobileSidebarContentInteractive,
  shouldAnimateMobilePanelOpen,
  shouldUseImmediateMobilePanelOpen,
} from "@/components/puck/lib/mobileEditorReachabilityLogic";
import { NEXUS_MOBILE_PANEL_MIN_HEIGHT_PX } from "@/components/puck/lib/sidebarLayoutLimits";
import { resolveMobilePanelOpenHeightPx } from "@/components/puck/lib/mobilePanelLayout";

const PUCK_EDITOR_CSS = readFileSync(
  new URL("../../../src/app/puck-editor.css", import.meta.url),
  "utf8",
);

const OPEN_ANIMATION_SOURCE = readFileSync(
  new URL("../../../src/components/puck/NexusMobilePanelOpenAnimation.tsx", import.meta.url),
  "utf8",
);

describe("isMobilePanelHeightOpen", () => {
  it("returns false for undefined and 0px (black void)", () => {
    assert.equal(isMobilePanelHeightOpen(undefined), false);
    assert.equal(isMobilePanelHeightOpen(0), false);
  });

  it("returns true at and above compact minimum height", () => {
    assert.equal(isMobilePanelHeightOpen(NEXUS_MOBILE_PANEL_MIN_HEIGHT_PX), true);
    assert.equal(isMobilePanelHeightOpen(NEXUS_MOBILE_PANEL_MIN_HEIGHT_PX + 40), true);
  });
});

describe("isMobileSidebarContentInteractive", () => {
  it("returns true when no blocking mutation attrs are set", () => {
    assert.equal(isMobileSidebarContentInteractive([]), true);
  });

  it("returns false while panel height is being dragged", () => {
    for (const attr of MOBILE_PANEL_SIDEBAR_INTERACTION_BLOCKING_ATTRS) {
      assert.equal(isMobileSidebarContentInteractive([attr]), false);
    }
  });

  it("remains interactive during panel open/close height easing", () => {
    assert.equal(
      isMobileSidebarContentInteractive(["data-nexus-panel-opening"]),
      true,
    );
    assert.equal(
      isMobileSidebarContentInteractive(["data-nexus-panel-closing"]),
      true,
    );
  });
});

describe("isMobilePanelTabContentPresent", () => {
  it("requires blocks plugin markers for Blocks tab", () => {
    assert.equal(
      isMobilePanelTabContentPresent("blocks", MOBILE_PANEL_TAB_CONTENT_MARKERS.blocks),
      true,
    );
    assert.equal(isMobilePanelTabContentPresent("blocks", ['[class*="FieldsPlugin"]']), false);
  });

  it("requires outline plugin markers for Outline tab", () => {
    assert.equal(
      isMobilePanelTabContentPresent("outline", MOBILE_PANEL_TAB_CONTENT_MARKERS.outline),
      true,
    );
    assert.equal(isMobilePanelTabContentPresent("outline", [".nexus-outline-plugin"]), false);
  });

  it("requires FieldsPlugin markers for Fields tab", () => {
    assert.equal(
      isMobilePanelTabContentPresent("fields", MOBILE_PANEL_TAB_CONTENT_MARKERS.fields),
      true,
    );
    assert.equal(isMobilePanelTabContentPresent("fields", ['[class*="ComponentList"]']), false);
  });
});

describe("isMobileNavRailAbovePanel", () => {
  it("expects nav z-index above sidebar per compact CSS contract", () => {
    assert.equal(isMobileNavRailAbovePanel(30, 25), true);
    assert.equal(isMobileNavRailAbovePanel(25, 30), false);
  });
});

describe("evaluateMobileEditorReachability", () => {
  const settledOpenSnapshot = {
    leftSideBarVisible: true,
    panelHeightPx: 300,
    htmlAttributes: [] as string[],
    activeTab: "fields" as const,
    presentPanelMarkers: MOBILE_PANEL_TAB_CONTENT_MARKERS.fields,
    appliedImmediateOpenHeight: true,
    navZIndex: 30,
    sidebarZIndex: 25,
  };

  it("passes when panel is open, tall enough, and tab content markers exist", () => {
    const result = evaluateMobileEditorReachability(settledOpenSnapshot);
    assert.equal(result.reachable, true);
    assert.deepEqual(result.issues, []);
  });

  it("fails when panel height stayed at 0px (settings panel void)", () => {
    const result = evaluateMobileEditorReachability({
      ...settledOpenSnapshot,
      panelHeightPx: 0,
    });
    assert.equal(result.reachable, false);
    assert.ok(result.issues.some((issue) => issue.includes("below minimum")));
  });

  it("fails when synchronous open height was not applied", () => {
    const result = evaluateMobileEditorReachability({
      ...settledOpenSnapshot,
      appliedImmediateOpenHeight: false,
    });
    assert.equal(result.reachable, false);
    assert.ok(result.issues.some((issue) => issue.includes("synchronously")));
  });

  it("fails when active tab content markers are missing", () => {
    const result = evaluateMobileEditorReachability({
      ...settledOpenSnapshot,
      presentPanelMarkers: [],
    });
    assert.equal(result.reachable, false);
    assert.ok(result.issues.some((issue) => issue.includes("Missing DOM markers")));
  });

  it("is reachable when panel is closed regardless of height", () => {
    const result = evaluateMobileEditorReachability({
      ...settledOpenSnapshot,
      leftSideBarVisible: false,
      panelHeightPx: 0,
    });
    assert.equal(result.reachable, true);
  });
});

describe("shouldAnimateMobilePanelOpen", () => {
  it("animates from 0px or low heights", () => {
    const target = resolveMobilePanelOpenHeightPx(800);
    assert.equal(shouldAnimateMobilePanelOpen(undefined, target), true);
    assert.equal(shouldAnimateMobilePanelOpen(0, target), true);
    assert.equal(shouldAnimateMobilePanelOpen(100, target), true);
    assert.equal(shouldAnimateMobilePanelOpen(target, target), false);
  });
});

describe("shouldUseImmediateMobilePanelOpen", () => {
  it("requires a target-height safety net when height is missing or low", () => {
    const target = resolveMobilePanelOpenHeightPx(800);
    assert.equal(shouldUseImmediateMobilePanelOpen(undefined, target), true);
    assert.equal(shouldUseImmediateMobilePanelOpen(0, target), true);
    assert.equal(shouldUseImmediateMobilePanelOpen(100, target), true);
    assert.equal(shouldUseImmediateMobilePanelOpen(target, target), false);
  });
});

describe("findMissingMobileEditorCssContract", () => {
  it("finds no missing fragments in puck-editor.css", () => {
    const missing = findMissingMobileEditorCssContract(PUCK_EDITOR_CSS);
    assert.deepEqual(
      missing,
      [],
      `Missing mobile CSS contract keys: ${missing.join(", ")}`,
    );
  });
});

describe("NexusMobilePanelOpenAnimation wiring", () => {
  it("animates open height and keeps a target-height fallback", () => {
    assert.match(OPEN_ANIMATION_SOURCE, /animateMobilePanelHeight/);
    assert.match(OPEN_ANIMATION_SOURCE, /scheduleMobilePanelHeightApply/);
    assert.match(OPEN_ANIMATION_SOURCE, /releaseMobilePanelSidebarForInteraction/);
    assert.match(OPEN_ANIMATION_SOURCE, /endMobilePanelCloseSettling/);
    assert.match(OPEN_ANIMATION_SOURCE, /useLayoutEffect/);
  });
});

describe("puck-editor.css mobile panel layout", () => {
  it("uses zero left grid row while the panel opens (overlay keeps canvas full height)", () => {
    assert.match(
      PUCK_EDITOR_CSS,
      /html\[data-nexus-panel-opening\][\s\S]*?grid-template-rows: var\(--nexus-compact-header-row-height\) minmax\(0, 1fr\) 0/,
    );
  });

  it("uses overlay panel with zero left row when panel is open", () => {
    assert.match(
      PUCK_EDITOR_CSS,
      /\.Puck \[class\*="PuckLayout--leftSideBarVisible"\] \[class\*="PuckLayout-inner"\][\s\S]*?grid-template-rows: var\(--nexus-compact-header-row-height\) minmax\(0, 1fr\) 0/,
    );
  });

  it("forces Sidebar--left visible as fixed overlay when panel is open", () => {
    assert.match(
      PUCK_EDITOR_CSS,
      /\.Puck \[class\*="PuckLayout--leftSideBarVisible"\] \[class\*="Sidebar--left"\][\s\S]*?display: flex !important/,
    );
    assert.match(
      PUCK_EDITOR_CSS,
      /\.Puck \[class\*="PuckLayout--leftSideBarVisible"\] \[class\*="Sidebar--left"\][\s\S]*?position: fixed !important/,
    );
    assert.match(
      PUCK_EDITOR_CSS,
      /\.Puck \[class\*="PuckLayout--leftSideBarVisible"\] \[class\*="Sidebar--left"\][\s\S]*?background: var\(--nexus-editor-panel-bg\)/,
    );
  });

  it("neutralizes active nav tint when the compact plugin panel is closed", () => {
    assert.match(
      PUCK_EDITOR_CSS,
      /\.Puck:not\(\[class\*="PuckLayout--leftSideBarVisible"\]\) \[class\*="NavItem--active"\]/,
    );
    assert.match(
      PUCK_EDITOR_CSS,
      /\[class\*="PuckLayout--leftSideBarVisible"\] \[class\*="NavItem--active"\]/,
    );
  });

  it("hides Sidebar--left only when PuckLayout wrapper lacks leftSideBarVisible", () => {
    assert.doesNotMatch(
      PUCK_EDITOR_CSS,
      /\.Puck:not\(\[class\*="PuckLayout--leftSideBarVisible"\]\)/,
      "closed-panel hide must target PuckLayout wrapper, not .Puck root",
    );
    assert.match(
      PUCK_EDITOR_CSS,
      /html\[data-nexus-narrow-editor\][\s\S]*?\[class\*="PuckLayout"\]:not\(\[class\*="PuckLayout-inner"\]\):not\(\[class\*="PuckLayout--leftSideBarVisible"\]\)[\s\S]*?display: none !important/,
    );
  });
});
