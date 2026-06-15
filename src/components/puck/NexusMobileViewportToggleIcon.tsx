"use client";

/**
 * @fileoverview Mobile viewport FAB icon — reflects the active canvas preset when collapsed.
 *
 * Puck's fullScreen toggle always renders a monitor icon when collapsed. On phones this
 * enhancer portals the matching preset icon (phone / tablet / desktop / full-width).
 *
 * @module src/components/puck/NexusMobileViewportToggleIcon
 */

import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import {
  Expand,
  Monitor,
  Smartphone,
  Tablet,
  type LucideIcon,
} from "lucide-react";
import { useNexusPuck } from "@/components/puck/lib/useNexusPuck";
import { NEXUS_EDITOR_VIEWPORTS } from "@/components/puck/lib/resolveAutoViewport";
import { PUCK_COMPACT_EDITOR_MAX_WIDTH } from "@/components/puck/usePuckMobileEditorChrome";

/** Cached toggle node for stable `useSyncExternalStore` snapshots. */
let cachedToggleButton: HTMLButtonElement | null = null;

/**
 * @returns Whether the editor is in Puck's mobile chrome breakpoint.
 */
function isMobileEditorChrome(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia(`(max-width: ${PUCK_COMPACT_EDITOR_MAX_WIDTH}px)`).matches;
}

/**
 * Map a Puck viewport width to the Lucide icon used in {@link NEXUS_EDITOR_VIEWPORTS}.
 *
 * @param width - Active viewport width from Puck UI state.
 * @returns Icon component for the preset.
 */
function resolveViewportIconComponent(width: number | "100%"): LucideIcon {
  const preset =
    NEXUS_EDITOR_VIEWPORTS.find((viewport) => viewport.width === width) ??
    NEXUS_EDITOR_VIEWPORTS[0];

  switch (preset.icon) {
    case "Tablet":
      return Tablet;
    case "Monitor":
      return Monitor;
    case "FullWidth":
      return Expand;
    default:
      return Smartphone;
  }
}

/**
 * Locate Puck's collapsed fullScreen viewport toggle button.
 *
 * @returns Toggle button, or null when unavailable or tray is expanded.
 */
function getCollapsedToggleButton(): HTMLButtonElement | null {
  if (typeof document === "undefined" || !isMobileEditorChrome()) {
    cachedToggleButton = null;
    return null;
  }

  const button = document.querySelector(
    '.Puck [class*="ViewportControls--fullScreen"]:not([class*="ViewportControls--isExpanded"]) [class*="ViewportControls-toggleButton_"]',
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

  const media = window.matchMedia(`(max-width: ${PUCK_COMPACT_EDITOR_MAX_WIDTH}px)`);
  media.addEventListener("change", onStoreChange);

  return () => {
    observer.disconnect();
    media.removeEventListener("change", onStoreChange);
  };
}

/**
 * Portals the active viewport preset icon into Puck's collapsed mobile FAB.
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

  const Icon = resolveViewportIconComponent(activeViewportWidth);

  return createPortal(
    <span className="nexus-viewport-toggle-icon" aria-hidden="true">
      <Icon size={16} strokeWidth={2} />
    </span>,
    toggleButton,
  );
}

export default NexusMobileViewportToggleIcon;
