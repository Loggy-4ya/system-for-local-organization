"use client";

/**
 * @fileoverview Viewport zoom picker — replaces Puck's native `<select>` in the canvas toolbar.
 *
 * Puck's zoom select uses an SVG triangle `background-image` that renders as a large gray
 * artifact inside the glass pill (mobile and desktop). This enhancer portals a flat
 * shadcn select synced to the hidden native control.
 *
 * @module src/components/puck/NexusViewportZoomEnhancer
 */

import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { PuckSelectField } from "@/components/puck/fields/PuckSelectField";
import { formatViewportZoomLabel } from "@/components/puck/lib/formatViewportZoomLabel";
import { PUCK_COMPACT_EDITOR_MAX_WIDTH } from "@/components/puck/usePuckMobileEditorChrome";

/** Zoom mount context for the viewport instrument island. */
interface ViewportZoomContext {
  mount: HTMLElement;
  select: HTMLSelectElement;
  contentSide: "top" | "bottom";
}

/**
 * @returns Whether the editor is in Puck's mobile chrome breakpoint.
 */
function isMobileEditorChrome(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia(`(max-width: ${PUCK_COMPACT_EDITOR_MAX_WIDTH}px)`).matches;
}

/** Cached snapshot for `useSyncExternalStore` — must keep referential stability. */
let cachedMount: HTMLElement | null = null;
let cachedSelect: HTMLSelectElement | null = null;
let cachedContentSide: "top" | "bottom" = "bottom";
let cachedSnapshot: ViewportZoomContext | null = null;

/**
 * Locate Puck's zoom mount node (desktop top pill or mobile expanded tray).
 *
 * @returns Zoom container element, or null when unavailable.
 */
function resolveViewportZoomMount(): HTMLElement | null {
  if (typeof document === "undefined") return null;

  if (isMobileEditorChrome()) {
    return document.querySelector(
      '.Puck [class*="ViewportControls--fullScreen"][class*="ViewportControls--isExpanded"] [class*="ViewportControls-zoom_"]',
    ) as HTMLElement | null;
  }

  return document.querySelector(
    '.Puck [class*="ViewportControls"]:not([class*="ViewportControls--fullScreen"]) [class*="ViewportControls-zoom_"]',
  ) as HTMLElement | null;
}

/**
 * Locate Puck's zoom `<select>` and mount node for the viewport toolbar.
 *
 * Returns a cached object reference when mount/select nodes are unchanged so
 * `useSyncExternalStore` does not re-render in a loop.
 *
 * @returns Mount node, native select, and popover side — or null when unavailable.
 */
function getViewportZoomContext(): ViewportZoomContext | null {
  if (typeof document === "undefined") {
    cachedMount = null;
    cachedSelect = null;
    cachedSnapshot = null;
    return null;
  }

  const mount = resolveViewportZoomMount();
  if (!mount) {
    cachedMount = null;
    cachedSelect = null;
    cachedSnapshot = null;
    return null;
  }

  const select = mount.querySelector(
    'select[class*="ViewportControls-zoomSelect_"]',
  ) as HTMLSelectElement | null;
  if (!select) {
    cachedMount = null;
    cachedSelect = null;
    cachedSnapshot = null;
    return null;
  }

  const contentSide = isMobileEditorChrome() ? "top" : "bottom";

  if (mount === cachedMount && select === cachedSelect && contentSide === cachedContentSide) {
    return cachedSnapshot;
  }

  cachedMount = mount;
  cachedSelect = select;
  cachedContentSide = contentSide;
  cachedSnapshot = { mount, select, contentSide };
  return cachedSnapshot;
}

/**
 * Subscribe to DOM/class changes that affect the viewport zoom mount.
 *
 * @param onStoreChange - Invalidation callback for `useSyncExternalStore`.
 * @returns Teardown function.
 */
function subscribeViewportZoomMount(onStoreChange: () => void): () => void {
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

/** Props for {@link NexusViewportZoomSelect}. */
interface NexusViewportZoomSelectProps {
  /** Puck's hidden native zoom `<select>`. */
  select: HTMLSelectElement;
  /** Popover placement relative to the trigger. */
  contentSide: "top" | "bottom";
}

/**
 * Shadcn zoom picker synced to Puck's native zoom select via DOM events.
 *
 * @param props - Native select reference and popover side.
 * @returns Compact zoom percentage control.
 */
function NexusViewportZoomSelect({ select, contentSide }: NexusViewportZoomSelectProps) {
  const [value, setValue] = useState(() => select.value);

  useEffect(() => {
    setValue(select.value);

    const syncFromNative = () => setValue(select.value);
    select.addEventListener("change", syncFromNative);
    select.addEventListener("input", syncFromNative);
    return () => {
      select.removeEventListener("change", syncFromNative);
      select.removeEventListener("input", syncFromNative);
    };
  }, [select]);

  const options = Array.from(select.options).map((option) => ({
    label: option.label || option.text,
    value: option.value,
  }));

  const displayLabel = formatViewportZoomLabel(value, options, true);

  return (
    <PuckSelectField
      value={value}
      options={options}
      displayLabel={displayLabel}
      contentSide={contentSide}
      className="nexus-viewport-zoom-select__content"
      triggerClassName="nexus-viewport-zoom-select__trigger"
      onChange={(next) => {
        select.value = next;
        select.dispatchEvent(new Event("change", { bubbles: true }));
        setValue(next);
      }}
    />
  );
}

/**
 * Portals a flat zoom picker over Puck's viewport instrument island.
 *
 * @returns null — renders via portal when the native mount exists.
 */
export function NexusViewportZoomEnhancer() {
  const context = useSyncExternalStore(
    subscribeViewportZoomMount,
    getViewportZoomContext,
    () => null,
  );

  if (!context) return null;

  return createPortal(
    <div className="nexus-viewport-zoom-enhancer">
      <NexusViewportZoomSelect select={context.select} contentSide={context.contentSide} />
    </div>,
    context.mount,
  );
}

export default NexusViewportZoomEnhancer;
