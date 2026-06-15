/**
 * @fileoverview Unit tests for compact-mode nav tab double-tap gesture logic.
 *
 * Module under test: src/components/puck/lib/mobileNavPanelGestureLogic.ts
 * Related: src/components/puck/NexusMobileNavPanelGestures.tsx
 * Registry: .ai/docs/testing.md
 * Run: `npm run test:mobile-nav-gestures`
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  MOBILE_NAV_DOUBLE_TAP_DISPATCH_DEDUPE_MS,
  MOBILE_NAV_DOUBLE_TAP_MS,
  MOBILE_NAV_GHOST_CLICK_SUPPRESS_MS,
  createMobileNavTapState,
  isGhostNavClick,
  isPrimaryPointerTap,
  isPrimaryTouchTap,
  isWithinMobileNavDoubleTapWindow,
  processMobileNavTap,
  recordNavPointerDown,
  resolveActiveNavLink,
  resolveMobileNavPanelToggle,
  resolveNavLinkFromTarget,
  shouldBlockActiveNavTab,
  shouldDedupeDoubleTapDispatch,
} from "@/components/puck/lib/mobileNavPanelGestureLogic";

/**
 * Build a fake active nav link element for tests.
 *
 * @param label - Visible link label.
 * @returns HTMLElement stub.
 */
function createActiveNavLink(label: string): HTMLElement {
  const li = {
    className: "_NavItem_abc _NavItem--active_def",
    parentElement: null as HTMLElement | null,
  } as HTMLElement;

  const link = {
    className: "_NavItem-link_abc",
    parentElement: li,
    textContent: label,
    dataset: {},
    getAttribute: () => null,
    closest(selector: string) {
      if (selector.includes("NavItem-link")) return link;
      return null;
    },
  } as unknown as HTMLElement;

  li.parentElement = null;
  Object.defineProperty(li, "parentElement", { value: null });
  return link;
}

describe("isPrimaryPointerTap", () => {
  it("accepts mouse primary button", () => {
    assert.equal(isPrimaryPointerTap({ pointerType: "mouse", button: 0 }), true);
    assert.equal(isPrimaryPointerTap({ pointerType: "mouse", button: 1 }), false);
  });

  it("accepts touch lifts with button -1", () => {
    assert.equal(isPrimaryPointerTap({ pointerType: "touch", button: -1 }), true);
  });
});

describe("isPrimaryTouchTap", () => {
  it("accepts single-finger touchend", () => {
    assert.equal(isPrimaryTouchTap({ changedTouches: [{} as Touch] }), true);
    assert.equal(isPrimaryTouchTap({ changedTouches: [{} as Touch, {} as Touch] }), false);
  });
});

describe("processMobileNavTap", () => {
  it("detects a double-tap from two pointer taps on the same link", () => {
    const state = createMobileNavTapState();
    const link = createActiveNavLink("Fields");

    assert.deepEqual(
      processMobileNavTap({ state, now: 1000, link, source: "pointer" }),
      { type: "record-single-tap" },
    );

    assert.deepEqual(
      processMobileNavTap({ state, now: 1200, link, source: "pointer" }),
      { type: "double-tap-toggle" },
    );
  });

  it("detects double-tap across remounted link elements with the same label", () => {
    const state = createMobileNavTapState();
    const firstLink = createActiveNavLink("Fields");
    const remountedLink = createActiveNavLink("Fields");

    processMobileNavTap({ state, now: 1000, link: firstLink, source: "touch" });
    assert.deepEqual(
      processMobileNavTap({ state, now: 1200, link: remountedLink, source: "touch" }),
      { type: "double-tap-toggle" },
    );
  });

  it("dedupes touchend and pointerup for the same physical tap", () => {
    const state = createMobileNavTapState();
    const link = createActiveNavLink("Outline");

    assert.deepEqual(
      processMobileNavTap({ state, now: 1000, link, source: "touch" }),
      { type: "record-single-tap" },
    );
    assert.deepEqual(
      processMobileNavTap({ state, now: 1020, link, source: "pointer" }),
      { type: "ignore" },
    );
  });

  it("does not treat slow second taps as double-tap", () => {
    const state = createMobileNavTapState();
    const link = createActiveNavLink("Fields");

    processMobileNavTap({ state, now: 1000, link, source: "touch" });
    assert.deepEqual(
      processMobileNavTap({
        state,
        now: 1000 + MOBILE_NAV_DOUBLE_TAP_MS + 1,
        link,
        source: "touch",
      }),
      { type: "record-single-tap" },
    );
  });

  it("suppresses ghost click after pointer tap", () => {
    const state = createMobileNavTapState();
    const link = createActiveNavLink("Outline");

    recordNavPointerDown(state, 2000);
    processMobileNavTap({ state, now: 2000, link, source: "pointer" });
    assert.equal(isGhostNavClick(state, 2100), true);
    assert.deepEqual(
      processMobileNavTap({ state, now: 2100, link, source: "click", clickDetail: 1 }),
      { type: "ignore" },
    );
  });

  it("allows a fast second click when a new press started after the first tap", () => {
    const state = createMobileNavTapState();
    const link = createActiveNavLink("Fields");

    recordNavPointerDown(state, 1000);
    processMobileNavTap({ state, now: 1000, link, source: "click", clickDetail: 1 });
    recordNavPointerDown(state, 1180);
    assert.equal(isGhostNavClick(state, 1180), false);
    assert.deepEqual(
      processMobileNavTap({ state, now: 1180, link, source: "click", clickDetail: 1 }),
      { type: "double-tap-toggle" },
    );
  });

  it("detects DevTools-style double-click via pointer then delayed click", () => {
    const state = createMobileNavTapState();
    const link = createActiveNavLink("Fields");

    recordNavPointerDown(state, 1000);
    processMobileNavTap({ state, now: 1000, link, source: "pointer" });
    recordNavPointerDown(state, 1250);
    assert.deepEqual(
      processMobileNavTap({ state, now: 1250, link, source: "click", clickDetail: 1 }),
      { type: "double-tap-toggle" },
    );
  });

  it("detects DevTools-style double-click from two click events", () => {
    const state = createMobileNavTapState();
    const link = createActiveNavLink("Fields");

    recordNavPointerDown(state, 1000);
    processMobileNavTap({ state, now: 1000, link, source: "click", clickDetail: 1 });
    recordNavPointerDown(state, 1200);
    assert.deepEqual(
      processMobileNavTap({ state, now: 1200, link, source: "click", clickDetail: 1 }),
      { type: "double-tap-toggle" },
    );
  });

  it("detects native double-click via click detail 2", () => {
    const state = createMobileNavTapState();
    const link = createActiveNavLink("Blocks");

    assert.deepEqual(
      processMobileNavTap({ state, now: 5000, link, source: "click", clickDetail: 2 }),
      { type: "double-tap-toggle" },
    );
  });

  it("allows a second double-tap soon after the first toggle dispatch", () => {
    const state = createMobileNavTapState();
    const link = createActiveNavLink("Fields");

    processMobileNavTap({ state, now: 1000, link, source: "pointer" });
    processMobileNavTap({ state, now: 1200, link, source: "pointer" });

    processMobileNavTap({ state, now: 1500, link, source: "pointer" });
    assert.deepEqual(
      processMobileNavTap({ state, now: 1700, link, source: "pointer" }),
      { type: "double-tap-toggle" },
    );
  });

  it("dedupes pointer and click dispatches for the same double-tap within ghost-click window", () => {
    const state = createMobileNavTapState();
    const link = createActiveNavLink("Blocks");

    processMobileNavTap({ state, now: 3000, link, source: "pointer" });
    assert.deepEqual(
      processMobileNavTap({ state, now: 3200, link, source: "pointer" }),
      { type: "double-tap-toggle" },
    );

    assert.deepEqual(
      processMobileNavTap({ state, now: 3210, link, source: "click", clickDetail: 2 }),
      { type: "ignore" },
    );
  });

  it("suppresses ghost click detail 2 after a touch double-tap within ghost-click window", () => {
    const state = createMobileNavTapState();
    const link = createActiveNavLink("Fields");

    processMobileNavTap({ state, now: 1000, link, source: "touch" });
    assert.deepEqual(
      processMobileNavTap({ state, now: 1200, link, source: "touch" }),
      { type: "double-tap-toggle" },
    );

    assert.deepEqual(
      processMobileNavTap({ state, now: 1450, link, source: "click", clickDetail: 2 }),
      { type: "ignore" },
    );
  });

  it("allows collapse double-tap after expand double-tap when spaced beyond ghost-click dedupe", () => {
    const state = createMobileNavTapState();
    const link = createActiveNavLink("Outline");

    processMobileNavTap({ state, now: 1000, link, source: "touch" });
    processMobileNavTap({ state, now: 1200, link, source: "touch" });

    processMobileNavTap({ state, now: 2000, link, source: "touch" });
    assert.deepEqual(
      processMobileNavTap({ state, now: 2200, link, source: "touch" }),
      { type: "double-tap-toggle" },
    );
  });

  it("does not dedupe separate double-taps spaced beyond dispatch dedupe window", () => {
    assert.equal(
      shouldDedupeDoubleTapDispatch(1000, 1000 + MOBILE_NAV_DOUBLE_TAP_DISPATCH_DEDUPE_MS),
      true,
    );
    assert.equal(
      shouldDedupeDoubleTapDispatch(
        1000,
        1000 + MOBILE_NAV_DOUBLE_TAP_DISPATCH_DEDUPE_MS + 1,
      ),
      false,
    );
    assert.equal(MOBILE_NAV_DOUBLE_TAP_DISPATCH_DEDUPE_MS, MOBILE_NAV_GHOST_CLICK_SUPPRESS_MS);
  });

  it("records lastPrimaryTapEndAt on each primary tap", () => {
    const state = createMobileNavTapState();
    const link = createActiveNavLink("Fields");
    const now = 5000;

    processMobileNavTap({ state, now, link, source: "touch" });
    assert.equal(state.lastPrimaryTapEndAt, now);
  });
});

describe("shouldBlockActiveNavTab", () => {
  it("blocks while the plugin panel is open", () => {
    const link = createActiveNavLink("Fields");

    assert.equal(
      shouldBlockActiveNavTab({
        isCompactViewport: true,
        leftSideBarVisible: true,
        isNavRailTarget: true,
        link,
        tapState: createMobileNavTapState(),
        now: 1000,
      }),
      true,
    );
  });

  it("keeps blocking through the double-tap pairing window after the first tap", () => {
    const state = createMobileNavTapState();
    const link = createActiveNavLink("Outline");

    processMobileNavTap({ state, now: 1000, link, source: "touch" });
    assert.equal(isWithinMobileNavDoubleTapWindow(state, 1200), true);

    assert.equal(
      shouldBlockActiveNavTab({
        isCompactViewport: true,
        leftSideBarVisible: false,
        isNavRailTarget: true,
        link,
        tapState: state,
        now: 1200,
      }),
      true,
    );
  });

  it("does not block inactive tabs or non-compact viewports", () => {
    assert.equal(
      shouldBlockActiveNavTab({
        isCompactViewport: true,
        leftSideBarVisible: true,
        isNavRailTarget: true,
        link: null,
        tapState: createMobileNavTapState(),
        now: 1000,
      }),
      false,
    );

    assert.equal(
      shouldBlockActiveNavTab({
        isCompactViewport: false,
        leftSideBarVisible: true,
        isNavRailTarget: true,
        link: createActiveNavLink("Fields"),
        tapState: createMobileNavTapState(),
        now: 1000,
      }),
      false,
    );
  });
});

describe("resolveActiveNavLink", () => {
  it("resolves the active nav link from icon descendants", () => {
    const link = createActiveNavLink("Fields");
    const icon = {
      closest(selector: string) {
        if (selector.includes("NavItem-link")) return link;
        return null;
      },
    } as unknown as HTMLElement;

    assert.equal(resolveActiveNavLink(icon), link);
    assert.equal(resolveNavLinkFromTarget(icon), link);
  });

  it("returns null for inactive nav items", () => {
    const inactiveLink = {
      className: "_NavItem-link_abc",
      parentElement: { className: "_NavItem_abc" },
      closest(selector: string) {
        if (selector.includes("NavItem-link")) return inactiveLink;
        return null;
      },
    } as unknown as HTMLElement;

    assert.equal(resolveActiveNavLink(inactiveLink), null);
  });
});

describe("resolveMobileNavPanelToggle", () => {
  it("expands when the panel is not marked expanded", () => {
    assert.deepEqual(
      resolveMobileNavPanelToggle(
        {
          isMobilePanelExpanded: false,
          currentHeightPx: 240,
          maxHeightPx: 480,
        },
        () => 160,
      ),
      {
        action: "expand",
        preExpandHeightPx: 240,
      },
    );
  });

  it("collapses to pre-expand height when marked expanded", () => {
    assert.deepEqual(
      resolveMobileNavPanelToggle(
        {
          isMobilePanelExpanded: true,
          currentHeightPx: 480,
          maxHeightPx: 480,
        },
        () => 240,
      ),
      {
        action: "collapse",
        restoreHeightPx: 240,
      },
    );
  });

  it("does not collapse just because persisted height is near max", () => {
    assert.deepEqual(
      resolveMobileNavPanelToggle(
        {
          isMobilePanelExpanded: false,
          currentHeightPx: 476,
          maxHeightPx: 480,
        },
        () => 240,
      ),
      {
        action: "expand",
        preExpandHeightPx: 476,
      },
    );
  });
});
