/**
 * @fileoverview Mobile Puck editor — panel visibility and user reachability invariants.
 *
 * Pure helpers used by tests and open-panel modules to guard against compact-mode regressions
 * (0px panel row, blocked sidebar content, missing plugin tab flex chain).
 *
 * Tests: `tests/puck/lib/mobileEditorReachabilityLogic.test.ts` — `npm run test:mobile-editor-reachability`
 *
 * @module src/components/puck/lib/mobileEditorReachabilityLogic
 */

import {
  NEXUS_MOBILE_PANEL_MIN_HEIGHT_PX,
  NEXUS_PANEL_RESIZING_ATTR,
} from "@/components/puck/lib/sidebarLayoutLimits";
import {
  NEXUS_PANEL_OPENING_ATTR,
  shouldSkipMobilePanelOpenAnimation,
} from "@/components/puck/lib/mobilePanelLayout";

/** Bottom-rail plugin tabs on compact editor chrome. */
export const MOBILE_EDITOR_NAV_TABS = ["blocks", "outline", "fields"] as const;

/** Compact bottom-rail tab id. */
export type MobileEditorNavTab = (typeof MOBILE_EDITOR_NAV_TABS)[number];

/** DOM markers that must be present for each tab's panel body to be considered visible. */
export const MOBILE_PANEL_TAB_CONTENT_MARKERS: Record<MobileEditorNavTab, readonly string[]> = {
  blocks: [".nexus-blocks-plugin", ".nexus-field-chapter", '[class*="PuckPluginTab--visible"]'],
  outline: [".nexus-outline-plugin", '[class*="PuckPluginTab--visible"]'],
  fields: ['[class*="FieldsPlugin"]', '[class*="PuckPluginTab--visible"]'],
};

/**
 * `<html>` attributes that temporarily block interaction inside the slide-up sidebar
 * (only during live panel height drag — scroll is frozen while the grid row eases).
 */
export const MOBILE_PANEL_SIDEBAR_INTERACTION_BLOCKING_ATTRS = [
  NEXUS_PANEL_RESIZING_ATTR,
] as const;

/** Attributes that block sidebar interaction only while dragging panel height. */
export const MOBILE_PANEL_SIDEBAR_RESIZE_BLOCKING_ATTRS = [NEXUS_PANEL_RESIZING_ATTR] as const;

/** Required CSS fragments in `puck-editor.css` for mobile panel visibility. */
export const MOBILE_EDITOR_CSS_CONTRACT = {
  narrowPanelOpenGrid:
    '[class*="PuckLayout--leftSideBarVisible"] [class*="PuckLayout-inner"]',
  panelHeightVar: "var(--nexus-mobile-panel-height",
  sidebarForceDisplay: '[class*="PuckLayout--leftSideBarVisible"] [class*="Sidebar--left"]',
  sidebarAboveCanvasChrome: "z-index: 25 !important",
  navAboveSidebar: '[class*="PuckLayout--leftSideBarVisible"] [class*="PuckLayout-nav"]',
  sidebarOpaqueBackground: "background: var(--nexus-editor-panel-bg)",
  pluginTabVisibleFlex: '[class*="PuckPluginTab--visible"]',
  pluginTabBodyFlex: '[class*="PuckPluginTab-body"]',
  fieldsPluginScroll: '[class*="FieldsPlugin"]',
  outlinePluginScroll: ".nexus-outline-plugin",
  blocksComponentList: ".nexus-blocks-plugin",
  mobileOnlyNavTabs: '[class*="NavItem--mobileOnly"]',
  bottomNavGridArea: "grid-area: left",
} as const;

/**
 * Whether a measured compact panel height counts as open (non-void).
 *
 * @param heightPx - Panel height in px from CSS var or layout read.
 * @returns True when height is at least {@link NEXUS_MOBILE_PANEL_MIN_HEIGHT_PX}.
 */
export function isMobilePanelHeightOpen(heightPx: number | undefined): boolean {
  return heightPx !== undefined && heightPx >= NEXUS_MOBILE_PANEL_MIN_HEIGHT_PX;
}

/**
 * Whether sidebar plugin content should accept pointer/scroll input right now.
 *
 * @param htmlAttributes - Active attributes on `<html>`.
 * @returns True when no blocking panel mutation attribute is set.
 */
export function isMobileSidebarContentInteractive(htmlAttributes: readonly string[]): boolean {
  return !htmlAttributes.some((attr) =>
    (MOBILE_PANEL_SIDEBAR_INTERACTION_BLOCKING_ATTRS as readonly string[]).includes(attr),
  );
}

/**
 * Whether the bottom nav rail should remain tappable while the panel is open.
 *
 * Nav uses a higher stacking context than the slide-up panel in compact CSS.
 *
 * @param navZIndex - Computed or authored z-index for `.PuckLayout-nav`.
 * @param sidebarZIndex - Computed or authored z-index for `.Sidebar--left`.
 * @returns True when nav stacks above the plugin panel.
 */
export function isMobileNavRailAbovePanel(navZIndex: number, sidebarZIndex: number): boolean {
  return navZIndex > sidebarZIndex;
}

/**
 * Resolve whether the active tab's panel content markers are all present in the DOM snapshot.
 *
 * @param activeTab - Selected bottom-rail tab, or null when none.
 * @param presentMarkers - Marker substrings known to exist in the document.
 * @returns True when every required marker for the tab is present.
 */
export function isMobilePanelTabContentPresent(
  activeTab: MobileEditorNavTab | null,
  presentMarkers: readonly string[],
): boolean {
  if (activeTab === null) return false;

  const required = MOBILE_PANEL_TAB_CONTENT_MARKERS[activeTab];
  return required.every((marker) =>
    presentMarkers.some((present) => present.includes(marker) || marker.includes(present)),
  );
}

/** Snapshot of compact editor layout state for reachability evaluation. */
export interface MobileEditorReachabilitySnapshot {
  /** Puck `leftSideBarVisible` flag. */
  leftSideBarVisible: boolean;
  /** Measured or authored `--nexus-mobile-panel-height` in px. */
  panelHeightPx: number | undefined;
  /** Active `<html>` attributes (without `data-` prefix optional). */
  htmlAttributes: readonly string[];
  /** Active bottom-rail tab when panel is open. */
  activeTab: MobileEditorNavTab | null;
  /** Marker strings detected in the sidebar DOM subtree. */
  presentPanelMarkers: readonly string[];
  /** Whether open height was applied synchronously before paint on this open. */
  appliedImmediateOpenHeight: boolean;
  /** Authored nav vs sidebar z-index values from compact CSS. */
  navZIndex: number;
  sidebarZIndex: number;
}

/** Result of {@link evaluateMobileEditorReachability}. */
export interface MobileEditorReachabilityResult {
  /** True when the user can see and interact with the open panel content. */
  reachable: boolean;
  /** Human-readable regression hints. */
  issues: string[];
}

/**
 * Evaluate whether the compact settings/blocks/outline panel is visible and reachable.
 *
 * @param snapshot - Layout/DOM snapshot for the current editor session.
 * @returns Reachability verdict and issue list.
 */
export function evaluateMobileEditorReachability(
  snapshot: MobileEditorReachabilitySnapshot,
): MobileEditorReachabilityResult {
  const issues: string[] = [];

  if (!snapshot.leftSideBarVisible) {
    return { reachable: true, issues };
  }

  if (!snapshot.appliedImmediateOpenHeight) {
    issues.push("Panel open must apply target height synchronously before paint (avoid 0px void).");
  }

  if (!isMobilePanelHeightOpen(snapshot.panelHeightPx)) {
    issues.push(
      `Panel height ${snapshot.panelHeightPx ?? "undefined"}px is below minimum ${NEXUS_MOBILE_PANEL_MIN_HEIGHT_PX}px.`,
    );
  }

  if (!isMobileSidebarContentInteractive(snapshot.htmlAttributes)) {
    issues.push("Sidebar content is temporarily non-interactive during panel mutation.");
  }

  if (!isMobileNavRailAbovePanel(snapshot.navZIndex, snapshot.sidebarZIndex)) {
    issues.push("Bottom nav rail must stack above the slide-up panel so tabs stay tappable.");
  }

  if (!isMobilePanelTabContentPresent(snapshot.activeTab, snapshot.presentPanelMarkers)) {
    issues.push(
      `Missing DOM markers for ${snapshot.activeTab ?? "unknown"} tab panel content (black void).`,
    );
  }

  const blockingOnlyOpening = snapshot.htmlAttributes.includes(NEXUS_PANEL_OPENING_ATTR);
  if (
    blockingOnlyOpening &&
    isMobilePanelHeightOpen(snapshot.panelHeightPx) &&
    !isMobilePanelTabContentPresent(snapshot.activeTab, snapshot.presentPanelMarkers)
  ) {
    issues.push("Panel row has height but plugin tab body is absent — check Sidebar flex chain.");
  }

  return {
    reachable: issues.length === 0,
    issues,
  };
}

/**
 * Validate required mobile panel CSS contract fragments in `puck-editor.css`.
 *
 * @param cssText - Full stylesheet text.
 * @returns Missing contract keys (empty when satisfied).
 */
export function findMissingMobileEditorCssContract(cssText: string): string[] {
  const missing: string[] = [];

  for (const [key, fragment] of Object.entries(MOBILE_EDITOR_CSS_CONTRACT)) {
    if (!cssText.includes(fragment)) {
      missing.push(key);
    }
  }

  return missing;
}

/**
 * Whether panel open should use height animation instead of jumping to target.
 *
 * @param currentPx - Current panel height in px.
 * @param targetPx - Target open height in px.
 * @returns True when the open height animation should run.
 */
export function shouldAnimateMobilePanelOpen(
  currentPx: number | undefined,
  targetPx: number,
): boolean {
  return !shouldSkipMobilePanelOpenAnimation(currentPx, targetPx);
}

/**
 * Whether panel open must still apply a target height after animation cancel (Strict Mode).
 *
 * @param currentPx - Current panel height in px.
 * @param targetPx - Target open height in px.
 * @returns True when a synchronous target apply is required as a safety net.
 */
export function shouldUseImmediateMobilePanelOpen(
  currentPx: number | undefined,
  targetPx: number,
): boolean {
  if (currentPx === undefined) return true;
  if (currentPx <= 0) return true;
  if (currentPx < targetPx * 0.85) return true;
  return false;
}
