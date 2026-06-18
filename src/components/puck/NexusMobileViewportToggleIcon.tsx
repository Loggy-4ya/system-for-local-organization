"use client";

/**
 * @fileoverview Viewport FAB icon — reflects the active canvas preset when collapsed.
 *
 * Puck's toggle always renders a monitor icon when collapsed. This enhancer portals
 * the matching preset icon (phone / tablet / desktop / full-width) on desktop and compact.
 *
 * @module src/components/puck/NexusMobileViewportToggleIcon
 */

import { useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Expand, Monitor, Smartphone, Tablet } from "lucide-react";
import { useNexusPuck } from "@/components/puck/lib/useNexusPuck";
import { NEXUS_EDITOR_VIEWPORTS } from "@/components/puck/lib/resolveAutoViewport";
import { PUCK_COMPACT_EDITOR_MQ } from "@/components/puck/usePuckMobileEditorChrome";

/** Cached toggle node for stable `useSyncExternalStore` snapshots. */
let cachedToggleButton: HTMLButtonElement | null = null;

/** Shared Lucide props for the collapsed viewport toggle glyph. */
const VIEWPORT_TOGGLE_ICON_PROPS = { size: 16, strokeWidth: 2 } as const;

/**
 * Render the Lucide icon for a Puck viewport width ({@link NEXUS_EDITOR_VIEWPORTS}).
 *
 * @param width - Active viewport width from Puck UI state.
 * @returns Icon element for the preset.
 */
function renderViewportToggleIcon(width: number | "100%"): ReactNode {
  const preset =
    NEXUS_EDITOR_VIEWPORTS.find((viewport) => viewport.width === width) ??
    NEXUS_EDITOR_VIEWPORTS[0];

  switch (preset.icon) {
    case "Tablet":
      return <Tablet {...VIEWPORT_TOGGLE_ICON_PROPS} />;
    case "Monitor":
      return <Monitor {...VIEWPORT_TOGGLE_ICON_PROPS} />;
    case "FullWidth":
      return <Expand {...VIEWPORT_TOGGLE_ICON_PROPS} />;
    default:
      return <Smartphone {...VIEWPORT_TOGGLE_ICON_PROPS} />;
  }
}

/**
 * Locate Puck's collapsed viewport toggle button (desktop top FAB or compact bottom FAB).
 *
 * @returns Toggle button, or null when unavailable or tray is expanded.
 */
function getCollapsedToggleButton(): HTMLButtonElement | null {
  if (typeof document === "undefined") {
    cachedToggleButton = null;
    return null;
  }

  const button = document.querySelector(
    '.Puck [class*="ViewportControls"]:not([class*="ViewportControls--isExpanded"]) [class*="ViewportControls-toggleButton_"]',
  ) as HTMLButtonElement | null;

  if (button === cachedToggleButton) {
    return cachedToggleButton;
  }

  cachedToggleButton = button;
  return button;
}

/**
 * Subscribe to DOM/class changes that affect the collapsed toggle mount.
 *
 * @param onStoreChange - Invalidation callback for `useSyncExternalStore`.
 * @returns Teardown function.
 */
function subscribeCollapsedToggle(onStoreChange: () => void): () => void {
  const observer = new MutationObserver(onStoreChange);
  observer.observe(document.body, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ["class"],
  });

  const media = window.matchMedia(PUCK_COMPACT_EDITOR_MQ);
  media.addEventListener("change", onStoreChange);

  return () => {
    observer.disconnect();
    media.removeEventListener("change", onStoreChange);
  };
}

/**
 * Portals the active viewport preset icon into Puck's collapsed viewport FAB.
 *
 * @returns null — renders via portal when the native toggle exists.
 */
export function NexusMobileViewportToggleIcon() {
  const activeViewportWidth = useNexusPuck(
    (state) => state.appState.ui.viewports.current.width,
  );

  const toggleButton = useSyncExternalStore(
    subscribeCollapsedToggle,
    getCollapsedToggleButton,
    () => null,
  );

  if (!toggleButton) return null;

  return createPortal(
    <span className="nexus-viewport-toggle-icon" aria-hidden="true">
      {renderViewportToggleIcon(activeViewportWidth)}
    </span>,
    toggleButton,
  );
}

export default NexusMobileViewportToggleIcon;
